# Changelog

All notable changes to `map-3d-camera` are documented in this file.

**Version syntax**: `MM.DD.YYYY-unreleased`

- `MM` -- two-digit month
- `DD` -- two-digit day
- `YYYY` -- four-digit year
- `unreleased` -- constant prefix while the project has no tagged releases

## 07.16.2026-unreleased

### State of the repo

Single-page 3D flight simulator over satellite terrain, built with Three.js
(r128, CDN) and plain ES5 JavaScript -- no build step, no package manager. The
app loads Google Maps or Esri World Imagery tiles (auto-detected with CORS
fallback) into a dynamically loaded/unloaded tile grid centered on a selected
world capital, with pointer-lock flight controls, a HUD, a viewport-sampled
terrain fill system with procedural cloud overlay, and a live render
configuration panel that can export its state as `renderMap.json`.

Source layout: `index.html` (markup and panels), `css/styles.css` (all
styling), and `js/` containing `capitals.js` (capital data by continent),
`geocoder.js` (reverse geocoding), `flightControls.js` (camera flight model),
`terrainFill.js` (fill + cloud effect), `renderConfig.js` (config load/apply/
export), and `app.js` (scene, tile system, HUD, init). Baseline history is two
commits: the initial build and the render-config/export feature. Everything
below is uncommitted work on top of that baseline.

### Added

- **Dynamic location label** (`js/geocoder.js`): the HUD top text now updates
  during flight with the city, state, and country at the camera's current
  latitude/longitude, using OpenStreetMap Nominatim reverse geocoding. Not
  limited to the dropdown capitals. Positions outside a city or town boundary
  display as `Rural <state>, <country>` (e.g. "Rural New York, United
  States"); US civil townships intentionally read as rural. Lookups are
  throttled (5 s minimum interval, ~500 m minimum movement), keep the last
  label on network failure, and reset when a new capital is selected.
- **Static controls list**: an always-visible key reference panel fixed to the
  lower left of the screen, styled subtle but readable. Appears when terrain
  finishes loading; unlike the bottom help bar, it never fades out.
- **Pause** (`P` key): toggles a common pause state that freezes flight
  movement, tile loading, HUD updates, and cloud animation while continuing to
  render the frozen scene. A centered "Paused" indicator is shown; mouse input
  and clock time accumulated while paused are discarded on resume so the
  camera does not jump.
- **`TODO.md`**: prioritized idea backlog grouped by major/minor/patch impact.
- **This changelog.**

### Changed

- **Width/Height config sliders now work**: `map.width` and `map.height` set
  the canvas render resolution (the buffer renders at the configured size and
  CSS stretches it to the window), letting the panel preview different
  rendering resolutions. The window-resize handler now defers to the
  configured resolution instead of overriding it with the window size.
- **Tile Zoom slider is debounced** (400 ms): dragging it no longer triggers a
  full tile clear and refetch on every input tick.
- **Loading progress is measured against actual requests**: percentage is now
  `tilesLoaded / tilesRequested` instead of an estimated tile-circle area.
- **`task.bat` is location-independent**: hardcoded absolute paths replaced
  with `%~dp0` derivation.
- **README synchronized with reality**: config example and parameter table now
  include `radiusFeather`, `maxTiles`, `updateIntervalSec`, and width/height
  semantics; project structure listing corrected; new features, controls
  (including `P`), and file entries documented; markdown lint issues fixed.

### Fixed

- **Loading overlay could stall forever**: tiles evicted by the memory cap
  before their texture arrived were never counted, so large load radii could
  keep the progress below the 40% reveal threshold indefinitely. Evicted
  pending tiles now count as resolved, and failed fallback loads no longer
  count against tiles that were already unloaded.
- **Feather math broke when `radiusFeather` exceeded `loadRadius`**: a
  negative feather start corrupted opacity across the whole map; the feather
  zone is now clamped and normalized.
- **Stuck flight keys**: keyup events missed while pointer lock was released
  left keys (and auto-level) latched; all input state now clears on unlock.
- **Fly prompt stayed visible** when selecting a new capital mid-session; it
  now hides while the new terrain loads.
- **Redundant double-apply** removed from the cloud enabled checkbox handler.

### Validation

- All JavaScript passes `node --check`.
- The geocoder module was exercised end-to-end in Node with stubbed XHR
  against real Nominatim payloads: a rural upstate New York coordinate labels
  as "Rural New York, United States" and central Paris labels as "Paris,
  Île-de-France, France".
- Render-resolution behavior (width/height sliders) still needs an in-browser
  visual check.
