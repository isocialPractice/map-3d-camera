/************************************************************************
 * Geocoder - Reverse geocodes the camera's latitude/longitude into a   *
 * human-readable location label ("City, State, Country") using the     *
 * OpenStreetMap Nominatim API.                                         *
 *                                                                      *
 * Falls back to "Rural <state>, <country>" when the position is not    *
 * within a city/town/village boundary. Requests are throttled by time  *
 * and by minimum movement to respect the Nominatim usage policy        *
 * (absolute maximum of 1 request per second).                          *
 ***********************************************************************/
var Geocoder = (function () {

    var MIN_INTERVAL_MS = 5000;  // Minimum time between lookups
    var MIN_MOVE_DEG = 0.005;    // Minimum movement (~500m) before a new lookup

    var lastLat = null;
    var lastLng = null;
    var lastRequestTime = 0;
    var lastLabel = '';
    var pending = false;

    /**
     * Builds a display label from a Nominatim address object.
     * Within a city boundary: "City, State, Country".
     * Outside one: "Rural State, Country" (e.g. "Rural New York, United States").
     */
    function buildLabel(address) {
        // Only city/town count as being "within a city"; villages, hamlets,
        // and US civil townships ("Town of X" -> village) read as rural
        var city = address.city || address.town;
        var state = address.state || address.province || address.region ||
                    address.county;
        var country = address.country;
        var parts = [];

        if (city) {
            parts.push(city);
            if (state) parts.push(state);
            if (country) parts.push(country);
        } else {
            var area = state || country;
            if (!area) return '';
            parts.push('Rural ' + area);
            if (state && country) parts.push(country);
        }

        return parts.join(', ');
    }

    /**
     * Requests a label for the given position. Throttled internally,
     * so it is safe to call every frame. Invokes callback(label) only
     * when the label has changed.
     */
    function update(lat, lng, callback) {
        var now = performance.now();
        if (pending || now - lastRequestTime < MIN_INTERVAL_MS) return;
        if (lastLat !== null &&
            Math.abs(lat - lastLat) < MIN_MOVE_DEG &&
            Math.abs(lng - lastLng) < MIN_MOVE_DEG) return;

        pending = true;
        lastRequestTime = now;

        var url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10' +
                  '&lat=' + encodeURIComponent(lat) +
                  '&lon=' + encodeURIComponent(lng);

        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            pending = false;
            if (xhr.status !== 200) return; // Keep the last label on failure

            try {
                var data = JSON.parse(xhr.responseText);
                var label = buildLabel(data.address || {});
                lastLat = lat;
                lastLng = lng;
                if (label && label !== lastLabel) {
                    lastLabel = label;
                    callback(label);
                }
            } catch (e) {
                // Malformed response: keep the last label
            }
        };
        xhr.send();
    }

    /**
     * Clears cached state when switching capitals so the next lookup
     * runs immediately for the new location.
     */
    function reset() {
        lastLat = null;
        lastLng = null;
        lastRequestTime = 0;
        lastLabel = '';
        pending = false;
    }

    return {
        update: update,
        reset: reset
    };
})();
