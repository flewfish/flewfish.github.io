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
    # 要发布的本地 md 文件。不填的话脚本会当场问你要
    [Parameter(Position = 0)]
    [string]$MdFile,

    # 文章网址用的英文短名，例如 target2。不填就用原文件名（中文也能跑，只是网址会被编码成一长串）
    [string]$Slug,

    # 标题。不填则依次尝试：原文件 front-matter 的 title -> 原文件名
    [string]$Title,

    # 分类，对应首页那张分类卡片墙。不填会弹出菜单让你选（或新建）
    [string]$Category,

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
    [switch]$DryRun,

    # 禁用一切交互提问（给自动化 / AI 用）。没传的分类会退回「未分类」
    [switch]$NonInteractive
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

if (-not $BlogRoot) { $BlogRoot = Split-Path $PSScriptRoot -Parent }
$BlogRoot = (Resolve-Path -LiteralPath $BlogRoot).Path

# ---------------------------------------------------------------- 小工具
function Write-Step($msg) { Write-Host "  $msg" }

# 读一行输入（用 [Console]::ReadLine，这样在普通窗口和管道里都能用）
function Read-Line([string]$prompt, [string]$default = '') {
    if ($default) { Write-Host "$prompt [$default]: " -NoNewline }
    else          { Write-Host "${prompt}: " -NoNewline }
    $line = [Console]::ReadLine()
    if ($null -eq $line) { $line = '' }
    $line = $line.Trim()
    if (-not $line) { return $default }
    return $line
}

# 把已有文章里用过的分类 / 标签读出来（field 传 'categories' 或 'tags'）
function Get-ExistingMeta([string]$field) {
    $vals = New-Object System.Collections.ArrayList
    $dir = Join-Path $BlogRoot 'source\_posts'
    if (-not (Test-Path -LiteralPath $dir)) { return @() }
    foreach ($p in (Get-ChildItem -LiteralPath $dir -Filter *.md -ErrorAction SilentlyContinue)) {
        $t = [System.IO.File]::ReadAllText($p.FullName, [System.Text.Encoding]::UTF8)
        if ($t -notmatch '(?s)^---\s*\r?\n(.*?)\r?\n---') { continue }
        $fm = $Matches[1]
        $esc = [regex]::Escape($field)
        # 列表写法： categories: 换行后  - xxx
        # ⚠️ 这里绝对不能用 (?s) 配 .+ —— 开了单行模式后 . 会跨行匹配，
        #    把同级的 cover: / description: 一起吞进来当成分类名（踩过这个坑）。
        #    必须用 [^\r\n]* 把每行限定在同一行内。
        $block = [regex]::Match($fm, "(?m)^$esc`:[ \t]*\r?\n((?:[ \t]*-[ \t]*[^\r\n]*(?:\r?\n|$))+)")
        if ($block.Success) {
            foreach ($line in ($block.Groups[1].Value -split '\r?\n')) {
                $v = ($line -replace '^\s*-\s*', '').Trim().Trim('"', "'")
                if ($v -and -not $vals.Contains($v)) { [void]$vals.Add($v) }
            }
        }
        # 行内数组写法： categories: [a, b]
        $inline = [regex]::Match($fm, "(?m)^$esc`:[ \t]*\[(.*?)\]")
        if ($inline.Success) {
            foreach ($v in ($inline.Groups[1].Value -split ',')) {
                $v = $v.Trim().Trim('"', "'")
                if ($v -and -not $vals.Contains($v)) { [void]$vals.Add($v) }
            }
        }
        # 单行标量写法： categories: 红队靶机
        $scalar = [regex]::Match($fm, "(?m)^$esc`:[ \t]*([^\r\n\[\]]+?)[ \t]*$")
        if ($scalar.Success) {
            $v = $scalar.Groups[1].Value.Trim().Trim('"', "'")
            if ($v -and -not $vals.Contains($v)) { [void]$vals.Add($v) }
        }
    }
    return @($vals)
}

# 分类选择：列出现有的，可以选编号，也可以直接输入新分类名
function Select-Category {
    $existing = Get-ExistingMeta 'categories'
    Write-Host ""
    Write-Host "选择分类（首页的分类卡片墙就是按这个分组的）：" -ForegroundColor Cyan
    for ($i = 0; $i -lt $existing.Count; $i++) {
        Write-Host ("  [{0}] {1}" -f ($i + 1), $existing[$i])
    }
    Write-Host ("  [{0}] 新建一个分类" -f ($existing.Count + 1))
    $default = if ($existing.Count -gt 0) { '1' } else { "$($existing.Count + 1)" }
    $pick = Read-Line "输入编号，或直接打字输入一个新分类名" $default

    if ($pick -match '^\d+$') {
        $n = [int]$pick
        if ($n -ge 1 -and $n -le $existing.Count) { return $existing[$n - 1] }
        if ($n -eq $existing.Count + 1) {
            $name = Read-Line "新分类叫什么" ''
            if ($name) { return $name }
            return '未分类'
        }
    }
    if ($pick) { return $pick }
    if ($existing.Count -gt 0) { return $existing[0] }
    return '未分类'
}

# 标签选择：可以选多个（用逗号隔开），也可以直接输入新标签
function Select-Tags {
    $existing = Get-ExistingMeta 'tags'
    if ($existing.Count -eq 0) {
        $raw = Read-Line "标签（多个用逗号隔开，可留空）" ''
        return @(($raw -split ',') | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    }
    Write-Host ""
    Write-Host "选择标签（可多选，输入编号逗号隔开，例如 1,3；直接打字则是新标签）：" -ForegroundColor Cyan
    for ($i = 0; $i -lt $existing.Count; $i++) {
        Write-Host ("  [{0}] {1}" -f ($i + 1), $existing[$i])
    }
    $raw = Read-Line "你的选择（可留空）" ''
    if (-not $raw) { return @() }

    $out = New-Object System.Collections.ArrayList
    foreach ($part in ($raw -split ',')) {
        $p = $part.Trim()
        if (-not $p) { continue }
        if ($p -match '^\d+$') {
            $n = [int]$p
            if ($n -ge 1 -and $n -le $existing.Count) {
                if (-not $out.Contains($existing[$n - 1])) { [void]$out.Add($existing[$n - 1]) }
            }
        } elseif (-not $out.Contains($p)) {
            [void]$out.Add($p)
        }
    }
    return @($out)
}

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
if (-not $MdFile) {
    Write-Host ""
    $MdFile = Read-Line "把 md 文件拖到这个窗口里（或粘贴完整路径）" ''
    if (-not $MdFile) { throw "没有提供 md 文件。" }
    $MdFile = $MdFile.Trim('"', "'")      # 拖文件进来时路径常带引号
}
if (-not (Test-Path -LiteralPath $MdFile)) { throw "找不到文件：$MdFile" }
$mdFull = (Resolve-Path -LiteralPath $MdFile).Path
$mdDir  = Split-Path $mdFull -Parent
if (-not $Slug) { $Slug = [System.IO.Path]::GetFileNameWithoutExtension($mdFull) }
if ($Slug -match '[^\x00-\x7F]') {
    Write-Host ""
    Write-Host "  提示：短名里有中文，生成的网址会变成一长串 %E4%B8%AD... 这种编码。" -ForegroundColor Yellow
    Write-Host "        想好看的话下次加 -Slug 指定一个英文短名，例如 -Slug target3" -ForegroundColor Yellow
}

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

# ---- 交互式补全：命令行没给的，当场问 ----
$prompted = $false

if (-not $Category) {
    if ($NonInteractive) { $Category = '未分类' }
    else { $Category = Select-Category; $prompted = $true }
}

if (-not $PSBoundParameters.ContainsKey('Tags')) {
    if ($NonInteractive) { $Tags = @() }
    else { $Tags = Select-Tags; $prompted = $true }
}

# 只要问过，就在真正动文件前再确认一次
if ($prompted -and -not $DryRun) {
    Write-Host ""
    Write-Host "--- 确认一下 ---" -ForegroundColor Cyan
    Write-Host "  标题: $Title"
    Write-Host "  分类: $Category"
    Write-Host "  标签: $(if ($Tags.Count -gt 0) { $Tags -join ', ' } else { '（无）' })"
    Write-Host "  日期: $Date"
    $ok = Read-Line "没问题就回车继续（输入 n 取消）" ''
    if ($ok -match '^[nN]') { Write-Host "已取消，没有写任何文件。"; exit }
}

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
