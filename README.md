# 我的博客

基于 [Hexo](https://hexo.io/) + [Butterfly 主题](https://github.com/jerryc127/hexo-theme-butterfly)，
由 **GitHub Actions 自动构建并部署**到 GitHub Pages。

线上地址：https://flewfish.github.io/

---

## 它是怎么工作的

```
你写 Markdown  →  git push 到 main  →  GitHub Actions 自动 npm ci + hexo g  →  发布到 GitHub Pages
```

**你的电脑只是「写作工具」，不是服务器。** 电脑关机、损坏、换新机，都不影响别人访问博客。
所有源码（Markdown 原文 + 配置 + 主题）都存在 GitHub 上，换任何设备 clone 下来就能接着写。

---

## 一、日常：发一篇新文章

### 方式 A：本地写（推荐）

```powershell
cd D:\个人博客

# 1. 新建文章
npx hexo new "文章标题"

# 2. 编辑 source/_posts/文章标题.md
#    （Markdown 语法 + 开头的 Front Matter）

# 3. 本地预览（可选，Ctrl+C 停止）
npx hexo server      # 浏览器打开 http://localhost:4000

# 4. 发布
git add -A
git commit -m "新增文章：文章标题"
git push
```

推送后约 **1 分钟**自动上线。

### 方式 B：手机上写

1. 手机浏览器打开  
   `https://github.com/flewfish/flewfish.github.io/tree/main/source/_posts`
2. 点 **Add file → Create new file**
3. 文件名填 `我的文章.md`
4. 内容按下面的格式写
5. 点 **Commit changes**

**手机也能发文章，完全不依赖电脑。**

---

## 一·二、别人想给你投稿 / 从别处搬 md 进来

### 让别人投稿的三条路

| 路线 | 怎么做 | 适合 |
|---|---|---|
| **别人发给你，你发** | 对方把 md（连同图片打包）发你，你本地跑一遍再 push | 最简单，你完全控制内容 |
| **加协作者** | 仓库 → Settings → Collaborators → Add people。对方接受邀请后就能直接 push | 信得过的人 |
| **Fork + Pull Request** | 对方 Fork 你的仓库 → 改 → 提 PR → 你在 GitHub 上点 Merge | **推荐**，对方不需要权限，你还能先审一遍 |

Fork + PR 那条路，对方**不需要装 Git、不需要装 Node**，全程在 GitHub 网页上就能干完。

### 从别处搬 md：图片是最大的坑

你在 Typora / Obsidian / 思源里写的 md，图片路径通常是这种：

```markdown
![截图](../../%5Bimage%5D/image-20241210114007774.png)
```

**这种路径直接丢进博客，图片全 404** —— 因为博客上根本没有 `../../[image]/` 这个目录。
必须把图片搬到仓库里，再把路径改成博客能认的绝对路径。

手动做一遍要：找到图片 → 压缩 → 复制进 `source/img/` → 逐条改写路径。
**别手动做，用现成的脚本：**

```powershell
# 先试运行：只报告它打算干什么，不写任何文件
.\tools\publish-post.ps1 -MdFile "C:\NOTE\某篇笔记.md" -Slug my-post -Category 实战记录 -Tags 渗透,提权 -DryRun

# 确认没问题，去掉 -DryRun 正式生成
.\tools\publish-post.ps1 -MdFile "C:\NOTE\某篇笔记.md" -Slug my-post -Category 实战记录 -Tags 渗透,提权
```

它会自动：

1. 把正文里所有图片路径解析成磁盘上的真实文件
   （相对路径、绝对路径、URL 编码过的、Markdown 的 `![]()` 和 HTML 的 `<img src="">` 都认）
2. 逐张压缩成 JPEG（PNG 转 JPEG 会先铺白底，否则透明区域会变黑块）
3. 复制到 `source/img/<slug>/01.jpg`、`02.jpg`… 并重新编号
4. 把正文里的路径改写成 `/img/<slug>/NN.jpg`
5. 补上 front-matter，生成到 `source/_posts/<slug>.md`

**有任何一张图片在磁盘上找不到，它会直接报错停下，绝不硬发** —— 避免发出去一堆坏图。

参数速查：

| 参数 | 说明 |
|---|---|
| `-MdFile` | 要发布的本地 md。不填会当场问你（支持把文件拖进窗口） |
| `-Slug` | 网址用的英文短名，如 `target2`。不填就用原文件名（中文也行，只是网址会被编码） |
| `-Title` | 标题。不填则用原文件 front-matter 的 title，再退回文件名 |
| `-Category` | 分类。**不填会弹出菜单**，列出现有分类让你选，也可以当场新建 |
| `-Tags` | 标签。**不填会弹出菜单**，可以多选（输入 `1,3`），也可以直接输入新标签 |
| `-Date` | 发布日期。**不填会用文件的「修改时间」**，建议明确指定 |
| `-Description` | 首页卡片上的一句话摘要 |
| `-DryRun` | 只报告，不写文件 |
| `-NonInteractive` | 禁用提问（给脚本/自动调用用）。没传的分类退回「未分类」 |

**最省事的用法**——什么参数都不给，一路跟着提示走：

```powershell
.\tools\publish-post.ps1
```

它会依次问你：要发哪个 md → 标题 → **选哪个分类** → 选哪些标签 → 确认。

> ⚠️ 如果源文件不是 UTF-8（比如记事本存的 ANSI），脚本会警告你。
> 照着提示用编辑器另存为 UTF-8 再跑一次，否则中文会变成乱码。

---

## 二、文章的 Front Matter 格式

```yaml
---
title: 文章标题
date: 2026-10-16 20:00:00
tags:
  - 随笔
categories:
  - 生活
cover: /img/封面.jpg          # 可选：文章封面
description: 一句话摘要        # 可选：首页显示的摘要
swiper_index: 1              # 可选：数字越大越靠前，出现在首页轮播图
---
这里开始写正文，用 Markdown 语法……

## 二级标题

- 列表项
- **加粗**、`代码`、[链接](https://example.com)
```

> **首页轮播图**由 `hexo-butterfly-swiper` 插件驱动。
> 只有 Front Matter 里写了 `swiper_index` 的文章才会进轮播，并且需要配 `cover` 封面图。

---

## 三、本地常用命令

| 命令 | 作用 |
|---|---|
| `npx hexo new "标题"` | 新建一篇文章 |
| `npx hexo new page "名字"` | 新建一个独立页面 |
| `npx hexo server` | 本地预览 → http://localhost:4000 |
| `npx hexo clean` | 清理缓存和 `public/` |
| `npx hexo generate` | 生成静态文件到 `public/` |
| `npm install` | 首次 clone 后安装依赖 |

> ⚠️ **你不需要执行 `hexo deploy`。** 部署完全交给 GitHub Actions。

---

## 四、改网站信息

| 想改什么 | 改哪个文件 |
|---|---|
| 站点标题、副标题、作者、语言、网址、文章数 | `_config.yml` |
| 导航菜单、头像、横幅图、社交链接、暗色模式、搜索、页脚 | `_config.butterfly.yml` |
| 文章内容 | `source/_posts/*.md` |
| 关于页 | `source/about/index.md` |
| 留言板 | `source/comments/index.md` |
| 首页轮播开关与样式 | `_config.butterfly.yml` 末尾的 `swiper:` 段 |

> `_config.butterfly.yml` 会**覆盖** `themes/butterfly/_config.yml`，所以你只改前者即可，
> 这样将来更新主题不会冲掉你的配置。

### 换头像 / 横幅图

1. 把图片放进 `source/img/`（没有就新建这个目录）
2. 在 `_config.butterfly.yml` 里引用，例如：
   ```yaml
   avatar:
     img: /img/avatar.png
   index_img: /img/banner.jpg
   ```

---

## 五、⚠️ 已经填好的坑，请不要随意改动

| 项 | 设定 | 为什么 |
|---|---|---|
| `hexo` | `^7.3.0` | Hexo 8 依赖 `strip-ansi@^7`（纯 ESM），需要 Node ≥ 20.19 才能 `require()`。本机 Node 是 **20.12.2**，升到 Hexo 8 会直接崩 |
| 第三方 CDN | `fastly.jsdelivr.net` | 国内 **`cdn.jsdelivr.net` 已被墙**（实测连接超时）。`fastly` 是同一份内容的官方备用节点，同样支持自动压缩。**不要改回 jsdelivr**，否则图标和特效会全挂 |
| 本地搜索 | `hexo-generator-searchdb` | Butterfly 的 `local_search` 依赖它生成 `search.xml` 索引；缺了会直接构建报错 `Cannot read properties of undefined (reading 'path')` |

改完主题或依赖后，**先本地跑一次** `npx hexo generate` 确认没报错再推送。

---

## 六、部署

- 推送到 `main` 分支 → 自动部署
- 也可在仓库 **Actions** 页面点 **Run workflow** 手动触发
- 部署配置：`.github/workflows/deploy.yml`
- 构建日志：https://github.com/flewfish/flewfish.github.io/actions

---

## 七、主题魔改（紫罗兰玻璃拟态）

主题在 Butterfly 基础上做了一层视觉改造，风格叫「紫罗兰玻璃拟态」：
粉紫渐变卡片 + 毛玻璃模糊 + 大圆角 + 柔光阴影。

**所有魔改只落在三个自己写的文件里，没有动 `themes/butterfly` 下任何源码**，
所以将来升级主题不会把改动冲掉：

| 文件 | 作用 |
|---|---|
| `source/css/modify.css` | 全部样式覆盖（配色、导航栏、卡片、文章页、页脚、搜索…） |
| `source/js/cursor.js` | 紫水晶月光光标 |
| `scripts/category-wall.js` | 首页分类卡片墙（见下） |

这两个文件通过 `_config.butterfly.yml` 的 `inject` 段挂上去：

```yaml
inject:
  head:
    - '<link rel="stylesheet" href="/css/modify.css">'
  bottom:
    - '<script src="/js/cursor.js"></script>'
```

### 想换配色？只改一处

`_config.butterfly.yml` 里的 `theme_color:` 段控制主色，改 `main` 就能整体换色。
`source/css/modify.css` 顶部的「设计令牌」区（`--ff-*` 变量）控制卡片渐变和圆角。

### 已配置的增强功能

| 功能 | 实现 | 位置 |
|---|---|---|
| **评论系统** | [giscus](https://giscus.app/zh-CN)，评论存在本仓库的 Discussions 里（分类 `General`），访客用 GitHub 账号登录 | `_config.butterfly.yml` 的 `giscus:` 段 |
| **live2d 看板娘** | `live2d-widgets@1`（MIT） | `_config.butterfly.yml` 的 `inject.bottom` |
| **樱花飘落** | `sakura-js 1.1.1`（MIT），**已自托管** | `source/js/sakura.min.js` |
| **紫水晶月光光标** | 自实现 canvas：双层光环 + 月牙 + 水晶拖尾 + 点击爆发，触屏 / 减少动效下自动禁用，**保留系统光标** | `source/js/cursor.js` |
| **字数统计 / 阅读时长** | `hexo-wordcount` | `_config.butterfly.yml` 的 `wordcount:` 段 |
| **相关文章 / 分享 / 复制带版权** | Butterfly 内置 | `_config.butterfly.yml` |
| **自定义 404 页** | Butterfly 内置 | `_config.butterfly.yml` 的 `error_404:` 段 |

> 樱花与光标是**自托管**的，不依赖第三方 CDN。
> live2d 因模型文件过大无法自托管，走 `fastly.jsdelivr.net`。

### 首页分类卡片墙

`scripts/category-wall.js` 是**自己写的 Hexo 插件**，作用是在首页文章列表下面
铺一排带封面的分类卡片。

**为什么不直接用 `hexo-butterfly-categories-card` 那个现成插件：**
它的教程要求你去 `node_modules` 里改插件自己的源码。但 GitHub Actions 每次构建
都会跑 `npm ci` 重新装依赖 —— **本地改的 node_modules 在线上根本不存在**。
所以这里只用公开的 Hexo 扩展点重新实现了一遍，不碰任何第三方源码。

配置在 `_config.butterfly.yml` 的 `categoryWall:` 段：

```yaml
categoryWall:
  enable: true
  default_cover: /img/cover-default.jpg   # 没单独配封面的分类用这张
  cover:
    折腾记录: /img/banner.jpg              # 给个别分类单独指定封面
```

顺带一提：分类少 + 文章少的时候，卡片会自动变高。因为那时候左侧列表很短，
矮卡片配一大片空白更难看；等文章多起来会自动回到常规高度。

### 关于首页轮播图（当前是关掉的）

`hexo-butterfly-swiper` 在 `_config.butterfly.yml` 末尾，**目前 `enable: false`**。

关掉的原因：轮播只收录 front-matter 里写了 `swiper_index` 的文章，
一篇都没有时它照样会往首页注入一个**空的轮播外壳**，看着就是一块空白。

等你发了几篇带封面的文章，给想在轮播里出现的文章加上：

```yaml
cover: /img/banner.jpg
swiper_index: 1        # 数字越大越靠前
```

然后把 `swiper.enable` 改回 `true` 就行。

## 八、还没做的（想要的话再说）

- [ ] **自定义域名**（可选，约 50–80 元/年，**不是服务器**）
- [ ] **关于页的个人信息**：`source/about/index.md` 里目前是通用文案，换成你自己的经历

---

## 九、在新电脑上恢复

```powershell
git clone git@github.com:flewfish/flewfish.github.io.git
cd flewfish.github.io
npm install
npx hexo server
```

就这些 —— 环境装好（Git + Node.js）后，一条 clone 就完整复原。
