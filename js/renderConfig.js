/**
 * RenderConfig - Loads, applies, and exports map rendering configuration.
 *
 * On page load, fetches renderMap.json and applies its values to the
 * live simulation. Provides methods for the config panel sliders to
 * update values in real-time, and an export function that saves the
 * current configuration as a downloadable renderMap.json file.
 */
var RenderConfig = (function () {

    var defaults = {
        map: {
            width: 1920,
            height: 1080,
            tileZoom: 15,
            tileSize: 100,
            loadRadius: 6,
            unloadRadius: 9,
            startAltitude: 200,
            fogDensity: 0.00018,
            radiusFeather: 3,
            maxTiles: 600
        },
        filler: {
            sampleInterval: 45,
            updateIntervalSec: 10,
            perimeter: { patchCount: 10, patchSize: 10 },
            center: { patchCount: 5, patchSize: 10 },
            padding: { patchCount: 4, patchSize: 5 }
        },
        cloud: {
            enabled: true,
            opacity: 0.35,
            speed: 0.0004,
            coverage: 0.5,
            scale: 0.008
        }
    };

    var config = JSON.parse(JSON.stringify(defaults));
    var listeners = [];

    /**
     * Deep merge source into target, preserving existing keys.
     */
    function merge(target, source) {
        for (var key in source) {
            if (!source.hasOwnProperty(key)) continue;
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                merge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
        return target;
    }

    /**
     * Load configuration from renderMap.json, merge over defaults.
     */
    function load(callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'renderMap.json', true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    config = merge(JSON.parse(JSON.stringify(defaults)), data);
                } catch (e) {
                    console.warn('RenderConfig: invalid JSON, using defaults');
                    config = JSON.parse(JSON.stringify(defaults));
                }
            } else {
                console.warn('RenderConfig: could not load renderMap.json, using defaults');
                config = JSON.parse(JSON.stringify(defaults));
            }
            if (callback) callback(config);
        };
        xhr.send();
    }

    /**
     * Get the full config object.
     */
    function get() {
        return config;
    }

    /**
     * Set a config value by dot-notation path (e.g. "cloud.opacity").
     */
    function set(path, value) {
        var keys = path.split('.');
        var obj = config;
        for (var i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) obj[keys[i]] = {};
            obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
        apply();
        notify(path, value);
    }

    /**
     * Subscribe to config changes.
     */
    function onChange(fn) {
        listeners.push(fn);
    }

    function notify(path, value) {
        for (var i = 0; i < listeners.length; i++) {
            listeners[i](path, value, config);
        }
    }

    /**
     * Apply current config values to the live simulation globals.
     */
    function apply() {
        // Map globals
        TILE_ZOOM = config.map.tileZoom;
        TILE_SIZE = config.map.tileSize;
        LOAD_RADIUS = config.map.loadRadius;
        UNLOAD_RADIUS = Math.max(config.map.unloadRadius, LOAD_RADIUS + 3);
        START_ALTITUDE = config.map.startAltitude;
        FOG_DENSITY = config.map.fogDensity;
        RADIUS_FEATHER = config.map.radiusFeather;
        MAX_TILES = config.map.maxTiles;

        // Apply fog density to scene
        if (typeof scene !== 'undefined' && scene && scene.fog) {
            scene.fog.density = config.map.fogDensity;
        }

        // Apply filler settings to TerrainFill instance
        if (typeof terrainFill !== 'undefined' && terrainFill) {
            terrainFill.sampleInterval = config.filler.sampleInterval;
            terrainFill.updateIntervalSec = config.filler.updateIntervalSec;
            terrainFill.perimeterPatchCount = config.filler.perimeter.patchCount;
            terrainFill.perimeterPatchSize = config.filler.perimeter.patchSize;
            terrainFill.centerPatchCount = config.filler.center.patchCount;
            terrainFill.centerPatchSize = config.filler.center.patchSize;
            terrainFill.paddingPatchCount = config.filler.padding.patchCount;
            terrainFill.paddingPatchSize = config.filler.padding.patchSize;
        }

        // Apply cloud settings
        if (typeof terrainFill !== 'undefined' && terrainFill && terrainFill.cloudOverlay) {
            terrainFill.cloudOverlay.enabled = config.cloud.enabled;
            terrainFill.cloudOverlay.opacity = config.cloud.opacity;
            terrainFill.cloudOverlay.speed = config.cloud.speed;
            terrainFill.cloudOverlay.coverage = config.cloud.coverage;
            terrainFill.cloudOverlay.scale = config.cloud.scale;
        }
    }

    /**
     * Export current configuration as a downloadable renderMap.json file.
     */
    function exportJSON() {
        var json = JSON.stringify(config, null, 4);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'renderMap.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Populate slider/input elements from the current config and bind change events.
     */
    function bindSliders() {
        var sliders = document.querySelectorAll('[data-config]');
        for (var i = 0; i < sliders.length; i++) {
            (function (el) {
                var path = el.getAttribute('data-config');
                var keys = path.split('.');
                var val = config;
                for (var k = 0; k < keys.length; k++) {
                    val = val[keys[k]];
                }
                el.value = val;
                var display = document.getElementById(el.id + '-val');
                if (display) display.textContent = val;

                el.addEventListener('input', function () {
                    var v = parseFloat(el.value);
                    set(path, v);
                    if (display) display.textContent = v;
                });
            })(sliders[i]);
        }

        // Cloud enabled checkbox
        var cloudToggle = document.getElementById('cfg-cloud-enabled');
        if (cloudToggle) {
            cloudToggle.checked = config.cloud.enabled;
            cloudToggle.addEventListener('change', function () {
                set('cloud.enabled', cloudToggle.checked);
                apply();
            });
        }
    }

    return {
        load: load,
        get: get,
        set: set,
        apply: apply,
        exportJSON: exportJSON,
        bindSliders: bindSliders,
        onChange: onChange
    };
})();
