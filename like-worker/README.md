# 文章点赞后端（Cloudflare Worker + D1）

给博客每篇文章加点赞按钮，规则是：**同一个 IP 对同一篇文章，每天（Asia/Shanghai）最多点赞一次**。

- 前端：仓库根目录 `source/js/article-like.js`（通过 `_config.butterfly.yml` 的 `inject.bottom` 挂载）
- 后端：本目录，Cloudflare Worker + D1
- 存储：只存 `文章路径 + IP 的 SHA-256 哈希 + 日期`，**不存明文 IP**
- 去重：D1 唯一索引 `(path, ip_hash, day)`，并发请求也不会重复计数

## 当前部署信息

本站已经完成部署（2026-10-20）：

| 项目 | 值 |
|---|---|
| Worker 地址 | `https://blog-like.2469392809.workers.dev` |
| D1 数据库 | `blog-like`（id `f7a46a2d-cf9a-4ff2-a342-bb3f15871e4c`，APAC） |
| 前端接入 | `_config.butterfly.yml` 的 `data-api` 已指向上面的地址 |
| IP 盐值 | 已通过 `wrangler secret put IP_SALT` 设置（只存在 Cloudflare，不在仓库里） |

日常改完后端代码，只需要在 `like-worker/` 下重新执行一次 `deploy` 即可（见下文）。

## 环境说明（重要）

本机 Node 是 **20.12.2**，而最新版 wrangler 要求 **Node 22+**；
旧版 wrangler 的 OAuth 登录会被 Cloudflare 拒绝（`request_forbidden`）。

所以本目录的命令统一用 `npx` 临时拉取 Node 22 + 最新 wrangler，**不改动系统里的 Node**：

```bash
npx --yes -p node@22 -p wrangler@4.151.2 -c "wrangler <子命令>"
```

> 如果以后把系统 Node 升级到 22+，可以直接把上面的整段换成 `npx wrangler@latest`。

以下命令都在**本目录**（`like-worker/`）下执行：

```bash
cd like-worker
```

## 首次部署（如果需要重来一遍）

### 1. 登录 Cloudflare

```bash
npx --yes -p node@22 -p wrangler@4.151.2 -c "wrangler login"
```

会打开浏览器让你授权，选你平时用的那个 Cloudflare 账号即可。

> 如果账号还没有 `workers.dev` 子域名，先到
> `https://dash.cloudflare.com/<账户ID>/workers/onboarding` 设置一次。

### 2. 创建 D1 数据库

```bash
npx --yes -p node@22 -p wrangler@4.151.2 -c "wrangler d1 create blog-like"
```

输出里的 `database_id` 填进 `wrangler.toml`（本站已填好）。

### 3. 建表

```bash
npx --yes -p node@22 -p wrangler@4.151.2 -c "wrangler d1 execute blog-like --remote --file=./schema.sql"
```

### 4. 部署 Worker

```bash
npx --yes -p node@22 -p wrangler@4.151.2 -c "wrangler deploy"
```

### 5. 设置 IP 盐值

```bash
npx --yes -p node@22 -p wrangler@4.151.2 -c "wrangler secret put IP_SALT"
```

按提示输入一段随机字符串即可（也可以用 `openssl rand -hex 24` 生成），
作用：让数据库里的 IP 哈希无法被彩虹表反查。

> wrangler 要求 Worker 先部署过才能设置 secret，所以这一步放在 `deploy` 之后。

## 日常更新后端

改完 `src/index.js` 后：

```bash
npx --yes -p node@22 -p wrangler@4.151.2 -c "wrangler deploy"
```

## 接入博客前端

`_config.butterfly.yml` 的 `inject.bottom` 里已经配置好：

```yaml
- '<script src="/js/article-like.js" data-api="https://blog-like.2469392809.workers.dev"></script>'
```

如果以后换了 Worker 地址，只改这里的 `data-api` 即可。

## 验证

### 1. 确认 Worker 通了

```bash
curl https://blog-like.2469392809.workers.dev/
# {"ok":true,"service":"blog-like"}
```

### 2. 测试读取与点赞

```bash
# 查询当前状态
curl "https://blog-like.2469392809.workers.dev/like?path=/2026/10/16/hello-world/"
# {"count":0,"liked":false}

# 点赞
curl -X POST "https://blog-like.2469392809.workers.dev/like" \
  -H "Content-Type: application/json" \
  -d '{"path":"/2026/10/16/hello-world/"}'
# {"count":1,"liked":true}

# 再点一次（同一个 IP 同一天）
curl -X POST "https://blog-like.2469392809.workers.dev/like" \
  -H "Content-Type: application/json" \
  -d '{"path":"/2026/10/16/hello-world/"}'
# {"count":1,"liked":false}   ← 计数没有增加，说明去重生效
```

注意：用 curl 测试会真的写入线上数据库。测完可以清掉测试数据：

```bash
npx --yes -p node@22 -p wrangler@4.151.2 -c "wrangler d1 execute blog-like --remote --command \"DELETE FROM likes WHERE path LIKE '/2099/%'\""
```

### 3. 浏览器里验证

- 打开文章页：按钮显示当前总数
- 点一次：数字 +1，变成「已点赞」
- 刷新页面：仍然是「已点赞」，再点会提示今天已经点过
- 换手机热点 / 无痕窗口（不同 IP）：可以再点一次，数字继续 +1

## 本地开发

wrangler 本地模式使用自己的本地 D1，需要先建表：

```bash
npx --yes -p node@22 -p wrangler@4.151.2 -c "wrangler d1 execute blog-like --local --file=./schema.sql"
npx --yes -p node@22 -p wrangler@4.151.2 -c "wrangler dev"
```

然后把 `data-api` 临时指向 `http://127.0.0.1:8787`（本地预览地址已在 CORS 白名单里）。

> 注意：`wrangler dev` 获取的 IP 是本机地址，和线上的真实 IP 不同，只用于验证界面与接口逻辑。

## 常见问题

**页面没有出现按钮？**

1. 确认 `data-api` 已填写，且 Worker 地址可访问
2. 浏览器控制台看有没有 `[article-like] 未配置 data-api` 或 CORS 报错
3. 确认打开的是文章详情页（URL 形如 `/YYYY/MM/DD/slug/`），首页不显示按钮

**可以改域名 / 换博客地址吗？**

- 前端：改 `_config.butterfly.yml` 里的 `data-api`
- 后端：把新域名加进 `src/index.js` 顶部的 `ALLOWED_ORIGINS`，然后重新 deploy

**免费额度够用吗？**

个人博客完全够。D1 免费额度是每天 500 万行读、10 万行写，点赞一次只写一行、打开一次页面只读两行。

**「每天」按哪个时区算？**

`Asia/Shanghai`（与博客 `_config.yml` 的 `timezone` 一致），跨过北京时间零点后可以重新点赞。
