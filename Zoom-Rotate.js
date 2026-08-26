// ==UserScript==
// @name        YouTube 播放器放大（设置栏按钮）
// @description 设置栏放大按钮：点击开/关放大，全屏C/Z/X调倍率，窗口滚轮调倍率，鼠标移动画面(反向平移)，R键旋转90°，全屏屏蔽更多视频面板
// @description zoom and rotate youtube player.
// @namespace   https://github.com/diksonhe/Youtube-Zoom-Rotate-Function
// @version     5.6
// @match       https://www.youtube.com/*
// @grant       none
// ==/UserScript==

(async function () {
  'use strict';

  const MIN_ZOOM = 1.0; // 最小倍率：100%
  const MAX_ZOOM = 5.0; // 最大倍率：500%
  const STEP = 0.1;     // 每次步进

  let zoomMode = false;
  let zoomLevel = 1.0;
  let panX = 0, panY = 0; // 画面偏移
  let rot = 0;             // 旋转 0/1/2/3 => 0/90/180/270°

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  async function wait_for_element(selector) {
    let retry = 120;
    while (retry > 0) {
      const el = document.querySelector(selector);
      if (el) return el;
      retry--;
      await delay(1000);
    }
    throw new Error('wait_for_element timeout: ' + selector);
  }

  function showToast(text) {
    let tip = document.getElementById('yt-zoom-tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'yt-zoom-tip';
      tip.style.cssText =
        'position:fixed;right:16px;bottom:16px;z-index:99999;' +
        'background:rgba(0,0,0,0.75);color:#fff;padding:6px 12px;' +
        'border-radius:4px;font-size:14px;pointer-events:none;';
      document.body.appendChild(tip);
    }
    tip.textContent = text;
    clearTimeout(tip._t);
    tip._t = setTimeout(() => tip.remove(), 1200);
  }

  function getVideo() {
    return document.querySelector('.html5-main-video');
  }

  function applyTransform() {
    const video = getVideo();
    if (!video) return;
    if (zoomMode || rot !== 0) {
      video.style.transform =
        'translate(' + panX + 'px, ' + panY + 'px)' +
        ' scale(' + zoomLevel + ')' +
        ' rotate(' + (rot * 90) + 'deg)';
      video.style.transformOrigin = 'center';
    } else {
      video.style.transform = '';
      video.style.transformOrigin = '';
    }
    // 每次应用缩放后，强制把播放器容器拉回原点，防止控制条被滚走
    const player = document.querySelector('ytd-player');
    if (player) {
      player.style.overflow = zoomMode ? 'hidden' : '';
      player.scrollLeft = 0;
      player.scrollTop = 0;
    }
  }

  /* ---------- 移动鼠标：反向平移（速度随倍率增大） ---------- */
  let lastX = null, lastY = null;
  document.addEventListener('mousemove', function (e) {
    if (!zoomMode) { lastX = lastY = null; return; }
    const player = document.querySelector('ytd-player');
    if (!player || !player.contains(e.target)) {
      lastX = lastY = null;
      return;
    }
    if (lastX === null) { lastX = e.clientX; lastY = e.clientY; return; }
    // 反向：画面朝鼠标移动的反方向走，移动速度随倍率增大
    panX -= (e.clientX - lastX) * zoomLevel;
    panY -= (e.clientY - lastY) * zoomLevel;
    lastX = e.clientX; lastY = e.clientY;
    clampPan();
    applyTransform();
  });

  function clampPan() {
    const video = getVideo();
    if (!video) return;
    // 用视频实际盒子计算上限，保证画面能推到边缘对齐
    const maxX = Math.max(0, (zoomLevel - 1) * video.clientWidth / 2);
    const maxY = Math.max(0, (zoomLevel - 1) * video.clientHeight / 2);
    panX = Math.max(-maxX, Math.min(maxX, panX));
    panY = Math.max(-maxY, Math.min(maxY, panY));
  }

  /* ---------- 全屏：彻底拦截滚轮（阻止 YouTube 网格面板、阻止滚动） ---------- */
  document.addEventListener('wheel', function (e) {
    if (!document.fullscreenElement) return;
    e.preventDefault();
    e.stopImmediatePropagation(); // 同节点其余监听不再执行
    e.stopPropagation();          // 事件到不了 YouTube 的内层监听器
  }, { passive: false, capture: true });

  /* ---------- 窗口：滚轮直接缩放（最低100%） ---------- */
  document.addEventListener('wheel', function (e) {
    const player = document.querySelector('ytd-player');
    if (!player || !player.contains(e.target)) return;
    if (!zoomMode) {
      if (document.fullscreenElement) e.preventDefault();
      return;
    }
    e.preventDefault();
    // 全屏：倍率交给键盘 C/Z/X，滚轮不参与缩放
    if (document.fullscreenElement) return;
    // 窗口：滚轮缩放
    zoomLevel = Math.round((zoomLevel + (e.deltaY > 0 ? -STEP : STEP)) * 10) / 10;
    zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel));
    showToast('当前放大: ' + Math.round(zoomLevel * 100) + '%');
    applyTransform();
  }, { passive: false });

  /* ---------- 全屏键盘：C 放大 / Z 缩小 / X 还原 ---------- */
  document.addEventListener('keydown', function (e) {
    if (!document.fullscreenElement) return; // C/Z/X 仅全屏生效
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA'
        || ae.isContentEditable)) return;
    if (!zoomMode) return;
    const k = e.key.toLowerCase();
    if (k === 'c') {
      zoomLevel = Math.round((zoomLevel + STEP) * 10) / 10;
      zoomLevel = Math.min(zoomLevel, MAX_ZOOM);
    } else if (k === 'z') {
      zoomLevel = Math.round((zoomLevel - STEP) * 10) / 10;
      zoomLevel = Math.max(zoomLevel, MIN_ZOOM);
    } else if (k === 'x') {
      zoomLevel = 1.0;
      panX = 0; panY = 0; // 还原
    } else {
      return;
    }
    showToast('当前放大: ' + Math.round(zoomLevel * 100) + '%');
    applyTransform();
  });

  /* ---------- R 键：顺时针旋转 90° ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key.toLowerCase() !== 'r') return;
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA'
        || ae.isContentEditable)) return;
    rot = (rot + 1) % 4;
    showToast('旋转: ' + rot * 90 + '°');
    applyTransform();
  });

  /* ---------- 退出放大模式（保留旋转） ---------- */
  function exitZoom() {
    zoomLevel = 1.0;
    panX = 0; panY = 0;
    const btn = document.getElementById('yt-zoom-btn');
    if (btn) btn.style.color = '';
    applyTransform();
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') exitZoom();
  });

  /* ---------- 屏蔽全屏下「更多视频」面板 ---------- */
  const GRID_SELECTORS = [
    '.ytp-fullscreen-grid',
    '.ytp-fullscreen-grid-hover-overlay',
    '.ytp-fullscreen-grid-buttons-container',
    '.ytp-fullscreen-grid-main-content'
  ];

  function hideMoreVideosPanel() {
    for (const sel of GRID_SELECTORS) {
      const el = document.querySelector(sel);
      if (el) el.style.display = 'none';
    }
  }

  // YouTube 用 JS 动态插入面板，必须持续监听 DOM 变化，插入即隐藏
  const panelObserver = new MutationObserver(hideMoreVideosPanel);
  panelObserver.observe(document.body, { childList: true, subtree: true });
  hideMoreVideosPanel();

  /* ---------- 注入设置栏按钮 ---------- */
  const $right = await wait_for_element('.ytp-right-controls');
  const $settings = await wait_for_element('.ytp-settings-button');

  const ZOOM_SVG =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
    '<circle cx="9" cy="9" r="6"></circle>' +
    '<line x1="14" y1="9" x2="21" y2="15"></line>' +
    '<line x1="12" y1="9" x2="14" y2="9"></line>' +
    '<line x1="9" y1="7" x2="9" y2="11"></line></svg>';

  function buildButton() {
    const btn = $settings.cloneNode(true);
    btn.innerHTML = ZOOM_SVG;
    btn.id = 'yt-zoom-btn';
    btn.title = '放大模式\n开启/关闭：点击\n全屏倍率：C放大 / Z缩小 / X还原\n窗口倍率：滚轮（最低100%）\n移动画面：移动鼠标（反向平移，速度随倍率）\n旋转90°：R键\n全屏：屏蔽更多视频面板\n退出：Esc';
    btn.addEventListener('click', function () {
      zoomMode = !zoomMode;
      if (zoomMode) {
        btn.style.color = '#ff4000';
        applyTransform();
      } else {
        exitZoom();
      }
    });
    return btn;
  }

  function ensureButton() {
    if (document.getElementById('yt-zoom-btn')) return;
    $right.insertBefore(buildButton(), $right.firstElementChild);
  }
  ensureButton();

  /* ---------- 视频元素变化时重新应用 ---------- */
  const player = document.querySelector('ytd-player');
  if (player) {
    const observer = new MutationObserver(function () {
      ensureButton();
      applyTransform();
    });
    observer.observe(player, { childList: true });
  }
})();
