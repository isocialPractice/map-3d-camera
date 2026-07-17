# Map 3D Camera

`ctrl + click` to run [demo](https://isocialpractice.github.io/map-3d-camera/index.html).

3D satellite camera viewer for world capitals using Three.js flight simulator controls.

## Features

- **World Capitals** -- dropdown selector grouped by continent (North/South America, Europe, Asia, Africa, Oceania)
- **Satellite Tile Terrain** -- loads satellite imagery tiles from Google Maps / Esri into a 3D Three.js scene
- **Flight Simulator Controls** -- WASD, mouse look, roll, yaw, altitude, boost, and auto-level
- **Terrain Fill System** -- samples viewport colors and generates noise-blended fill for unloaded tile gaps
- **Cloud Effect** -- animated procedural cloud overlay applied to the terrain fill area
- **Render Configuration** -- adjustable sliders for map dimensions, tile settings, filler sampling, and cloud parameters
- **Export JSON** -- export current rendering configuration as `renderMap.json` for reuse across sessions
- **HUD Overlay** -- heading, speed, altitude, pitch, coordinates, and crosshair display
- **Dynamic Location Label** -- HUD top text updates with the city, state, and country at the camera's position (OpenStreetMap Nominatim reverse geocoding); outside city boundaries it shows "Rural &lt;state&gt;"
- **Static Controls List** -- always-visible key reference fixed to the lower left
- **Pause** -- press `P` to freeze flight, tile loading, HUD, and cloud animation

## Getting Started

1. Open `index.html` in a modern web browser (or serve via local HTTP server for JSON loading)
2. Select a capital city from the dropdown
3. The satellite terrain loads centered on the selected capital
4. Click to enter flight mode, then use keyboard/mouse controls

### Flight Controls

| Control                | Action            |
|------------------------|-------------------|
| W / S (Up / Down)      | Throttle          |
| Mouse (pointer lock)   | Pitch / Yaw       |
| A / D (Left / Right)   | Roll              |
| Q / E                  | Rudder yaw        |
| R / F                  | Climb / Descend   |
| Space                  | Auto-level        |
| Shift                  | Boost             |
| P                      | Pause / Resume    |

### Render Configuration

Click the **Config** button in the top-left to open the configuration panel. Adjust sliders in real-time to tune:

- **Map**: width, height, tile zoom, load radius, radius feather, start altitude, fog density
- **Filler**: sample interval, update time, patch count/size at perimeter, center, and padding zones
- **Cloud Effect**: enabled toggle, opacity, drift speed, coverage, noise scale

Click **Export JSON** to download the current configuration as `renderMap.json`. Place this file alongside `index.html` to load it automatically on next visit.

## Project Structure

```text
map-3d-camera/
  index.html            Main HTML page
  renderMap.json        Render configuration (optional; loaded on startup)
  changelog.md          Version history (unreleased-MM-DD-YYYY syntax)
  TODO.md               Idea backlog grouped by major/minor/patch impact
  css/
    styles.css          Application styles
  js/
    capitals.js         World capitals data (grouped by continent)
    geocoder.js         Reverse geocoding for the dynamic location label
    flightControls.js   Flight simulator camera controls
    terrainFill.js      Terrain fill + cloud effect system
    renderConfig.js     Configuration loader, applier, and exporter
    app.js              Application logic (scene, tiles, HUD, init)
  .github/
    skills/             Skill definitions (game-engine)
```

## Configuration

Rendering configuration is defined in `renderMap.json`:

```json
{
    "map": {
        "width": 1920,
        "height": 1080,
        "tileZoom": 15,
        "tileSize": 100,
        "loadRadius": 6,
        "unloadRadius": 9,
        "startAltitude": 200,
        "fogDensity": 0.00018,
        "radiusFeather": 3,
        "maxTiles": 600
    },
    "filler": {
        "sampleInterval": 45,
        "updateIntervalSec": 10,
        "perimeter": { "patchCount": 10, "patchSize": 10 },
        "center": { "patchCount": 5, "patchSize": 10 },
        "padding": { "patchCount": 4, "patchSize": 5 }
    },
    "cloud": {
        "enabled": true,
        "opacity": 0.35,
        "speed": 0.0004,
        "coverage": 0.5,
        "scale": 0.008
    }
}
```

| Section | Parameter | Description |
| ------- | --------- | ----------- |
| map | width / height | Render resolution of the canvas buffer |
| map | tileZoom | Satellite tile zoom level (10-19) |
| map | loadRadius | Tiles to load around camera |
| map | radiusFeather | Tiles of opacity falloff at the load radius edge |
| map | maxTiles | Maximum loaded tiles (memory cap) |
| map | fogDensity | Exponential fog density |
| filler | sampleInterval | Frames between viewport color samples |
| filler | updateIntervalSec | Seconds between fill texture regenerations |
| filler | perimeter.patchCount | Sample patches per viewport border |
| filler | center.patchCount | Sample patches from viewport center |
| filler | padding.patchCount | Sample patches toward flight direction |
| cloud | opacity | Cloud layer transparency (0-1) |
| cloud | speed | Cloud drift speed |
| cloud | coverage | Cloud coverage density (0.1-1) |
| cloud | scale | Noise scale for cloud pattern |

## Browser Support

Requires a modern browser with WebGL and Pointer Lock API support (Chrome, Firefox, Edge, Safari).

## License

MIT
