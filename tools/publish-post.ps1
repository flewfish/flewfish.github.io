<#
.SYNOPSIS
  把本地写好的 Markdown 笔记发到博客上（自动处理图片）。

.DESCRIPTION
  你在别处（Typora / Obsidian / 思源 / 随便什么）写的 md，图片一般用的是
  本地相对路径，直接丢进博客会全部 404。这个脚本帮你一次搞定：

    1. 把正文里所有图片的路径解析出来（支持相对路径、绝对路径、URL 编码过的路径、
       Markdown 的 ![]() 和 HTML 的 <img src=""> 两种写法）
    2. 逐张压缩成 JPEG，复制到 博客/source/img/<slug>/ 下并重新编号
    3. 把正文里的图片路径改写成 /img/<slug>/NN.jpg 这种博客能认的绝对路径
    4. 补上 front-matter（标题/日期/分类/标签/摘要）
    5. 生成到 博客/source/_posts/<slug>.md

  剩下的就只是 git add / commit / push 了。

.EXAMPLE
  # 先试运行，只看它打算干什么，不写任何文件
  .\tools\publish-post.ps1 -MdFile "C:\NOTE\靶机二（内核提权）.md" -Slug target2 -Category 红队靶机 -Tags 靶机渗透,提权 -DryRun

.EXAMPLE
  # 确认没问题了，去掉 -DryRun 正式生成
  .\tools\publish-post.ps1 -MdFile "C:\NOTE\靶机二（内核提权）.md" -Slug target2 -Category 红队靶机 -Tags 靶机渗透,提权
#>

[CmdletBinding()]
param(
    # 要发布的本地 md 文件（必填）
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$MdFile,

    # 文章网址用的英文短名，例如 target2。不填就用原文件名（中文也能跑，只是网址会被编码成一长串）
    [string]$Slug,

    # 标题。不填则依次尝试：原文件 front-matter 的 title -> 原文件名
    [string]$Title,

    # 分类，对应首页那张分类卡片墙
    [string]$Category = '未分类',

    # 标签，多个用逗号隔开：-Tags 靶机渗透,提权
    [string[]]$Tags = @(),

    # 发布日期，格式 '2024-12-11 13:01:06'。不填则用原文件的修改时间
    [string]$Date,

    # 首页卡片上显示的一句话摘要
    [string]$Description,

    # 博客根目录，默认取这个脚本所在目录的上一级
    [string]$BlogRoot,

    # 图片压缩后的最长边（像素）和画质（1-100）
    [int]$MaxWidth = 1600,
    [int]$Quality  = 82,

    # 只报告不写文件
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

if (-not $BlogRoot) { $BlogRoot = Split-Path $PSScriptRoot -Parent }
$BlogRoot = (Resolve-Path -LiteralPath $BlogRoot).Path

# ---------------------------------------------------------------- 小工具
function Write-Step($msg) { Write-Host "  $msg" }

# PNG 转 JPEG：先铺白底，否则透明区域会变成黑块
function Compress-ToJpeg([string]$in, [string]$out, [int]$maxW, [int]$q) {
    $img = [System.Drawing.Image]::FromFile($in)
    try {
        $w = [Math]::Min($maxW, $img.Width)
        $h = [int][Math]::Round($img.Height * $w / $img.Width)
        $bmp = New-Object System.Drawing.Bitmap($w, $h)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        try {
            $g.Clear([System.Drawing.Color]::White)
            $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $g.DrawImage($img, 0, 0, $w, $h)
            $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
                     Where-Object { $_.MimeType -eq 'image/jpeg' }
            $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
            $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
                [System.Drawing.Imaging.Encoder]::Quality, [long]$q)
            $bmp.Save($out, $codec, $ep)
        } finally { $g.Dispose(); $bmp.Dispose() }
    } finally { $img.Dispose() }
}

# 把 md 里写的图片地址，解析成磁盘上的真实路径
function Resolve-ImagePath([string]$raw, [string]$mdDir) {
    $p = $raw.Trim()
    if ($p.StartsWith('<') -and $p.EndsWith('>')) { $p = $p.Substring(1, $p.Length - 2) }
    $p = [System.Uri]::UnescapeDataString($p)      # 处理 %5B %20 这类编码
    if ($p -match '^(https?:|data:|//)') { return $null }   # 网络图不动
    $p = $p -replace '/', '\'
    if ([System.IO.Path]::IsPathRooted($p)) { return $p }
    return [System.IO.Path]::GetFullPath((Join-Path $mdDir $p))
}

# ---------------------------------------------------------------- 开始
if (-not (Test-Path -LiteralPath $MdFile)) { throw "找不到文件：$MdFile" }
$mdFull = (Resolve-Path -LiteralPath $MdFile).Path
$mdDir  = Split-Path $mdFull -Parent
if (-not $Slug) { $Slug = [System.IO.Path]::GetFileNameWithoutExtension($mdFull) }

Write-Host ""
Write-Host "=== 发布到博客 ===" -ForegroundColor Cyan
Write-Step "源文件 : $mdFull"
Write-Step "博客   : $BlogRoot"
Write-Step "短名   : $Slug"
Write-Host ""

# 1. 读文件（按 UTF-8 读，顺便看一眼有没有 BOM）
$bytes = [System.IO.File]::ReadAllBytes($mdFull)
$hasBom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
$text = [System.Text.Encoding]::UTF8.GetString($bytes)
if ($hasBom) { $text = $text.Substring(1) }        # 去掉 BOM 字符
if ($text -match [char]0xFFFD) {
    Write-Host "  !! 警告：这个文件不是合法的 UTF-8（中文可能已经是乱码）。" -ForegroundColor Yellow
    Write-Host "     请用编辑器另存为 UTF-8 再重跑。" -ForegroundColor Yellow
}

# 2. 剥掉原有的 front-matter（如果有），并当成缺省值
$fmTitle = $null; $fmDate = $null
if ($text -match '(?s)^---\s*\r?\n(.*?)\r?\n---\s*\r?\n') {
    $fm = $Matches[1]
    $text = $text.Substring($Matches[0].Length)
    if ($fm -match '(?m)^title:\s*(.+?)\s*$') { $fmTitle = $Matches[1].Trim('''', '"') }
    if ($fm -match '(?m)^date:\s*(.+?)\s*$')  { $fmDate  = $Matches[1].Trim('''', '"') }
    Write-Step "（原文带 front-matter，已剥掉并改写）"
}

if (-not $Title) { $Title = if ($fmTitle) { $fmTitle } else { [System.IO.Path]::GetFileNameWithoutExtension($mdFull) } }
if (-not $Date)  { $Date  = if ($fmDate)  { $fmDate }  else { (Get-Item -LiteralPath $mdFull).LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss') } }

# 3. 找出所有图片引用，按出现顺序去重
$body = $text
$seen = New-Object System.Collections.ArrayList
$collect = [System.Text.RegularExpressions.MatchEvaluator]{
    param($m)
    $raw = if ($m.Groups[2].Success) { $m.Groups[2].Value } else { $m.Groups[4].Value }
    $abs = Resolve-ImagePath $raw $mdDir
    if ($abs -and -not $seen.Contains($abs)) { [void]$seen.Add($abs) }
    return $m.Value
}
$pattern = '!\[([^\]]*)\]\(((?:<[^>]+>|[^)\s])+)\)|<img([^>]*?)src="([^"]+)"([^>]*?)>'
$null = [regex]::Replace($body, $pattern, $collect)

Write-Host ""
Write-Step "正文里找到 $($seen.Count) 张图片"
$missing = @($seen | Where-Object { -not (Test-Path -LiteralPath $_) })
foreach ($m in $missing) { Write-Host "    缺失：$m" -ForegroundColor Red }
if ($missing.Count -gt 0) {
    throw "有 $($missing.Count) 张图片在磁盘上找不到，先确认路径，不要硬发（发出去就是 404）。"
}
if ($seen.Count -eq 0) { Write-Step "（这篇没有本地图片，跳过图片处理）" }

# 4. 压缩 + 编号
$imgOutDir = Join-Path $BlogRoot "source\img\$Slug"
$map = @{}
$n = 0
$sizeBefore = 0; $sizeAfter = 0
foreach ($abs in $seen) {
    $n++
    $seq = '{0:d2}' -f $n
    $dest = Join-Path $imgOutDir "$seq.jpg"
    $map[$abs] = "/img/$Slug/$seq.jpg"
    $sizeBefore += (Get-Item -LiteralPath $abs).Length
    if (-not $DryRun) {
        if (-not (Test-Path -LiteralPath $imgOutDir)) { New-Item -ItemType Directory -Path $imgOutDir | Out-Null }
        Compress-ToJpeg $abs $dest $MaxWidth $Quality
        $sizeAfter += (Get-Item -LiteralPath $dest).Length
    }
    $after = if ($DryRun) { '-' } else { "$([math]::Round((Get-Item -LiteralPath $dest).Length/1KB,1)) KB" }
    Write-Step "$seq  $([System.IO.Path]::GetFileName($abs))  ->  /img/$Slug/$seq.jpg   $after"
}

# 5. 改写正文里的图片路径
$rewrite = [System.Text.RegularExpressions.MatchEvaluator]{
    param($m)
    if ($m.Groups[2].Success) {
        $abs = Resolve-ImagePath $m.Groups[2].Value $mdDir
        if ($abs -and $map.ContainsKey($abs)) { return '![' + $m.Groups[1].Value + '](' + $map[$abs] + ')' }
        return $m.Value
    } else {
        $abs = Resolve-ImagePath $m.Groups[4].Value $mdDir
        if ($abs -and $map.ContainsKey($abs)) { return $m.Value -replace [regex]::Escape($m.Groups[4].Value), $map[$abs] }
        return $m.Value
    }
}
$body = [regex]::Replace($body, $pattern, $rewrite)

# 6. 拼 front-matter
$lines = New-Object System.Collections.ArrayList
[void]$lines.Add('---')
[void]$lines.Add("title: $Title")
[void]$lines.Add("date: $Date")
if ($Tags.Count -gt 0) {
    [void]$lines.Add('tags:')
    foreach ($t in $Tags) { if ("$t".Trim()) { [void]$lines.Add("  - $("$t".Trim())") } }
}
if ($Category) { [void]$lines.Add("categories:"); [void]$lines.Add("  - $Category") }
if ($Description) { [void]$lines.Add("description: $Description") }
[void]$lines.Add('---')
[void]$lines.Add('')
$final = ($lines -join "`r`n") + "`r`n" + $body.TrimStart()

$postPath = Join-Path $BlogRoot "source\_posts\$Slug.md"

Write-Host ""
Write-Step "图片体积：$([math]::Round($sizeBefore/1KB,1)) KB -> $(if($DryRun){'（试运行未压缩）'}else{"$([math]::Round($sizeAfter/1KB,1)) KB"})"

if ($DryRun) {
    Write-Host ""
    Write-Host "=== 试运行结束，没有写任何文件 ===" -ForegroundColor Yellow
    Write-Host "确认无误后去掉 -DryRun 再跑一次。"
    Write-Host ""
    Write-Host "--- front-matter 预览 ---"
    Write-Host (($lines -join "`n"))
} else {
    [System.IO.File]::WriteAllText($postPath, $final, (New-Object System.Text.UTF8Encoding $false))
    Write-Host ""
    Write-Host "生成完毕：" -ForegroundColor Green
    Write-Step "文章  $postPath"
    Write-Step "图片  $imgOutDir"
    Write-Host ""
    Write-Host "接下来（照着敲）：" -ForegroundColor Cyan
    Write-Host "  cd `"$BlogRoot`""
    Write-Host "  npx hexo server        # 本地看一眼，图片有没有 404 一眼就知道"
    Write-Host "  git add -A"
    Write-Host "  git commit -m `"新增文章：$Title`""
    Write-Host "  git push"
}
