---
title: 欢迎来到「林深时见鹿」
date: 2026-10-16 10:00:00
updated: 2026-10-16 10:00:00
tags:
  - Hexo
  - 建站
  - Butterfly
categories:
  - 折腾记录
cover: /img/banner.jpg
description: 博客搭好了，这里就是我的技术自留地。这篇简单说说本站是怎么跑起来的、主题改了什么，以及以后怎么写一篇新文章。
---

折腾了一阵，博客总算上线了。

从今往后，踩过的坑、复现过的漏洞、想明白了的原理，都会记在这里。
写下来才算真正学会，也方便日后的自己回来看。

> 莫听穿林打叶声，何妨吟啸且徐行。

## 本站是怎么跑起来的

整套流程没有花一分钱服务器钱：

```
本地写 Markdown  →  git push  →  GitHub Actions 自动构建  →  GitHub Pages
```

也就是说，**我的电脑关不关机、坏不坏，都不影响别人访问这个博客**。
换台新电脑也只需要 `git clone` 一下就能接着写。

## 主题改了什么

用的是 [Butterfly](https://butterfly.js.org/)，然后在它的基础上做了一层「紫罗兰玻璃拟态」的改造：

| 模块 | 改动 |
|---|---|
| 配色 | 全站换成紫罗兰色系，卡片用粉紫渐变 + 毛玻璃 |
| 导航栏 | 滚动吸顶，半透明玻璃质感 |
| 侧边栏 | 卡片圆角、悬停上浮、作者卡渐变按钮 |
| 文章页 | 标题渐变下划线、紫色代码工具条、圆角表格 |
| 特效 | 樱花飘落、live2d 看板娘、紫水晶月光光标 |
| 评论 | [giscus](https://giscus.app/zh-CN)，用 GitHub 账号登录 |
| 搜索 | 本地搜索，点右上角放大镜即可 |

所有自定义都收在 `source/css/modify.css` 和 `source/js/cursor.js` 两个文件里，
**没有动主题源码**，所以将来升级主题不会把改动冲掉。

## 以后怎么写文章

一行命令建文件：

```bash
npx hexo new "文章标题"
```

然后编辑 `source/_posts/文章标题.md`，开头这段叫 front-matter：

```yaml
---
title: 文章标题
date: 2026-10-16 20:00:00
tags:
  - 渗透测试
categories:
  - 实战记录
cover: /img/banner.jpg     # 可选，首页卡片的封面
description: 一句话摘要      # 可选，首页卡片显示这句
---
```

写完本地预览一下：

```bash
npx hexo server   # 打开 http://localhost:4000
```

确认没问题就推上去，大约一分钟自动上线：

```bash
git add -A
git commit -m "新增文章：文章标题"
git push
```

## 最后

`hello-world.md` 这个文件可以删掉，也可以留着当模板。
想改本页内容，直接编辑 `source/_posts/hello-world.md` 就行。

要改站点信息（站名、签名、社交链接、首页背景图这些），看仓库根目录的 `README.md`，
里面写得很细。

就这样，开工吧 🦌
