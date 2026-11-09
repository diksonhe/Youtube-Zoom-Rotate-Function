// ==UserScript==
// @name        YouTube 播放器放大（设置栏按钮）
// @description 设置栏放大按钮：点击开/关放大，全屏C/Z/X调倍率，窗口滚轮调倍率，鼠标移动画面(反向平移)，R键旋转90°，全屏屏蔽更多视频面板
// @version     8.1
// @match       https://www.youtube.com/*
// @grant       none
// @run-at      document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  const MIN_ZOOM = 1.0; // 最小倍率：100%
  const MAX_ZOOM = 5.0; // 最大倍率：500%
  const STEP = 0.1;     // 每次步进

  let zoomMode = false;
  let zoomLevel = 1.0;
  let panX = 0, panY = 0; // 画面偏移
  let rot = 0;             // 旋转 0/1/2/3 => 0/90/180/270°

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

  function getPlayer() {
    const players = Array.from(document.querySelectorAll('#movie_player.html5-video-player'));
    return players.find(player => player.clientWidth > 0 && player.clientHeight > 0
      && player.querySelector('.html5-main-video')) || null;
  }

  function getVideo() {
    return getPlayer()?.querySelector('.html5-main-video') || null;
  }

  /* ---------- 旋转90/270时的适配系数：视频最长边匹配播放器窗口最短边 ---------- */
  function fitScale() {
    const video = getVideo();
    if (!video) return 1;
    const player = getPlayer();
    const pw = player ? player.clientWidth : 0;
    const ph = player ? player.clientHeight : 0;
    const vw = video.clientWidth;
    const vh = video.clientHeight;
    const longest = Math.max(vw, vh);
    if (!longest) return 1;
    return Math.min(pw, ph) / longest;
  }

  /* ---------- 当前有效倍率（旋转适配 × 用户倍率） ---------- */
  function currentScale() {
    return zoomLevel * (rot % 2 === 1 ? fitScale() : 1);
  }

  function applyTransform() {
    const video = getVideo();
    if (!video) return;
    if (zoomMode || rot !== 0) {
      video.style.transform =
        'translate(' + panX + 'px, ' + panY + 'px)' +
        ' scale(' + currentScale() + ')' +
        ' rotate(' + (rot * 90) + 'deg)';
      video.style.transformOrigin = 'center';
    } else {
      video.style.transform = '';
      video.style.transformOrigin = '';
    }
    // 每次应用缩放后，强制把播放器容器拉回原点，防止控制条被滚走
    const player = getPlayer();
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
    const player = getPlayer();
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
    const player = getPlayer();
    const pw = player ? player.clientWidth : video.clientWidth;
    const ph = player ? player.clientHeight : video.clientHeight;
    const s = currentScale();
    // 旋转90/270后视觉宽高互换，保证画面能推到边缘对齐
    const vw = rot % 2 === 1 ? video.clientHeight : video.clientWidth;
    const vh = rot % 2 === 1 ? video.clientWidth : video.clientHeight;
    const maxX = Math.max(0, (vw * s - pw) / 2);
    const maxY = Math.max(0, (vh * s - ph) / 2);
    panX = Math.max(-maxX, Math.min(maxX, panX));
    panY = Math.max(-maxY, Math.min(maxY, panY));
  }

  /* ---------- 全屏：彻底拦截滚轮（阻止 YouTube 网格面板、阻止滚动） ---------- */
  document.addEventListener('wheel', function (e) {
    const player = getPlayer();
    if (!player || !document.fullscreenElement || !document.fullscreenElement.contains(player)) return;
    e.preventDefault();
    e.stopImmediatePropagation(); // 同节点其余监听不再执行
    e.stopPropagation();          // 事件到不了 YouTube 的内层监听器
  }, { passive: false, capture: true });

  /* ---------- 窗口：滚轮直接缩放（最低100%） ---------- */
  document.addEventListener('wheel', function (e) {
    const player = getPlayer();
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
    clampPan();
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
    clampPan();
    applyTransform();
  });

  /* ---------- R 键：顺时针旋转 90° ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key.toLowerCase() !== 'r') return;
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA'
        || ae.isContentEditable)) return;
    if (!getVideo()) return;
    rot = (rot + 1) % 4;
    showToast('旋转: ' + rot * 90 + '°');
    clampPan();
    applyTransform();
  });

  /* ---------- 退出放大模式（保留旋转） ---------- */
  function exitZoom() {
    zoomMode = false;
    zoomLevel = 1.0;
    panX = 0; panY = 0;
    lastX = lastY = null;
    updateButton();
    applyTransform();
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') exitZoom();
  });

  const ZOOM_TIP =
    '放大模式\n开启/关闭：点击\n全屏倍率：C放大 / Z缩小 / X还原\n' +
    '窗口倍率：滚轮（最低100%）\n移动画面：移动鼠标（反向平移，速度随倍率）\n' +
    '旋转90°：R键\n全屏：屏蔽更多视频面板\n退出：Esc';

  let zoomButton = null;
  let observedPlayer = null;
  let observedVideo = null;
  let updatePending = false;

  function updateButton() {
    if (!zoomButton) return;
    zoomButton.setAttribute('aria-pressed', String(zoomMode));
    zoomButton.style.setProperty('color', zoomMode ? '#ff4000' : '#fff', 'important');
  }

  function buildButton() {
    const btn = document.createElement('button');
    btn.id = 'yt-zoom-btn';
    btn.type = 'button';
    btn.className = 'ytp-button yt-zoom-btn';
    btn.setAttribute('aria-label', '放大模式');
    btn.title = ZOOM_TIP;
    const svgNamespace = 'http://www.w3.org/2000/svg';
    const icon = document.createElementNS(svgNamespace, 'svg');
    const attributes = {
      width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none',
      stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round',
      'aria-hidden': 'true'
    };
    for (const [name, value] of Object.entries(attributes)) icon.setAttribute(name, value);
    for (const [tag, values] of [
      ['circle', { cx: '10', cy: '10', r: '6' }],
      ['line', { x1: '14.5', y1: '14.5', x2: '21', y2: '21' }],
      ['line', { x1: '7', y1: '10', x2: '13', y2: '10' }],
      ['line', { x1: '10', y1: '7', x2: '10', y2: '13' }]
    ]) {
      const shape = document.createElementNS(svgNamespace, tag);
      for (const [name, value] of Object.entries(values)) shape.setAttribute(name, value);
      icon.appendChild(shape);
    }
    btn.appendChild(icon);
    btn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      zoomMode = !zoomMode;
      if (zoomMode) {
        updateButton();
        applyTransform();
      } else {
        exitZoom();
      }
    });
    return btn;
  }

  function installStyles() {
    if (document.getElementById('yt-zoom-style')) return;
    const style = document.createElement('style');
    style.id = 'yt-zoom-style';
    style.textContent = `
      #yt-zoom-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex: 0 0 48px !important;
        width: 48px !important;
        min-width: 48px !important;
        height: 100% !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
        cursor: pointer !important;
        pointer-events: auto !important;
      }
      #yt-zoom-btn svg { width: 24px; height: 24px; pointer-events: none; }
      #yt-zoom-btn:focus-visible { outline: 2px solid white; outline-offset: -3px; }
      #yt-zoom-btn[data-placement="fallback"] {
        position: absolute !important;
        top: 12px !important;
        right: 12px !important;
        height: 40px !important;
        z-index: 70 !important;
        border-radius: 4px !important;
        background: rgba(0, 0, 0, .65) !important;
      }
      .html5-video-player.ytp-fullscreen .ytp-fullscreen-grid,
      .html5-video-player.ytp-fullscreen .ytp-fullscreen-grid-hover-overlay,
      .html5-video-player.ytp-fullscreen .ytp-fullscreen-grid-buttons-container,
      .html5-video-player.ytp-fullscreen .ytp-fullscreen-grid-main-content,
      :fullscreen .ytp-fullscreen-grid,
      :fullscreen .ytp-fullscreen-grid-hover-overlay,
      :fullscreen .ytp-fullscreen-grid-buttons-container,
      :fullscreen .ytp-fullscreen-grid-main-content { display: none !important; }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function refreshTransform() {
    clampPan();
    applyTransform();
  }

  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(refreshTransform) : null;

  function ensureButton() {
    const player = getPlayer();
    if (!player) return;
    installStyles();
    if (!zoomButton) zoomButton = buildButton();
    const right = player.querySelector('.ytp-right-controls');
    const controls = player.querySelector('.ytp-chrome-controls');
    const settings = player.querySelector('.ytp-settings-button');
    const host = right || controls || player;
    const placement = host === player ? 'fallback' : 'controls';
    if (zoomButton.dataset.placement !== placement) zoomButton.dataset.placement = placement;
    if (zoomButton.parentElement !== host) {
      if (!right && settings && settings.parentElement === host) {
        host.insertBefore(zoomButton, settings);
      } else {
        host.prepend(zoomButton);
      }
    }
    updateButton();
    const video = getVideo();
    if (player !== observedPlayer || video !== observedVideo) {
      resizeObserver?.disconnect();
      observedVideo?.removeEventListener('loadedmetadata', refreshTransform);
      observedPlayer = player;
      observedVideo = video;
      resizeObserver?.observe(player);
      if (video) {
        resizeObserver?.observe(video);
        video.addEventListener('loadedmetadata', refreshTransform);
      }
      refreshTransform();
    }
  }

  function scheduleUpdate() {
    if (updatePending) return;
    updatePending = true;
    requestAnimationFrame(() => {
      updatePending = false;
      ensureButton();
    });
  }

  function start() {
    const panelObserver = new MutationObserver(scheduleUpdate);
    panelObserver.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('yt-navigate-finish', scheduleUpdate);
    document.addEventListener('yt-player-updated', scheduleUpdate);
    document.addEventListener('fullscreenchange', () => {
      scheduleUpdate();
      refreshTransform();
    });
    window.addEventListener('resize', scheduleUpdate);
    ensureButton();
    setInterval(ensureButton, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
