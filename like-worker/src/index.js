/*!
 * 博客文章点赞 API（Cloudflare Worker + D1）
 * ---------------------------------------------------------------------------
 * 约束：同一个 IP 对同一篇文章，每天（Asia/Shanghai）最多点赞一次。
 *
 * 接口：
 *   GET  /like?path=/2026/10/16/hello-world/
 *        -> { count: 12, liked: false }      liked = 当前 IP 今天是否已点
 *   POST /like   body: { "path": "/2026/10/16/hello-world/" }
 *        -> { count: 13, liked: true }       今天没点过，计数 +1
 *        -> { count: 12, liked: false }      今天已经点过，计数不变
 *
 * 实现要点：
 *   1. 真实 IP 取 Cloudflare 注入的 CF-Connecting-IP，本地开发时退回 X-Forwarded-For
 *   2. IP 只存 SHA-256 哈希（加盐），不落明文
 *   3. 「今天」按博客所在时区 Asia/Shanghai 计算，跨零点后可以重新点赞
 *   4. 去重完全交给 D1 唯一索引 (path, ip_hash, day)，并发下也不会重复计数
 *   5. CORS 只放行博客域名与本机预览地址
 *
 * 部署步骤见同目录 README.md。
 */

// 允许跨域的前端来源：线上博客 + 本地 hexo server 预览
const ALLOWED_ORIGINS = [
  'https://flewfish.github.io',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
];

// 文章路径只接受 Hexo 的默认 permalink 形式：/YYYY/MM/DD/slug/
const POST_PATH_RE = /^\/\d{4}\/\d{2}\/\d{2}\/[^/]+\/$/;

// 没配置 IP_SALT 时的兜底盐值。
// 生产环境建议执行 `wrangler secret put IP_SALT` 换成一个随机值。
const DEFAULT_SALT = 'flewfish-blog-like';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);

    // 浏览器的预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      const url = new URL(request.url);

      // 根路径做个简单的健康检查，方便部署后确认 Worker 通了
      if (url.pathname === '/' && request.method === 'GET') {
        return json({ ok: true, service: 'blog-like' }, 200, cors);
      }

      if (url.pathname !== '/like') {
        return json({ error: 'not_found' }, 404, cors);
      }

      if (!env.DB) {
        return json({ error: 'db_not_configured' }, 500, cors);
      }

      if (request.method === 'GET') return handleGet(request, env, cors);
      if (request.method === 'POST') return handlePost(request, env, cors);

      return json({ error: 'method_not_allowed' }, 405, cors);
    } catch (err) {
      // 不要把内部错误细节抛给前端，只在日志里留痕
      console.error('like-worker error:', err);
      return json({ error: 'server_error' }, 500, cors);
    }
  },
};

/** GET /like?path=...：返回总数 + 当前 IP 今天是否已点 */
async function handleGet(request, env, cors) {
  const url = new URL(request.url);
  const path = normalizePath(url.searchParams.get('path'));
  if (!path) return json({ error: 'invalid_path' }, 400, cors);

  const ipHash = await hashIp(clientIp(request), saltOf(env));
  const day = todayInShanghai();

  const [countRes, likedRes] = await env.DB.batch([
    env.DB.prepare('SELECT COUNT(*) AS count FROM likes WHERE path = ?').bind(path),
    env.DB
      .prepare('SELECT 1 AS liked FROM likes WHERE path = ? AND ip_hash = ? AND day = ? LIMIT 1')
      .bind(path, ipHash, day),
  ]);

  return json(
    {
      count: countRes.results?.[0]?.count ?? 0,
      liked: (likedRes.results?.length ?? 0) > 0,
    },
    200,
    cors
  );
}

/** POST /like：尝试插入一条点赞记录，唯一索引负责去重 */
async function handlePost(request, env, cors) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ error: 'invalid_json' }, 400, cors);
  }

  const path = normalizePath(body && body.path);
  if (!path) return json({ error: 'invalid_path' }, 400, cors);

  const ipHash = await hashIp(clientIp(request), saltOf(env));
  const day = todayInShanghai();

  const inserted = await env.DB
    .prepare(
      'INSERT INTO likes (path, ip_hash, day, created_at) VALUES (?, ?, ?, ?) ' +
        'ON CONFLICT(path, ip_hash, day) DO NOTHING'
    )
    .bind(path, ipHash, day, Date.now())
    .run();

  const liked = (inserted.meta?.changes ?? 0) > 0;

  // 无论这次有没有新增，都返回当前准确总数
  const countRes = await env.DB
    .prepare('SELECT COUNT(*) AS count FROM likes WHERE path = ?')
    .bind(path)
    .first();

  return json({ count: countRes?.count ?? 0, liked }, 200, cors);
}

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };

  // 只对白名单来源回显 ACAO；其他来源浏览器会自行拦截
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

/** 取客户端真实 IP：Cloudflare 环境下 CF-Connecting-IP 一定存在 */
function clientIp(request) {
  const cfIp = request.headers.get('CF-Connecting-IP');
  if (cfIp) return cfIp.trim();

  const forwarded = request.headers.get('X-Forwarded-For');
  if (forwarded) return forwarded.split(',')[0].trim();

  return 'unknown';
}

/** 对 IP 做带盐 SHA-256，避免在库里留下可反查的明文地址 */
async function hashIp(ip, salt) {
  const data = new TextEncoder().encode(salt + ':' + ip);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function saltOf(env) {
  return env.IP_SALT || DEFAULT_SALT;
}

/** 返回 Asia/Shanghai 时区的 YYYY-MM-DD */
function todayInShanghai() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const pick = (type) => (parts.find((part) => part.type === type) || {}).value || '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

/**
 * 校验并规范化文章路径：
 *  - 去掉 query / hash
 *  - 补全首尾斜杠，避免 /path 与 /path/ 被当成两篇文章
 *  - 只接受 /YYYY/MM/DD/slug/，防止被拿来刷任意字符串
 */
function normalizePath(raw) {
  if (typeof raw !== 'string') return null;

  let path = raw.trim();
  if (!path || path.length > 200) return null;

  path = path.split(/[?#]/)[0];
  if (!path.startsWith('/')) path = '/' + path;
  if (!path.endsWith('/')) path += '/';

  return POST_PATH_RE.test(path) ? path : null;
}
