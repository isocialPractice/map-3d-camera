/*******************************************************************
 * FlightControls - Flight simulator camera controls for Three.js. *
 *                                                                 *
 * Controls:                                                       *
 *   Mouse (pointer lock): Pitch and Yaw                           *
 *   W / Up Arrow:         Increase speed                          *
 *   S / Down Arrow:       Decrease speed                          *
 *   A / Left Arrow:       Roll left                               *
 *   D / Right Arrow:      Roll right                              *
 *   Q:                    Yaw left (rudder)                       *
 *   E:                    Yaw right (rudder)                      *
 *   R:                    Climb                                   *
 *   F:                    Descend                                 *
 *   Space:                Auto-level (stabilize)                  *
 *   Shift:                Boost speed                             *
 ******************************************************************/
function FlightControls(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    // Position and orientation
    this.position = camera.position.clone();
    this.quaternion = new THREE.Quaternion();

    // Speed
    this.speed = 0;
    this.targetSpeed = 0;
    this.minSpeed = 0;
    this.maxSpeed = 12;
    this.boostMultiplier = 3;
    this.acceleration = 4.0;
    this.deceleration = 3.0;

    // Rotation
    this.rollSpeed = 1.8;
    this.yawSpeed = 1.0;
    this.mouseSensitivity = 0.002;

    // Altitude
    this.verticalSpeed = 0;
    this.verticalAccel = 4.0;
    this.minAltitude = 8;

    // Input state
    this.keys = {};
    this.mouseMovementX = 0;
    this.mouseMovementY = 0;
    this.isPointerLocked = false;
    this.isEnabled = false;

    // Auto-level
    this.autoLevel = false;
    this.autoLevelSpeed = 3.0;

    this._init();
}

FlightControls.prototype._init = function () {
    var self = this;

    document.addEventListener('keydown', function (e) {
        self.keys[e.code] = true;
        if (e.code === 'Space') {
            self.autoLevel = true;
            e.preventDefault();
        }
    });

    document.addEventListener('keyup', function (e) {
        self.keys[e.code] = false;
        if (e.code === 'Space') {
            self.autoLevel = false;
        }
    });

    this.domElement.addEventListener('click', function () {
        if (!self.isPointerLocked) {
            self.domElement.requestPointerLock();
        }
    });

    document.addEventListener('mousemove', function (e) {
        if (!self.isPointerLocked) return;
        self.mouseMovementX += e.movementX || 0;
        self.mouseMovementY += e.movementY || 0;
    });

    document.addEventListener('pointerlockchange', function () {
        self.isPointerLocked = document.pointerLockElement === self.domElement;
        self.isEnabled = self.isPointerLocked;
        if (!self.isPointerLocked) {
            // Keyup events can be missed while unlocked; clear input
            // state so no key reads as stuck on the next lock
            self.keys = {};
            self.autoLevel = false;
            self.mouseMovementX = 0;
            self.mouseMovementY = 0;
        }
        document.dispatchEvent(new CustomEvent('flightcontrols', {
            detail: { locked: self.isPointerLocked }
        }));
    });

    this.domElement.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    });
};

FlightControls.prototype.update = function (delta) {
    if (!this.isEnabled) return;
    delta = Math.min(delta, 0.1);

    // --- Mouse look: pitch and yaw ---
    if (this.mouseMovementX !== 0 || this.mouseMovementY !== 0) {
        var pitchAngle = -this.mouseMovementY * this.mouseSensitivity;
        var yawAngle = -this.mouseMovementX * this.mouseSensitivity;

        // Pitch around camera's local X axis
        var right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quaternion);
        var pitchQuat = new THREE.Quaternion().setFromAxisAngle(right, pitchAngle);
        this.quaternion.premultiply(pitchQuat);

        // Yaw around world Y axis for stability
        var worldUp = new THREE.Vector3(0, 1, 0);
        var yawQuat = new THREE.Quaternion().setFromAxisAngle(worldUp, yawAngle);
        this.quaternion.premultiply(yawQuat);

        this.quaternion.normalize();
        this.mouseMovementX = 0;
        this.mouseMovementY = 0;
    }

    // --- Keyboard roll (A/D, Left/Right) ---
    var rollDelta = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) rollDelta += this.rollSpeed * delta;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) rollDelta -= this.rollSpeed * delta;

    if (rollDelta !== 0) {
        var forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
        var rollQuat = new THREE.Quaternion().setFromAxisAngle(forward, rollDelta);
        this.quaternion.premultiply(rollQuat);
        this.quaternion.normalize();
    }

    // --- Keyboard yaw / rudder (Q/E) ---
    var yawDelta = 0;
    if (this.keys['KeyQ']) yawDelta += this.yawSpeed * delta;
    if (this.keys['KeyE']) yawDelta -= this.yawSpeed * delta;

    if (yawDelta !== 0) {
        var localUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);
        var rudderQuat = new THREE.Quaternion().setFromAxisAngle(localUp, yawDelta);
        this.quaternion.premultiply(rudderQuat);
        this.quaternion.normalize();
    }

    // --- Throttle (W/S, Up/Down) ---
    var boost = (this.keys['ShiftLeft'] || this.keys['ShiftRight']) ? this.boostMultiplier : 1;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) {
        this.targetSpeed = Math.min(this.targetSpeed + this.acceleration * delta, this.maxSpeed * boost);
    } else if (this.keys['KeyS'] || this.keys['ArrowDown']) {
        this.targetSpeed = Math.max(this.targetSpeed - this.deceleration * delta, this.minSpeed);
    }

    this.speed += (this.targetSpeed - this.speed) * Math.min(5 * delta, 1);

    // --- Altitude (R/F) ---
    if (this.keys['KeyR']) this.verticalSpeed += this.verticalAccel * delta;
    if (this.keys['KeyF']) this.verticalSpeed -= this.verticalAccel * delta;
    this.verticalSpeed *= Math.pow(0.93, delta * 60);

    // --- Auto-level (Space held) ---
    if (this.autoLevel) {
        var currentUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);
        var targetUp = new THREE.Vector3(0, 1, 0);
        var correction = new THREE.Quaternion().setFromUnitVectors(currentUp, targetUp);
        var t = Math.min(this.autoLevelSpeed * delta, 1);
        correction.slerp(new THREE.Quaternion(), 1 - t);
        this.quaternion.premultiply(correction);
        this.quaternion.normalize();
    }

    // --- Update position ---
    var fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
    this.position.addScaledVector(fwd, this.speed * delta * 60);
    this.position.y += this.verticalSpeed * delta * 60;

    if (this.position.y < this.minAltitude) {
        this.position.y = this.minAltitude;
        this.verticalSpeed = Math.max(this.verticalSpeed, 0);
    }

    // --- Apply to camera ---
    this.camera.position.copy(this.position);
    this.camera.quaternion.copy(this.quaternion);
};

FlightControls.prototype.getHeading = function () {
    var fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
    var heading = Math.atan2(fwd.x, -fwd.z) * 180 / Math.PI;
    return ((heading % 360) + 360) % 360;
};

FlightControls.prototype.getPitch = function () {
    var fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
    return Math.asin(Math.max(-1, Math.min(1, fwd.y))) * 180 / Math.PI;
};

FlightControls.prototype.getRoll = function () {
    var right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quaternion);
    return Math.asin(Math.max(-1, Math.min(1, right.y))) * 180 / Math.PI;
};

FlightControls.prototype.getSpeed = function () {
    return this.speed;
};

FlightControls.prototype.getAltitude = function () {
    return this.position.y;
};

FlightControls.prototype.resetTo = function (position, lookAt) {
    this.position.copy(position);
    this.speed = 0;
    this.targetSpeed = 0;
    this.verticalSpeed = 0;

    var tempCam = new THREE.PerspectiveCamera();
    tempCam.position.copy(position);
    tempCam.lookAt(lookAt);
    this.quaternion.copy(tempCam.quaternion);

    this.camera.position.copy(this.position);
    this.camera.quaternion.copy(this.quaternion);
};
