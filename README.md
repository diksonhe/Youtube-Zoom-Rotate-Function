# YouTube 播放器放大（设置栏按钮） 完全由 Qwen 3.8 AI模型编写，本人只提需求意见和测试工作

一个轻量、零依赖、纯前端注入的油猴脚本，为 YouTube 播放器增加**放大 / 平移**能力。
放大按钮挂在设置栏，放大时倍率由键盘（全屏）或滚轮（窗口）控制；
不引入任何额外框架，不改动 YouTube 的播放逻辑。

## 功能

- **设置栏一键开关** — 放大按钮注入在设置栏首位，开启时变红
- **倍率范围 100% – 500%**，步进 10%，实时显示当前倍率提示
- **全屏键盘倍率** — `C` 放大 / `Z` 缩小 / `X` 还原
- **窗口滚轮倍率** — 普通滚轮直接缩放（向上放大 / 向下缩小），无需 Shift
- **反向平移** — 画面朝鼠标反方向移动，移动速度随倍率增大，边缘钳制到视频实际盒子
- **旋转** — `R` 每次顺时针旋转 90°，可与任意方向组合
- **全屏净化** — 屏蔽 YouTube「更多视频」网格面板，并拦截滚轮触发

## 快捷键

| 键位 | 状态 | 作用 |
| --- | --- | --- |
| 设置栏放大按钮 | — | 开 / 关放大模式（开启时变红） |
| `C` | 全屏 | 放大 +10% |
| `Z` | 全屏 | 缩小 −10% |
| `X` | 全屏 | 还原到 100% 并复位 |
| `R` | — | 顺时针旋转 90° |
| `Esc` | — | 退出放大（保留旋转） |
| 滚轮（窗口） | — | 滚轮缩放（向上放大 / 向下缩小） |
| 鼠标移动（放大中） | — | 反向平移画面，速度随倍率提升 |

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/)（或 Greasemonkey）
2. 新建脚本，粘贴本仓库脚本文件内容，保存
3. 打开任意 YouTube 视频页面，设置栏会出现放大按钮

## 说明 / 设计取舍

- 倍率最低锁定 100%，避免缩小到看不清
- 平移上限按视频实际盒子计算，保证画面能推满上下左右边缘
- 全屏「更多视频」面板通过 `MutationObserver` 监听 + `display: none` 处理，插入即隐藏，即使 YouTube 重新插入也不会显示

## 版本记录

### v5.6
- 全屏彻底拦截滚轮：在 `document` 捕获阶段监听并 `stopPropagation()`，事件到不了 YouTube 内层的网格处理器；`preventDefault()` 阻止原生滚动行为

### v5.5
- 平移速度随倍率增大，推满边缘所需鼠标行程更少
- 平移钳制改用视频实际盒子（`clientWidth` / `clientHeight`），画面能推到真实边缘对齐

### v5.4
- 全屏键盘倍率：`C` 放大 / `Z` 缩小 / `X` 还原
- 全屏移除 `Shift + 滚轮` 缩放
- 窗口模式用普通滚轮缩放（无需 Shift）；鼠标在播放器外时滚轮照常滚动页面

### v5.3
- 锁定播放控制条 / 进度条：放大时对播放器设 `overflow: hidden`，每次应用变换后强制 `scrollLeft` / `scrollTop` 复位，滚轮 `preventDefault` 保证控制条对齐

### v5.2
- 扩大网格面板屏蔽范围到 `.ytp-fullscreen-grid` 及其子元素（`hover-overlay`、`buttons-container`、`main-content`）；改用 `display: none` 做真实移除

### v5.1
- 反向平移方向：鼠标右移画面左移（上下左右同理）

### v5.0
- 初始版本：设置栏放大按钮，倍率范围 100%–500%（步进 10%），`Shift + 滚轮` 缩放，反向平移，`R` 旋转 90°，`Esc` 退出，以及首版全屏网格面板屏蔽

## 许可证

MIT

# YouTube Player Zoom

A lightweight, dependency-free Tampermonkey/Greasemonkey userscript that adds a
**zoom / pan** feature to the YouTube player. The zoom control lives in the
settings bar; zoom is driven by keyboard in fullscreen and by the wheel in
windowed mode. No extra frameworks, no changes to YouTube's playback logic.

## Features

- **Settings-bar toggle** — zoom button injected at the start of the settings bar; red when active
- **Zoom range 100% – 500%**, step 10%, with a live zoom indicator
- **Full keyboard zoom (fullscreen)** — `C` in / `Z` out / `X` reset
- **Wheel zoom (windowed)** — plain wheel over the player, no Shift needed
- **Reverse pan** — screen moves opposite to the mouse; pan speed scales with zoom; edge clamped to the video box
- **Rotate** — `R` rotates 90° clockwise, combinable with any direction
- **Fullscreen cleanup** — hides YouTube's "More videos" grid panel and blocks the wheel from triggering it

## Shortcuts

| Key | Scope | Action |
| --- | --- | --- |
| Settings-bar zoom button | — | Toggle zoom mode (red when active) |
| `C` | Fullscreen | Zoom in +10% |
| `Z` | Fullscreen | Zoom out −10% |
| `X` | Fullscreen | Reset to 100% and re-center |
| `R` | — | Rotate 90° clockwise |
| `Esc` | — | Exit zoom (rotation kept) |
| Wheel (windowed) | — | Zoom up / down |
| Mouse move (while zoomed) | — | Reverse-pan the screen, speed scales with zoom |

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) (or Greasemonkey)
2. Create a new script and paste the content of this repository's script file
3. Open any YouTube video page — the zoom button appears in the settings bar

## Notes / design trade-offs

- Zoom floor locked at 100% so it never shrinks below original size
- Pan clamp uses the video's actual box so the image can reach true edges
- Fullscreen grid panel is hidden via `MutationObserver` + `display: none`
  (hide-on-insert) so it never appears even if YouTube re-inserts it

## Changelog

### v5.6
- Hard block of the wheel in fullscreen: capture-phase listener on `document`
  with `stopPropagation()` so the event never reaches YouTube's grid handler;
  `preventDefault()` stops native scroll behavior

### v5.5
- Pan speed scales with zoom level; push-to-edge takes less mouse travel at
  high zoom
- Pan clamp now uses the video's real box (`clientWidth` / `clientHeight`),
  so the image can reach true edge alignment

### v5.4
- Full keyboard zoom in fullscreen: `C` in / `Z` out / `X` reset
- Removed `Shift + wheel` zoom in fullscreen
- Window mode uses plain wheel zoom (no Shift); wheel over the rest of the
  page still scrolls normally

### v5.3
- Locked playback controls / progress bar: `overflow: hidden` on the player
  while zoomed, forced `scrollLeft` / `scrollTop` reset on every transform,
  wheel `preventDefault` so the control bar stays aligned

### v5.2
- Expanded grid panel hiding to `.ytp-fullscreen-grid` plus its children
  (`hover-overlay`, `buttons-container`, `main-content`); switched to
  `display: none` for a true removal

### v5.1
- Reversed pan direction: mouse right → screen left (and up / down / left /
  right)

### v5.0
- Initial baseline: settings-bar zoom button, zoom range 100%–500% (step 10%),
  `Shift + wheel` zoom, reverse pan, `R` rotate 90°, `Esc` exit, and the first
  version of the fullscreen grid panel block

## License

MIT
