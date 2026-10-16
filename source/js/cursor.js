/*!
 * 紫水晶月光光标（Crystal Moonlight Cursor）
 * ---------------------------------------------------------------------------
 * 自实现的 canvas 光标特效，一个 canvas + 一个 rAF 循环画完所有东西：
 *   1. 月华主光标 —— 双层光环 + 月牙 + 中心亮核，跟随鼠标带一点延迟
 *   2. 水晶拖尾   —— 移动时撒出渐隐的紫色光点，速度越快越明显
 *   3. 点击爆发   —— 12 片旋转的菱形水晶四散 + 一圈扩散冲击波
 *   4. 悬停反馈   —— 移到链接/按钮上时光环放大变亮
 *
 * 保留系统原生光标（不改 cursor 属性），所以：
 *   · JS 挂了也不会出现「鼠标消失」
 *   · 文本选择、拖拽等原生指针语义完全不受影响
 *
 * 触屏设备与「减少动效」偏好下自动不启用；
 * 鼠标静止约 0.5 秒后自动停掉 rAF 循环省电，画面停留在最后一帧。
 */
(function () {
  'use strict';

  var mm = window.matchMedia;

  // 触屏设备不启用：手机上既没有指针，开着也是白烧电
  if (mm && mm('(pointer: coarse)').matches) return;
  // 用户系统里开了「减少动效」就不打扰
  if (mm && mm('(prefers-reduced-motion: reduce)').matches) return;

  var TAU = Math.PI * 2;
  var HUE = 285;           // 主色相：紫罗兰
  var TRAIL_MAX = 26;      // 拖尾粒子上限
  var IDLE_LIMIT = 30;     // 静止多少帧后停循环（约 0.5s）

  var canvas = document.createElement('canvas');
  canvas.id = 'ff-cursor-canvas';
  canvas.style.cssText =
    'position:fixed;left:0;top:0;width:100%;height:100%;' +
    'pointer-events:none;z-index:9998;';
  document.body.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0;
  var H = 0;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // ---- 状态 ----------------------------------------------------------------
  var mouse = { x: -999, y: -999 };   // 真实指针位置
  var smooth = { x: -999, y: -999 };  // 平滑跟随后的位置
  var last = { x: -999, y: -999 };    // 上一帧位置，用来算速度
  var hover = 0;                      // 当前悬停强度（缓动值）
  var hoverTarget = 0;                // 悬停目标值
  var trail = [];
  var shards = [];
  var waves = [];
  var raf = null;
  var idle = 0;
  var primed = false;                 // 首次移动前不画，避免左上角闪一下

  // ---- 事件 ----------------------------------------------------------------
  window.addEventListener('mousemove', function (e) {
    var dx = e.clientX - last.x;
    var dy = e.clientY - last.y;
    var speed = Math.sqrt(dx * dx + dy * dy);

    mouse.x = e.clientX;
    mouse.y = e.clientY;

    // 首次移动：直接把平滑位置对齐，否则会从左上角飞过来
    if (!primed) {
      smooth.x = mouse.x;
      smooth.y = mouse.y;
      primed = true;
    }

    if (speed > 1.5 && trail.length < TRAIL_MAX) {
      trail.push({
        x: mouse.x,
        y: mouse.y,
        vx: dx * 0.1,
        vy: dy * 0.1,
        life: 1,
        r: 1.6 + Math.random() * 2.2,
        hue: HUE + (Math.random() * 44 - 22),
        rot: Math.random() * TAU,
        vr: (Math.random() - 0.5) * 0.2
      });
    }

    last.x = mouse.x;
    last.y = mouse.y;
    start();
  });

  document.addEventListener('mousedown', function (e) {
    burst(e.clientX, e.clientY);
    start();
  });

  // 悬停增强：命中可交互元素就放大光环
  var HOVER_SEL =
    'a, button, input, textarea, select, [role="button"], ' +
    '.social-icon, .menus_item, .card-info-social-icons i';

  document.addEventListener('mouseover', function (e) {
    if (e.target && e.target.closest && e.target.closest(HOVER_SEL)) hoverTarget = 1;
  });
  document.addEventListener('mouseout', function (e) {
    if (e.target && e.target.closest && e.target.closest(HOVER_SEL)) hoverTarget = 0;
  });

  // 指针离开窗口就停掉循环并清屏（用 relatedTarget 判断，避免冒泡误触发）
  document.addEventListener('mouseout', function (e) {
    if (!e.relatedTarget) halt();
  });

  // ---- 效果 ----------------------------------------------------------------
  function burst(x, y) {
    for (var i = 0; i < 12; i++) {
      var ang = (i / 12) * TAU + Math.random() * 0.5;
      var sp = 2.2 + Math.random() * 3.4;
      shards.push({
        x: x,
        y: y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        size: 2 + Math.random() * 3,
        life: 1,
        rot: Math.random() * TAU,
        vr: (Math.random() - 0.5) * 0.32,
        hue: HUE + (Math.random() * 56 - 22)
      });
    }
    waves.push({ x: x, y: y, r: 5, life: 1 });
  }

  function start() {
    if (raf === null) raf = requestAnimationFrame(frame);
  }

  function halt() {
    if (raf !== null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
    ctx.clearRect(0, 0, W, H);
  }

  // ---- 绘制 ----------------------------------------------------------------
  function drawTrail() {
    for (var i = trail.length - 1; i >= 0; i--) {
      var p = trail[i];
      p.life -= 0.036;
      if (p.life <= 0) {
        trail.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.93;
      p.vy *= 0.93;
      p.rot += p.vr;

      var a = p.life * 0.72;
      var rad = p.r * (0.6 + p.life * 1.7);
      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 3);
      g.addColorStop(0, 'hsla(' + p.hue + ',100%,80%,' + a + ')');
      g.addColorStop(0.4, 'hsla(' + p.hue + ',100%,68%,' + a * 0.4 + ')');
      g.addColorStop(1, 'hsla(' + p.hue + ',100%,68%,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad * 3, 0, TAU);
      ctx.fill();
    }
  }

  function drawShards() {
    for (var i = shards.length - 1; i >= 0; i--) {
      var s = shards[i];
      s.life -= 0.024;
      if (s.life <= 0) {
        shards.splice(i, 1);
        continue;
      }
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.93;
      s.vy = s.vy * 0.93 + 0.07;   // 轻微重力，落感更自然
      s.rot += s.vr;

      var a = s.life * 0.9;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.fillStyle = 'hsla(' + s.hue + ',100%,80%,' + a + ')';
      ctx.shadowColor = 'hsla(' + s.hue + ',100%,70%,' + a + ')';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, -s.size);
      ctx.lineTo(s.size * 0.55, 0);
      ctx.lineTo(0, s.size);
      ctx.lineTo(-s.size * 0.55, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawWaves() {
    for (var i = waves.length - 1; i >= 0; i--) {
      var w = waves[i];
      w.life -= 0.034;
      if (w.life <= 0) {
        waves.splice(i, 1);
        continue;
      }
      w.r += 3.4;
      ctx.strokeStyle = 'hsla(' + HUE + ',100%,80%,' + w.life * 0.5 + ')';
      ctx.lineWidth = Math.max(w.life * 2, 0.4);
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, TAU);
      ctx.stroke();
    }
  }

  function drawHalo() {
    if (!primed) return;

    var x = smooth.x;
    var y = smooth.y;
    var k = 1 + hover * 0.85;

    // 外圈柔光
    var glowR = 24 * k;
    var g = ctx.createRadialGradient(x, y, 0, x, y, glowR);
    g.addColorStop(0, 'hsla(' + HUE + ',100%,78%,0.30)');
    g.addColorStop(0.55, 'hsla(' + HUE + ',100%,68%,0.13)');
    g.addColorStop(1, 'hsla(' + HUE + ',100%,68%,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, glowR, 0, TAU);
    ctx.fill();

    // 内环
    ctx.strokeStyle = 'hsla(' + HUE + ',100%,80%,' + (0.42 + hover * 0.42) + ')';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, 10.5 * k, 0, TAU);
    ctx.stroke();

    // 外环
    ctx.strokeStyle = 'hsla(' + (HUE + 32) + ',100%,82%,' + (0.20 + hover * 0.34) + ')';
    ctx.beginPath();
    ctx.arc(x, y, 16.5 * k, 0, TAU);
    ctx.stroke();

    // 月牙（一段弧，转个角度看起来像缺月）
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 5);
    ctx.strokeStyle = 'hsla(' + HUE + ',100%,92%,' + (0.7 + hover * 0.3) + ')';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 6 * k, 0.15 * Math.PI, 1.35 * Math.PI);
    ctx.stroke();
    ctx.restore();

    // 中心亮核
    ctx.fillStyle = 'hsla(' + HUE + ',100%,96%,0.95)';
    ctx.beginPath();
    ctx.arc(x, y, 1.8 * k, 0, TAU);
    ctx.fill();
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);

    smooth.x += (mouse.x - smooth.x) * 0.22;
    smooth.y += (mouse.y - smooth.y) * 0.22;
    hover += (hoverTarget - hover) * 0.15;

    drawTrail();
    drawShards();
    drawWaves();
    drawHalo();

    // 静止且没有粒子在飞 -> 停掉循环，画面保留最后一帧
    var moving =
      Math.abs(mouse.x - smooth.x) > 0.4 ||
      Math.abs(mouse.y - smooth.y) > 0.4 ||
      Math.abs(hoverTarget - hover) > 0.01;

    if (moving || trail.length || shards.length || waves.length) {
      idle = 0;
    } else {
      idle++;
    }

    if (idle > IDLE_LIMIT) {
      raf = null;
      return;
    }
    raf = requestAnimationFrame(frame);
  }
})();
