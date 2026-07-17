# TODO

Planned and candidate work for `map-3d-camera`, grouped by release impact.

- **Major** -- new capabilities or architectural changes
- **Minor** -- feature additions and enhancements that fit the current design
- **Patch** -- small fixes, polish, and housekeeping

## Major

- [ ] **Terrain elevation** -- replace flat tile planes with heightmap geometry
      (e.g. AWS/Mapzen terrarium elevation tiles) so mountains and valleys are 3D
- [ ] **Waypoint / autopilot system** -- plot a route between capitals and let the
      camera fly it automatically with a follow or cinematic mode
- [ ] **Day/night cycle** -- compute sun position from latitude, longitude, and
      local time; drive directional light, sky color, and fog accordingly
- [ ] **Gamepad and mobile support** -- Gamepad API mapping for flight controls and
      a touch control scheme so the simulator works without keyboard/pointer lock
- [ ] **Flight recording and replay** -- capture position/orientation samples and
      play back or export a completed flight

## Minor

- [ ] **Search box in the capital dropdown** -- type-ahead filtering, plus arbitrary
      lat/lng or place-name entry (forward geocoding) beyond the capital list
- [ ] **Minimap overlay** -- small 2D map showing camera position, heading, and
      loaded tile coverage
- [ ] **Config persistence to localStorage** -- remember slider settings between
      visits without requiring the Export JSON / place-file workflow
- [ ] **Tile provider selector** -- expose the Google/Esri provider choice in the
      config panel instead of auto-detect only
- [ ] **Compass tape HUD** -- replace the text heading with a scrolling compass
      strip; add a bank-angle indicator for roll
- [ ] **Screenshot button** -- capture the WebGL canvas to a downloadable PNG

## Patch

- [ ] **Nominatim attribution** -- display an OpenStreetMap attribution notice while
      the dynamic location label is active (required by OSM/ODbL usage terms)
- [ ] **Format config value displays** -- show fog density and cloud speed with fixed
      precision instead of raw float text next to their sliders
- [ ] **Clamp radius feather slider** -- cap the feather max dynamically at the
      current load radius so the two sliders cannot contradict each other
- [ ] **Debounce load radius changes** -- large loadRadius drags trigger heavy tile
      churn; debounce like the tile zoom slider
- [ ] **Progress bar on capital switch** -- brief flicker of stale percentages is
      possible while pending tiles resolve; reset the bar to 0% before showing
- [ ] **Pause while pointer-locked hint** -- show the `P` key state in the HUD so
      users know pause is available during flight
