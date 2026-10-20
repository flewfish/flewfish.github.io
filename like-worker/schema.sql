-- ===========================================================================
--  文章点赞 · D1 表结构
-- ---------------------------------------------------------------------------
--  设计说明：
--    只有一张 likes 表，没有额外的「总数字段」。
--    点赞总数直接 COUNT(*) 统计 —— 有 (path, ip_hash, day) 唯一索引，
--    WHERE path = ? 走索引最左前缀，个人博客的量级下完全够快。
--
--    这样做的好处是天然没有并发问题：
--    两个请求同时点同一篇，唯一索引只会让一个 INSERT 成功，
--    另一个走 ON CONFLICT DO NOTHING，总数永远 = 成功的行数，
--    不需要「先插标记、再 +1」这种两步操作，也就不会出现漏加/多加。
--
--  唯一索引同时承担两个职责：
--    1. 去重：同一个 IP 对同一篇文章同一天只允许一行
--    2. 加速：COUNT 和「今天是否点过」的查询都走这个索引
-- ===========================================================================

CREATE TABLE IF NOT EXISTS likes (
  path       TEXT    NOT NULL,   -- 文章路径，如 /2026/10/16/hello-world/
  ip_hash    TEXT    NOT NULL,   -- 客户端 IP 的 SHA-256（带盐），不存明文 IP
  day        TEXT    NOT NULL,   -- 点赞日期 YYYY-MM-DD（Asia/Shanghai）
  created_at INTEGER NOT NULL    -- 时间戳（毫秒），留作以后排查/统计
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_dedup
  ON likes (path, ip_hash, day);
