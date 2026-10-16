/*!
 * 首页分类卡片墙
 * ---------------------------------------------------------------------------
 * 为什么自己写而不用 `hexo-butterfly-categories-card`：
 * 那个插件的教程要求在 node_modules 里改它自己的源码，而 CI 每次构建都会
 * `npm ci` 重装依赖 —— 本地改的东西在线上根本不存在。所以这边只用公开的
 * Hexo 扩展点（filter + injector）重新实现一遍，不碰任何第三方源码。
 *
 * 工作方式：
 *   构建时   —— 读分类数据，拼出卡片墙的 HTML，塞进一段脚本里
 *   运行时   —— 脚本判断当前是首页，把卡片墙挂到 #recent-posts 里
 *              （挂在分页器前面；没有分页器就接在最后）
 *
 * 为什么用「运行时挂载」而不是直接改 HTML 字符串：
 *   主题渲染出来的 DOM 里，要精确插到 #recent-posts 的收尾 </div> 之前，
 *   只能靠脆弱的字符串匹配。用 DOM API 追加就稳得多，也不怕主题改版。
 *
 * 配置见 _config.butterfly.yml 的 categoryWall 段。
 */
'use strict';

const urlFor = require('hexo-util').url_for.bind(hexo);

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 注册在 after_generate：Hexo 的 routes 是懒渲染的，真正渲染 HTML 发生在写盘阶段，
// 那时才轮到 injector 生效，所以在这个时机注册是来得及的。
hexo.extend.filter.register('after_generate', function () {
  const config = hexo.theme.config.categoryWall || hexo.config.categoryWall;
  if (!config || !config.enable) return;

  const catQuery = hexo.locals.get('categories');
  const cats = (catQuery && catQuery.data) || [];
  if (!cats.length) return;

  const postQuery = hexo.locals.get('posts');
  const postCount = (postQuery && postQuery.data) ? postQuery.data.length : 0;

  const defaultCover = urlFor(config.default_cover || '/img/cover-default.jpg');
  const coverMap = config.cover || {};

  // 文章多的分类排前面
  const list = cats.slice().sort((a, b) => (b.length || 0) - (a.length || 0));

  const items = list.map(function (cat) {
    const rawCover = coverMap[cat.name] || defaultCover;
    const cover = urlFor(rawCover);
    const path = urlFor(cat.path);
    return '<li class="ff-catwall-item">' +
             '<a class="ff-catwall-link" href="' + escapeHtml(path) + '"' +
               ' style="background-image:url(' + escapeHtml(cover) + ')">' +
               '<span class="ff-catwall-name">' + escapeHtml(cat.name) + '</span>' +
               '<span class="ff-catwall-count">' +
                 '<i class="fas fa-book-open"></i> ' + (cat.length || 0) + ' 篇' +
               '</span>' +
             '</a>' +
           '</li>';
  }).join('');

  const wallHtml =
    '<div class="ff-catwall">' +
      '<div class="ff-catwall-head">' +
        '<i class="fas fa-folder-open"></i><span>文章分类</span>' +
      '</div>' +
      '<ul class="ff-catwall-list">' + items + '</ul>' +
    '</div>';

  // 内容还很少的时候（分类少 + 文章少）用高卡片：
  // 这时候左侧列表很短，矮卡片配一大片空白更难看。
  // 文章和分类多起来之后自动回到常规高度，不会一直顶着一张巨卡。
  const fewClass = (list.length <= 2 && postCount <= 3) ? ' ff-catwall--few' : '';

  // 用 JSON.stringify 生成 JS 字面量，再把 '<' 转义掉，
  // 免得分类名里出现 </script> 直接把脚本截断
  const literal = JSON.stringify(wallHtml).replace(/</g, '\\u003c');

  const script = [
    '<script data-pjax>',
    '(function () {',
    '  var HTML = ' + literal + ';',
    '  var FEW = ' + (fewClass ? 'true' : 'false') + ';',
    '  function mount() {',
    '    var p = location.pathname;',
    "    if (p !== '/' && p !== '/index.html') return;",
    "    var host = document.getElementById('recent-posts');",
    "    if (!host || host.querySelector('.ff-catwall')) return;",
    "    var box = document.createElement('div');",
    '    box.innerHTML = HTML;',
    '    var wall = box.firstChild;',
    "    if (FEW) wall.className += ' ff-catwall--few';",
    "    var pager = host.querySelector('#pagination');",
    '    if (pager) host.insertBefore(wall, pager); else host.appendChild(wall);',
    '  }',
    "  if (document.readyState === 'loading') {",
    "    document.addEventListener('DOMContentLoaded', mount);",
    '  } else { mount(); }',
    // 主题开了 pjax，来回切页面时也要重新挂一次
    "  document.addEventListener('pjax:complete', mount);",
    '})();',
    '</script>'
  ].join('\n');

  hexo.extend.injector.register('body_end', script, 'default');
});
