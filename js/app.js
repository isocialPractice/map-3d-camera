/**
 * 3D Flight Simulator - Main Application
 *
 * Three.js scene with satellite imagery terrain tiles,
 * flight simulator controls, dynamic tile loading, and HUD.
 */

/* ============================================================
   Configuration
   ============================================================ */

var TILE_ZOOM = 15;
var TILE_SIZE = 100;        // Three.js world units per tile
var LOAD_RADIUS = 6;        // Tiles to load around camera
var UNLOAD_RADIUS = 9;      // Tiles to unload beyond this distance
var START_ALTITUDE = 200;   // Starting camera height
var FOG_DENSITY = 0.00018;  // Exponential fog density

/* ============================================================
   State
   ============================================================ */

var scene, camera, renderer, clock;
var controls; // FlightControls instance
var terrainFill; // TerrainFill instance

var textureLoader;
var loadedTiles = {};
var centerTileX = 0;
var centerTileY = 0;
var originLat = 0;
var originLng = 0;
var currentMetersPerTile = 1000;
var currentCapitalName = '';

var tilesLoaded = 0;
var tilesRequested = 0;
var initialLoadDone = false;
var tileUpdateCounter = 0;

/* ============================================================
   Tile Math Utilities
   ============================================================ */

function latLngToTile(lat, lng, zoom) {
    var n = Math.pow(2, zoom);
    var x = Math.floor((lng + 180) / 360 * n);
    var latRad = lat * Math.PI / 180;
    var y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x: x, y: y };
}

function tileToLatLng(x, y, zoom) {
    var n = Math.pow(2, zoom);
    var lng = x / n * 360 - 180;
    var latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
    var lat = latRad * 180 / Math.PI;
    return { lat: lat, lng: lng };
}

function metersPerTile(lat, zoom) {
    return 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom) * 256;
}

function positionToLatLng(worldX, worldZ) {
    var metersPerUnit = currentMetersPerTile / TILE_SIZE;
    var dMetersX = worldX * metersPerUnit;
    var dMetersZ = worldZ * metersPerUnit;
    var dLng = dMetersX / (111320 * Math.cos(originLat * Math.PI / 180));
    var dLat = -dMetersZ / 110574;
    return {
        lat: originLat + dLat,
        lng: originLng + dLng
    };
}

/* ============================================================
   Tile URL Providers
   ============================================================ */

// Esri World Imagery (reliable CORS, high quality satellite)
function getEsriTileUrl(x, y, z) {
    return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/' + z + '/' + y + '/' + x;
}

// Google Maps satellite tiles (may have CORS restrictions)
function getGoogleTileUrl(x, y, z) {
    var server = ['mt0', 'mt1', 'mt2', 'mt3'][Math.abs(x + y) % 4];
    return 'https://' + server + '.google.com/vt/lyrs=s&x=' + x + '&y=' + y + '&z=' + z;
}

// Active tile provider - defaults to Google, falls back to Esri
var tileProvider = 'google';

function getTileUrl(x, y, z) {
    if (tileProvider === 'google') {
        return getGoogleTileUrl(x, y, z);
    }
    return getEsriTileUrl(x, y, z);
}

/* ============================================================
   Tile Provider Detection
   ============================================================ */

function detectTileProvider(callback) {
    var testImg = new Image();
    testImg.crossOrigin = 'anonymous';
    var done = false;

    testImg.onload = function () {
        if (done) return;
        done = true;
        // Test if we can actually read pixel data (CORS check)
        try {
            var canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(testImg, 0, 0, 1, 1);
            ctx.getImageData(0, 0, 1, 1); // Throws if CORS tainted
            tileProvider = 'google';
        } catch (e) {
            tileProvider = 'esri';
        }
        callback();
    };

    testImg.onerror = function () {
        if (done) return;
        done = true;
        tileProvider = 'esri';
        callback();
    };

    setTimeout(function () {
        if (done) return;
        done = true;
        tileProvider = 'esri';
        callback();
    }, 4000);

    testImg.src = getGoogleTileUrl(0, 0, 1);
}

/* ============================================================
   Scene Setup
   ============================================================ */

function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.FogExp2(0x87CEEB, FOG_DENSITY);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 50000);
    camera.position.set(0, START_ALTITUDE, 150);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Lighting
    var hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x8B6914, 0.4);
    scene.add(hemiLight);

    var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(200, 400, 100);
    scene.add(dirLight);

    var ambLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambLight);

    // Water plane (visible below terrain tiles)
    var waterGeo = new THREE.PlaneGeometry(80000, 80000);
    var waterMat = new THREE.MeshBasicMaterial({ color: 0x1a4a7a });
    var waterPlane = new THREE.Mesh(waterGeo, waterMat);
    waterPlane.rotation.x = -Math.PI / 2;
    waterPlane.position.y = -2;
    scene.add(waterPlane);

    // Texture loader
    textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous';

    // Clock
    clock = new THREE.Clock();

    // Flight controls
    controls = new FlightControls(camera, renderer.domElement);

    // Terrain fill (samples viewport colors to fill unloaded tile gaps)
    terrainFill = new TerrainFill(renderer, scene, camera);

    // Window resize
    window.addEventListener('resize', function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

/* ============================================================
   Terrain Tile System
   ============================================================ */

function loadTile(tileX, tileY) {
    var key = tileX + ',' + tileY;
    if (loadedTiles[key]) return;

    var worldX = (tileX - centerTileX) * TILE_SIZE;
    var worldZ = (tileY - centerTileY) * TILE_SIZE;

    var geometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
    var material = new THREE.MeshBasicMaterial({ color: 0x2a3a2a });
    var mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(worldX, 0, worldZ);
    scene.add(mesh);

    loadedTiles[key] = { mesh: mesh, tileX: tileX, tileY: tileY };
    tilesRequested++;

    var url = getTileUrl(tileX, tileY, TILE_ZOOM);

    textureLoader.load(url, function (texture) {
        if (!loadedTiles[key]) return; // Already unloaded
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        mesh.material.map = texture;
        mesh.material.color.set(0xffffff);
        mesh.material.needsUpdate = true;
        tilesLoaded++;
        updateLoadingProgress();
    }, undefined, function () {
        // Primary failed, try fallback provider
        var fallbackUrl = (tileProvider === 'google')
            ? getEsriTileUrl(tileX, tileY, TILE_ZOOM)
            : getGoogleTileUrl(tileX, tileY, TILE_ZOOM);

        textureLoader.load(fallbackUrl, function (texture) {
            if (!loadedTiles[key]) return;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            mesh.material.map = texture;
            mesh.material.color.set(0xffffff);
            mesh.material.needsUpdate = true;
            tilesLoaded++;
            updateLoadingProgress();
        }, undefined, function () {
            tilesLoaded++;
            updateLoadingProgress();
        });
    });
}

function unloadTile(key) {
    var tile = loadedTiles[key];
    if (!tile) return;

    scene.remove(tile.mesh);
    tile.mesh.geometry.dispose();
    if (tile.mesh.material.map) tile.mesh.material.map.dispose();
    tile.mesh.material.dispose();

    delete loadedTiles[key];
}

function clearAllTiles() {
    var keys = Object.keys(loadedTiles);
    for (var i = 0; i < keys.length; i++) {
        unloadTile(keys[i]);
    }
    loadedTiles = {};
    tilesLoaded = 0;
    tilesRequested = 0;
    initialLoadDone = false;
}

function updateTiles() {
    if (!originLat) return;

    var camTileX = centerTileX + Math.round(controls.position.x / TILE_SIZE);
    var camTileY = centerTileY + Math.round(controls.position.z / TILE_SIZE);

    // Load tiles within radius
    for (var dx = -LOAD_RADIUS; dx <= LOAD_RADIUS; dx++) {
        for (var dy = -LOAD_RADIUS; dy <= LOAD_RADIUS; dy++) {
            if (dx * dx + dy * dy > LOAD_RADIUS * LOAD_RADIUS) continue;
            var tx = camTileX + dx;
            var ty = camTileY + dy;
            var key = tx + ',' + ty;
            if (!loadedTiles[key]) {
                loadTile(tx, ty);
            }
        }
    }

    // Unload distant tiles
    var allKeys = Object.keys(loadedTiles);
    for (var i = 0; i < allKeys.length; i++) {
        var parts = allKeys[i].split(',');
        var tx2 = parseInt(parts[0]);
        var ty2 = parseInt(parts[1]);
        var ddx = tx2 - camTileX;
        var ddy = ty2 - camTileY;
        if (ddx * ddx + ddy * ddy > UNLOAD_RADIUS * UNLOAD_RADIUS) {
            unloadTile(allKeys[i]);
        }
    }
}

/* ============================================================
   Capital Loading
   ============================================================ */

function loadCapital(capitalData) {
    clearAllTiles();

    originLat = capitalData.lat;
    originLng = capitalData.lng;
    currentCapitalName = capitalData.capital + ', ' + capitalData.country;
    currentMetersPerTile = metersPerTile(originLat, TILE_ZOOM);

    var tile = latLngToTile(originLat, originLng, TILE_ZOOM);
    centerTileX = tile.x;
    centerTileY = tile.y;

    // Show loading
    document.getElementById('loading-overlay').classList.remove('hidden');
    document.getElementById('welcome').classList.add('hidden');

    // Reset terrain fill for new location
    if (terrainFill) terrainFill.reset();

    // Load initial tiles
    updateTiles();

    // Position camera above the capital
    controls.resetTo(
        new THREE.Vector3(0, START_ALTITUDE, 150),
        new THREE.Vector3(0, 0, 0)
    );

    // Update HUD capital name
    document.getElementById('hud-capital').textContent = currentCapitalName;
}

/* ============================================================
   Loading Progress
   ============================================================ */

function updateLoadingProgress() {
    var initialCount = Math.floor(Math.PI * LOAD_RADIUS * LOAD_RADIUS);
    var pct = Math.min(100, Math.round((tilesLoaded / initialCount) * 100));

    document.getElementById('loading-bar').style.width = pct + '%';
    document.getElementById('loading-progress').textContent = pct + '%';

    if (!initialLoadDone && pct >= 40) {
        initialLoadDone = true;
        document.getElementById('loading-overlay').classList.add('hidden');
        document.getElementById('fly-prompt').classList.remove('hidden');
        document.getElementById('hud').classList.remove('hidden');
    }
}

/* ============================================================
   HUD Updates
   ============================================================ */

function updateHUD() {
    if (!controls || !controls.isEnabled) return;

    var heading = controls.getHeading();
    var pitch = controls.getPitch();
    var speed = controls.getSpeed();
    var altitude = controls.getAltitude();

    // Convert speed from world units/frame to approximate km/h
    var metersPerUnit = currentMetersPerTile / TILE_SIZE;
    var speedKmh = Math.round(speed * 60 * metersPerUnit * 3.6);
    var altMeters = Math.round(altitude * metersPerUnit);

    // Heading cardinal direction
    var cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
    var cardinalIdx = Math.round(heading / 45);
    var cardinal = cardinals[cardinalIdx];

    document.getElementById('hud-heading-value').textContent =
        cardinal + ' ' + Math.round(heading) + '\u00B0';

    document.getElementById('hud-speed-value').textContent = speedKmh;
    document.getElementById('hud-altitude-value').textContent = altMeters;
    document.getElementById('hud-pitch-value').textContent =
        (pitch >= 0 ? '+' : '') + Math.round(pitch) + '\u00B0';

    // Update coordinates
    var coords = positionToLatLng(controls.position.x, controls.position.z);
    var latDir = coords.lat >= 0 ? 'N' : 'S';
    var lngDir = coords.lng >= 0 ? 'E' : 'W';
    document.getElementById('hud-coords').textContent =
        Math.abs(coords.lat).toFixed(4) + '\u00B0' + latDir + '  ' +
        Math.abs(coords.lng).toFixed(4) + '\u00B0' + lngDir;
}

/* ============================================================
   UI Setup
   ============================================================ */

function setupUI() {
    var select = document.getElementById('capital-select');

    // Populate dropdown
    for (var i = 0; i < CAPITALS_BY_REGION.length; i++) {
        var region = CAPITALS_BY_REGION[i];
        var optgroup = document.createElement('optgroup');
        optgroup.label = region.region;

        for (var j = 0; j < region.capitals.length; j++) {
            var cap = region.capitals[j];
            var option = document.createElement('option');
            option.value = JSON.stringify(cap);
            option.textContent = cap.capital + ' - ' + cap.country;
            optgroup.appendChild(option);
        }

        select.appendChild(optgroup);
    }

    // Selection handler
    select.addEventListener('change', function (e) {
        if (!e.target.value) return;
        var data = JSON.parse(e.target.value);
        loadCapital(data);
    });

    // Flight controls lock/unlock
    document.addEventListener('flightcontrols', function (e) {
        if (e.detail.locked) {
            document.getElementById('fly-prompt').classList.add('hidden');
            document.getElementById('controls-help').classList.remove('hidden');

            // Fade out controls help after 5 seconds
            setTimeout(function () {
                document.getElementById('controls-help').classList.add('fade-out');
            }, 5000);
        } else {
            document.getElementById('controls-help').classList.add('hidden');
            document.getElementById('controls-help').classList.remove('fade-out');
            if (initialLoadDone) {
                document.getElementById('fly-prompt').classList.remove('hidden');
            }
        }
    });
}

/* ============================================================
   Animation Loop
   ============================================================ */

function animate() {
    requestAnimationFrame(animate);

    var delta = clock.getDelta();

    // Update flight controls
    controls.update(delta);

    // Periodically update tiles
    tileUpdateCounter++;
    if (tileUpdateCounter >= 30) {
        tileUpdateCounter = 0;
        updateTiles();
    }

    // Update HUD
    updateHUD();

    // Render
    renderer.render(scene, camera);

    // Update terrain fill after main render (samples viewport, generates fill for next frame)
    if (terrainFill && initialLoadDone) {
        terrainFill.update(controls ? controls.getHeading() : 0);
    }
}

/* ============================================================
   Initialize
   ============================================================ */

function init() {
    detectTileProvider(function () {
        initScene();
        setupUI();
        animate();
    });
}

document.addEventListener('DOMContentLoaded', init);
