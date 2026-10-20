/*!
 * 文章点赞按钮
 * ---------------------------------------------------------------------------
 * 后端：Cloudflare Worker + D1（见仓库 like-worker/ 目录）
 * 规则：同一个 IP 对同一篇文章，每天（Asia/Shanghai）只能点赞一次。
 *
 * 工作方式：
 *   1. 只在文章详情页（存在 #post）挂载按钮，首页/归档/分类页不显示
 *   2. 按钮插在 #article-container（正文）之后，也就是每篇文章的末尾
 *   3. 打开页面时 GET 总数 + 当前 IP 今天是否已点
 *   4. 点击时 POST；服务端用 D1 唯一索引去重，前端只负责展示结果
 *   5. 主题开了 pjax，切换文章时要销毁旧按钮并重新初始化
 *
 * 配置：API 地址写在 _config.butterfly.yml 的 inject.bottom 里，
 *       通过 <script data-api="https://xxx.workers.dev"> 传进来。
 *       未配置时脚本直接跳过，不会在页面上留下一个点不动的按钮。
 */
(function () {
  'use strict';

  // inject 的 <script> 标签上读取 API 地址；去掉末尾多余的斜杠。
  // currentScript 取不到时（脚本被异步加载等）退回查询带 data-api 的标签。
  var scriptEl = document.currentScript || document.querySelector('script[data-api]');
  var API_BASE = ((scriptEl && scriptEl.getAttribute('data-api')) || '')
    .trim()
    .replace(/\/+$/, '');

  if (!API_BASE) {
    console.warn('[article-like] 未配置 data-api，点赞功能已跳过。');
    return;
  }

  // 与后端一致：只认 Hexo 默认 permalink 形式 /YYYY/MM/DD/slug/
  var POST_PATH_RE = /^\/\d{4}\/\d{2}\/\d{2}\/[^/]+\/$/;
  var REQUEST_TIMEOUT = 8000;
  var pending = null; // 当前进行中的请求，切页时中止

  // ---- 工具 ---------------------------------------------------------------

  function currentPath() {
    var path = location.pathname;
    if (path.charAt(path.length - 1) !== '/') path += '/';
    return POST_PATH_RE.test(path) ? path : null;
  }

  function abortPending() {
    if (pending) {
      pending.abort();
      pending = null;
    }
  }

  function removeButton() {
    var old = document.querySelector('.post-like');
    if (old) old.parentNode.removeChild(old);
  }

  function request(url, options) {
    abortPending();

    var controller = new AbortController();
    pending = controller;

    var timer = setTimeout(function () {
      controller.abort();
    }, REQUEST_TIMEOUT);

    options = options || {};
    options.signal = controller.signal;

    return fetch(url, options)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .finally(function () {
        clearTimeout(timer);
        if (pending === controller) pending = null;
      });
  }

  function fetchState(path) {
    return request(API_BASE + '/like?path=' + encodeURIComponent(path));
  }

  function sendLike(path) {
    return request(API_BASE + '/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: path }),
    });
  }

  function markLiked(btn, labelEl, tipEl, message) {
    btn.classList.add('is-liked');
    btn.setAttribute('aria-pressed', 'true');
    btn.disabled = true;
    labelEl.textContent = '已点赞';
    tipEl.textContent = message;
  }

  // ---- 主流程 -------------------------------------------------------------

  function init() {
    var path = currentPath();
    if (!path) {
      removeButton();
      return;
    }

    var post = document.getElementById('post');
    var article = document.getElementById('article-container');
    if (!post || !article) return;
    if (post.querySelector('.post-like')) return; // 已经挂过了

    // ---- 构建 UI ----
    var box = document.createElement('div');
    box.className = 'post-like';
    box.innerHTML =
      '<button type="button" class="post-like-btn" aria-pressed="false">' +
        '<i class="fas fa-heart" aria-hidden="true"></i>' +
        '<span class="post-like-count">--</span>' +
        '<span class="post-like-label">点赞</span>' +
      '</button>' +
      '<p class="post-like-tip">喜欢这篇文章？点个赞吧</p>';

    var btn = box.querySelector('.post-like-btn');
    var countEl = box.querySelector('.post-like-count');
    var labelEl = box.querySelector('.post-like-label');
    var tipEl = box.querySelector('.post-like-tip');

    // 插到正文之后、版权声明/分享栏之前
    if (article.nextSibling) {
      article.parentNode.insertBefore(box, article.nextSibling);
    } else {
      article.parentNode.appendChild(box);
    }

    // ---- 点击：提交点赞 ----
    btn.addEventListener('click', function () {
      if (btn.disabled) return;

      var clickPath = currentPath();
      if (!clickPath) return;

      btn.disabled = true;
      tipEl.textContent = '提交中…';

      sendLike(clickPath)
        .then(function (data) {
          // 请求期间已经切到别的文章了，丢弃这次结果
          if (currentPath() !== clickPath) return;

          countEl.textContent = data.count;
          if (data.liked) {
            markLiked(btn, labelEl, tipEl, '感谢点赞！');
          } else {
            // 服务端说这个 IP 今天已经点过了
            markLiked(btn, labelEl, tipEl, '今天已经点过啦，明天再来～');
          }
        })
        .catch(function (err) {
          // 已经切到别的文章了，丢弃这次结果
          if (currentPath() !== clickPath) return;

          // 超时也要把按钮恢复成可点，不能一直卡在「提交中」
          btn.disabled = false;
          tipEl.textContent = err && err.name === 'AbortError'
            ? '请求超时，请稍后再试'
            : '网络开小差了，稍后再试';
        });
    });

    // ---- 加载当前状态 ----
    var loadPath = path;
    fetchState(loadPath)
      .then(function (data) {
        if (currentPath() !== loadPath) return;

        countEl.textContent = data.count;
        if (data.liked) {
          markLiked(btn, labelEl, tipEl, '今天已经点过啦，明天再来～');
        }
      })
      .catch(function () {
        // 切页时节点已经随旧页面一起被移除，不必再更新
        if (currentPath() !== loadPath) return;
        countEl.textContent = '--';
        tipEl.textContent = '点赞服务暂时不可用';
      });
  }

  // ---- 生命周期 -----------------------------------------------------------

  // 离开当前页时清掉旧按钮和未完成的请求
  document.addEventListener('pjax:send', function () {
    abortPending();
    removeButton();
  });

  // 主题用 pjax 切页，每次切换后重新挂载
  document.addEventListener('pjax:complete', init);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
