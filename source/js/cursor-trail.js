/*!
 * 光标拖尾粒子效果
 * 轻量自实现：canvas 绘制渐隐的发光粒子，跟随鼠标移动。
 * 触屏设备与「减少动效」偏好下自动禁用。
 */
(function () {
  'use strict';

  var mm = window.matchMedia;
  // 触屏设备（指针粗糙）不启用，否则手机上会误触
  if (mm && mm('(pointer: coarse)').matches) return;
  // 用户系统里开了「减少动效」就不打扰
  if (mm && mm('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:fixed;left:0;top:0;width:100%;height:100%;' +
    'pointer-events:none;z-index:9998;';
  document.body.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var particles = [];
  var MAX = 22;         // 拖尾长度
  var DECAY = 0.042;    // 每帧衰减速度
  var rafId = null;

  function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  window.addEventListener('mousemove', function (e) {
    particles.push({
      x: e.clientX,
      y: e.clientY,
      life: 1,
      r: 2.4 + Math.random() * 1.6,
      hue: 330 + Math.random() * 22   // 粉紫色区间
    });
    if (particles.length > MAX) particles.shift();
    if (!rafId) rafId = requestAnimationFrame(draw);
  });

  function draw() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // 从旧到新绘制，越新的越亮，形成拖尾
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.life -= DECAY;
      if (p.life <= 0) continue;

      var alpha = p.life * 0.7;
      var radius = p.r * p.life * 3;
      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      g.addColorStop(0, 'hsla(' + p.hue + ',100%,72%,' + alpha + ')');
      g.addColorStop(0.45, 'hsla(' + p.hue + ',100%,66%,' + alpha * 0.42 + ')');
      g.addColorStop(1, 'hsla(' + p.hue + ',100%,66%,0)');

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 丢弃已经淡完的粒子
    for (var j = particles.length - 1; j >= 0; j--) {
      if (particles[j].life <= 0) particles.splice(j, 1);
    }

    rafId = particles.length ? requestAnimationFrame(draw) : null;
    if (!rafId) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
})();
