# Map 3D Camera

`ctrl + click` to run [demo](https://isocialpractice.github.io/map-3d-camera/index.html).

3D satellite camera viewer for US state capitals using Google Maps.

## Features

- **50 US State Capitals** -- dropdown selector grouped by region (Northeast, Southeast, Midwest, Southwest, West)
- **Google Maps Satellite View** -- loads satellite imagery in an embedded iframe with 3D tilt
- **3D Camera Controls** -- rotate, pan, and zoom the satellite view with mouse controls
- **Background Map Buffer** -- hidden background map at 10% wider zoom provides visual data at perspective edges
- **Low Sensitivity Controls** -- intentionally subtle 3D controls for smooth, precise camera adjustments

## Getting Started

1. Open `index.html` in a modern web browser
2. Select a state capital from the dropdown
3. The satellite view loads centered on the selected capital

### 3D Camera Controls

| Control                | Action            |
|------------------------|-------------------|
| Left-click + drag      | Rotate (tilt/orbit) |
| Right-click + drag     | Pan               |
| Mouse wheel            | Zoom in/out       |

Controls are set to very low sensitivity for fine-grained camera adjustments.

## Project Structure

```
map-3d-camera/
  index.html            Main HTML page
  css/
    styles.css          Application styles
  js/
    capitals.js         US state capitals data (50 states, grouped by region)
    app.js              Application logic (form, map loading, configuration)
    camera3d.js         3D camera controls (CSS 3D transforms)
  .github/
    instructions/       Copilot instruction files
    skills/             Skill definitions (game-engine, quasi-coder)
```

## Configuration

Map configuration is defined in `js/app.js`:

```javascript
const mapConfig = {
  view: 'satellite',   // Satellite imagery
  labels: false,        // Minimal labels
  '3d': true            // 3D tilt enabled (45 degree default)
};
```

### Map URL Parameters

The application builds Google Maps embed URLs using protocol buffer parameters:

- **Distance** (`!1d`) -- controls zoom level (lower = more zoomed in, default: 3000)
- **Heading** (`!1f`) -- camera heading in degrees (default: 0, north-up)
- **Tilt** (`!2f`) -- 3D tilt angle (default: 45 degrees)
- **Map type** (`!5e1`) -- satellite view

### 3D Control Sensitivity

Sensitivity values in `js/camera3d.js`:

```javascript
sensitivity: {
  rotate: 0.03,    // degrees per pixel
  pan: 0.15,       // pixels per pixel
  zoom: 0.0002     // scale per wheel delta unit
}
```

## How It Works

### Map Loading

1. User selects a capital from the dropdown
2. The app builds two Google Maps embed URLs using the capital's coordinates:
   - **Rendered map** -- visible iframe at the selected zoom level
   - **Background map** -- hidden iframe at 10% more zoom-out (wider field of view)
3. Both iframes load in the map container (80% of viewport width and height)

### 3D Camera Controls

The 3D effect is achieved through CSS 3D transforms applied to the map wrapper:

1. The map container has `perspective: 2000px` creating a 3D rendering context
2. The map wrapper has `transform-style: preserve-3d` for 3D transform support
3. On mouse interaction, CSS transforms are applied:
   - `rotateX()` -- tilts the view forward/backward
   - `rotateY()` -- orbits the view left/right
   - `translate()` -- pans the view
   - `scale()` -- zooms in/out
4. The background map (10% more zoomed out, 110% size) becomes visible behind the main map, providing visual context at the edges exposed by perspective distortion
5. Mouse wheel zoom debounces a map URL update that reloads both iframes at the appropriate distance, maintaining the 10% zoom offset for the background map

### Transform Limits

To prevent extreme distortion, transforms are clamped:

- Rotation: +/- 12 degrees vertical, +/- 15 degrees horizontal
- Pan: +/- 60 pixels in each direction
- Zoom: 0.85x to 1.3x scale

## Browser Support

Requires a modern browser with CSS 3D transform support (Chrome, Firefox, Edge, Safari).

## License

MIT
