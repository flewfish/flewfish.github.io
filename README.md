# 我的博客

基于 [Hexo](https://hexo.io/) + [amazing 主题](https://github.com/removeif/hexo-theme-amazing)，
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

推送后约 **1 分钟**自动上线，不需要做别的。

### 方式 B：手机上写

1. 手机浏览器打开  
   `https://github.com/flewfish/flewfish.github.io/tree/main/source/_posts`
2. 点 **Add file → Create new file**
3. 文件名填 `我的文章.md`
4. 内容按下面的格式写
5. 点 **Commit changes**

同样会自动构建部署。**手机也能发文章，完全不依赖电脑。**

---

## 二、文章的 Front Matter 格式

每篇文章开头必须有这段（用 `---` 包起来）：

```yaml
---
title: 文章标题
date: 2026-10-16 20:00:00
tags:
  - 随笔
categories:
  - 生活
---
这里开始写正文，用 Markdown 语法……

## 二级标题

- 列表项
- **加粗**、`代码`、[链接](https://example.com)

```python
# 代码块会自动高亮
print("hello")
```
```

---

## 三、本地常用命令

| 命令 | 作用 |
|---|---|
| `npx hexo new "标题"` | 新建一篇文章 |
| `npx hexo server` | 本地预览 → http://localhost:4000 |
| `npx hexo clean` | 清理缓存和 `public/` |
| `npx hexo generate` | 生成静态文件到 `public/` |
| `npm install` | 首次 clone 后安装依赖 |

> ⚠️ **你不需要执行 `hexo deploy`。** 部署完全交给 GitHub Actions，本地没有配置 deployer。

---

## 四、改网站信息

| 想改什么 | 改哪个文件 |
|---|---|
| 站点标题、作者、语言、网址、每页文章数 | `_config.yml` |
| 主题外观、导航菜单、头像、社交链接、背景图、live2d、音乐播放器 | `_config.amazing.yml` |
| 文章内容 | `source/_posts/*.md` |
| 独立页面（关于我等） | `source/` 下新建目录 + `index.md` |

> `_config.amazing.yml` 会**覆盖** `themes/amazing/_config.yml`，所以你只改前者即可，
> 这样将来更新主题不会冲掉你的配置。

---

## 五、⚠️ 依赖已锁定，请不要随意升级

这个项目踩过两个真实的坑，版本都已锁死：

| 包 | 锁定版本 | 为什么 |
|---|---|---|
| `hexo` | `^7.3.0` | Hexo 8 依赖 `strip-ansi@^7`（纯 ESM），需要 Node ≥ 20.19 才能 `require()`；而且 amazing 主题自己声明的就是 `hexo: ^7.1.1`，Hexo 7 才是它的正确搭配 |
| `babel-plugin-inferno` | `6.8.5` | 从 `6.9.0` 起改用 Babel 8（依赖 `@babel/plugin-syntax-jsx@^8`，纯 ESM），在 Node 20 上会抛 `ERR_REQUIRE_ESM`，**导致所有页面渲染成 0 字节空白** |

**如果哪天博客页面突然变全白**，第一件事就是检查这两个版本号有没有被改掉：

```powershell
node -e "const p=require('./package.json'); console.log(p.dependencies.hexo, p.dependencies['babel-plugin-inferno'])"
# 应该输出： ^7.3.0 6.8.5
```

---

## 六、部署

- 推送到 `main` 分支 → 自动部署
- 也可在仓库 **Actions** 页面点 **Run workflow** 手动触发
- 部署配置：`.github/workflows/deploy.yml`
- 构建日志：`https://github.com/flewfish/flewfish.github.io/actions`

---

## 七、在新电脑上恢复

```powershell
git clone git@github.com:flewfish/flewfish.github.io.git
cd flewfish.github.io
npm install
npx hexo server
```

就这些 —— 环境装好（Git + Node.js）后，一条 clone 就完整复原。
