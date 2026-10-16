---
title: 关于
date: 2026-10-16 10:39:40
aside: false
---

<!-- ============================================================
     关于页 · 手搓版
     想改内容直接改下面的 HTML 文字即可；样式都收在 .ff-about 作用域内，
     不会污染其它页面。头像引用的是 /img/avatar.jpg。
     ============================================================ -->

<style>
.ff-about {
  --a-primary: #6a0dad;
  --a-soft:    #9d4edd;
  --a-accent:  #c77dff;
  --a-pink:    #ffb6e6;
  --a-ink:     #4a3a5c;
  --a-dark:    rgba(45, 10, 61, .72);
  --a-radius:  18px;
  color: var(--a-ink);
}
[data-theme='dark'] .ff-about { color: rgba(233, 216, 250, .84); }

/* 顶部个人区 */
.ff-about .a-hero {
  display: flex;
  align-items: center;
  gap: 28px;
  flex-wrap: wrap;
  margin-bottom: 34px;
  padding: 30px 32px;
  border-radius: var(--a-radius);
  background: linear-gradient(-45deg, #e2c1ffcc, #ffb6e6cc, #c9a9ffcc, #ffb3fdcc);
  box-shadow: 0 10px 34px rgba(122, 60, 180, .18);
  border: 1px solid rgba(255, 255, 255, .55);
}
[data-theme='dark'] .ff-about .a-hero {
  background: var(--a-dark);
  border-color: rgba(199, 125, 255, .18);
  box-shadow: 0 10px 34px rgba(0, 0, 0, .4);
}
.ff-about .a-avatar {
  flex: none;
  width: 116px;
  height: 116px;
  border-radius: 50%;
  background: url('/img/avatar.jpg') center/cover no-repeat;
  box-shadow: 0 8px 26px rgba(157, 78, 221, .42);
  transition: transform .45s cubic-bezier(.2, .8, .3, 1);
}
.ff-about .a-avatar:hover { transform: rotate(6deg) scale(1.06); }
.ff-about .a-intro { flex: 1; min-width: 220px; }
.ff-about .a-name {
  margin: 0 0 6px;
  padding: 0;
  font-size: 2.1em;
  font-weight: 700;
  letter-spacing: 2px;
  border: none;
  background: linear-gradient(135deg, #6a0dad, #c77dff 60%, #ffb6e6);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
.ff-about .a-name::before { display: none !important; }
.ff-about .a-tagline {
  margin: 0;
  font-size: 1.05em;
  letter-spacing: 3px;
  color: var(--a-soft);
}
[data-theme='dark'] .ff-about .a-tagline { color: var(--a-accent); }
.ff-about .a-motto {
  margin: 10px 0 0;
  font-size: .92em;
  font-style: italic;
  opacity: .85;
}

/* 章节 */
.ff-about .a-section {
  position: relative;
  margin-bottom: 26px;
  padding: 24px 28px 24px 30px;
  border-radius: var(--a-radius);
  background: linear-gradient(-45deg, #f3e6ffe6, #ffe9f8e6, #ece0ffe6, #ffeafee6);
  box-shadow: 0 8px 26px rgba(122, 60, 180, .12);
  border: 1px solid rgba(255, 255, 255, .5);
  transition: transform .3s ease, box-shadow .3s ease;
  overflow: hidden;
}
[data-theme='dark'] .ff-about .a-section {
  background: var(--a-dark);
  border-color: rgba(199, 125, 255, .16);
}
.ff-about .a-section::before {
  position: absolute;
  top: 0; bottom: 0; left: 0;
  width: 6px;
  content: '';
  background: linear-gradient(180deg, var(--a-accent), var(--a-pink));
}
.ff-about .a-section:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 40px rgba(122, 60, 180, .22);
}
.ff-about .a-section > h2 {
  display: block;
  margin: 0 0 16px;
  padding: 0;
  border: none;
  font-size: 1.35em;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--a-primary);
}
[data-theme='dark'] .ff-about .a-section > h2 { color: var(--a-accent); }
/* 顶掉全局给 h2 加的竖条——本页改用区块左侧那条 */
.ff-about .a-section > h2::before { display: none !important; }
.ff-about .a-section > h2 i { margin-right: 10px; color: var(--a-soft); }

.ff-about .a-section p {
  margin: 0 0 12px;
  line-height: 1.9;
  font-size: 1.02em;
}
.ff-about .a-section p:last-child { margin-bottom: 0; }

/* 方向标签 */
.ff-about .a-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
}
.ff-about .a-tags span {
  padding: 5px 16px;
  border-radius: 20px;
  font-size: .92em;
  color: var(--a-primary);
  background: rgba(157, 78, 221, .12);
  border: 1px dashed rgba(157, 78, 221, .45);
  transition: all .28s ease;
  cursor: default;
}
.ff-about .a-tags span:hover {
  color: #fff;
  background: linear-gradient(135deg, var(--a-soft), var(--a-accent));
  border-color: transparent;
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(157, 78, 221, .38);
}
[data-theme='dark'] .ff-about .a-tags span { color: rgba(233, 216, 250, .85); }

/* 列表 */
.ff-about .a-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.ff-about .a-list li {
  position: relative;
  margin: 0 0 9px;
  padding-left: 26px;
  line-height: 1.8;
  transition: transform .25s ease;
}
/* 纯 CSS 画的右箭头（两条边框转 45°）——
   不用图标字体的码位，省得主题换了 Font Awesome 版本就变成方框 */
.ff-about .a-list li::before {
  position: absolute;
  top: .66em;
  left: 3px;
  width: 7px;
  height: 7px;
  content: '';
  border-top: 2px solid var(--a-accent);
  border-right: 2px solid var(--a-accent);
  transform: rotate(45deg);
  transition: transform .25s ease;
}
.ff-about .a-list li:hover::before { transform: rotate(45deg) translate(2px, -2px); }
.ff-about .a-list li:hover { transform: translateX(6px); }

/* 诗句 */
.ff-about .a-poem {
  padding: 22px 26px;
  border-radius: var(--a-radius);
  text-align: center;
  background: rgba(157, 78, 221, .09);
  border: 1px solid rgba(157, 78, 221, .22);
}
.ff-about .a-poem p {
  margin: 0 0 6px;
  font-size: 1.05em;
  letter-spacing: 4px;
  line-height: 2;
}
.ff-about .a-poem p:last-child { margin-bottom: 0; }
.ff-about .a-poem cite {
  display: block;
  margin-top: 12px;
  font-size: .85em;
  font-style: normal;
  letter-spacing: 2px;
  opacity: .7;
}

/* 联系 */
.ff-about .a-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.ff-about .a-links a {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 9px 20px;
  border-radius: 30px;
  font-size: .95em;
  color: #fff !important;
  text-decoration: none !important;
  background-image: linear-gradient(135deg, #9d4edd, #c77dff);
  background-size: auto;
  box-shadow: 0 6px 18px rgba(157, 78, 221, .32);
  transition: all .3s ease;
}
.ff-about .a-links a:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 26px rgba(157, 78, 221, .48);
}

@media screen and (max-width: 768px) {
  .ff-about .a-hero { padding: 24px 20px; gap: 18px; }
  .ff-about .a-name { font-size: 1.6em; }
  .ff-about .a-avatar { width: 88px; height: 88px; }
  .ff-about .a-section { padding: 20px 18px 20px 22px; }
  .ff-about .a-poem p { letter-spacing: 2px; font-size: .98em; }
}
</style>

<div class="ff-about">

  <div class="a-hero">
    <div class="a-avatar"></div>
    <div class="a-intro">
      <h1 class="a-name">flewfish</h1>
      <p class="a-tagline">人生海海，山山而川</p>
      <p class="a-motto">林深时见鹿，海蓝时见鲸</p>
    </div>
  </div>

  <div class="a-section">
    <h2><i class="fas fa-user-astronaut"></i>关于我</h2>
    <p>你好，我是 <strong>flewfish</strong>，一个在网络安全这条路上持续折腾的人。</p>
    <p>这个博客是我给自己搭的一块自留地——把踩过的坑、复现过的漏洞、想明白的原理随手记下来。写下来才算真正学会，也方便日后的自己回来看。</p>
    <p>技术上相信「知其然，更要知其所以然」。做安全尤其如此，只会套工具的人走不远。</p>
  </div>

  <div class="a-section">
    <h2><i class="fas fa-shield-halved"></i>关注方向</h2>
    <div class="a-tags">
      <span>网络安全</span>
      <span>渗透测试</span>
      <span>漏洞复现</span>
      <span>内网渗透</span>
      <span>免杀对抗</span>
      <span>CTF</span>
      <span>Web 安全</span>
      <span>代码审计</span>
    </div>
  </div>

  <div class="a-section">
    <h2><i class="fas fa-pen-nib"></i>这里会写什么</h2>
    <ul class="a-list">
      <li>渗透测试的实战记录，从信息收集到权限维持</li>
      <li>CVE 与常见漏洞的复现过程、原理剖析与利用思路</li>
      <li>内网渗透中的横向移动技巧与免杀对抗笔记</li>
      <li>CTF 题目的解题思路与踩坑总结</li>
      <li>安全工具的使用心得与自研小工具</li>
      <li>学习路上的一些碎碎念</li>
    </ul>
  </div>

  <div class="a-section">
    <h2><i class="fas fa-feather-pointed"></i>我的信条</h2>
    <div class="a-poem">
      <p>莫听穿林打叶声，何妨吟啸且徐行。</p>
      <p>竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。</p>
      <p>回首向来萧瑟处，归去，也无风雨也无晴。</p>
      <cite>—— 苏轼《定风波》</cite>
    </div>
  </div>

  <div class="a-section">
    <h2><i class="fas fa-paper-plane"></i>找到我</h2>
    <p>博客的评论框和留言板都用 GitHub 账号登录，想聊技术、或者只是打个招呼，都欢迎。</p>
    <div class="a-links">
      <a href="https://github.com/flewfish" target="_blank" rel="noopener">
        <i class="fab fa-github"></i> GitHub
      </a>
      <a href="/comments/">
        <i class="fas fa-comment-dots"></i> 留言板
      </a>
    </div>
  </div>

</div>
