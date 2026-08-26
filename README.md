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
