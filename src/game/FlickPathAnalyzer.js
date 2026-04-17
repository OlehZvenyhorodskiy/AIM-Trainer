import * as THREE from 'three';

export class FlickPathAnalyzer {
  constructor(scene, maxPathLength = 200) {
    this.scene = scene;
    this.maxPathLength = maxPathLength;

    this.isRecording = false;
    this.currentPath = []; 
    this.pathHistory = []; 

    this.pathLine = null;
    this.markerGroup = new THREE.Group();
    scene.add(this.markerGroup);

    this.maxHistory = 10;
    this.lookPointer = { yaw: 0, pitch: 0 };
    this.lastPointer = null;
  }

  recordFrame(pointer, targetPosition, camera) {
    const now = performance.now();
    if (!this.isRecording) return;

    let angularVel = 0;
    if (this.lastPointer) {
      const yawDelta = Math.abs(this.normalizeAngle(pointer.yaw - this.lastPointer.yaw));
      const pitchDelta = Math.abs(pointer.pitch - this.lastPointer.pitch);
      angularVel = Math.sqrt(yawDelta * yawDelta + pitchDelta * pitchDelta);
    }

    const angularError = this.computeAngularError(pointer, targetPosition, camera);

    this.currentPath.push({
      timestamp: now,
      yaw: pointer.yaw,
      pitch: pointer.pitch,
      angularVelocity: angularVel,
      angularError,
    });

    if (this.currentPath.length > this.maxPathLength) {
      this.currentPath.shift();
    }

    this.lastPointer = { yaw: pointer.yaw, pitch: pointer.pitch };
  }

  startFlick(startPointer, targetPosition, camera) {
    this.isRecording = true;
    this.currentPath = [];
    this.lastPointer = null;
    this.flickStartTime = performance.now();
    this.flickTarget = targetPosition.clone();
    this.initialError = this.computeAngularError(startPointer, targetPosition, camera);
  }

  endFlick(hitSuccess) {
    this.isRecording = false;
    if (this.currentPath.length < 3) return null;

    const analysis = this.analyzePath(this.currentPath, hitSuccess);
    this.pathHistory.push({
      path: [...this.currentPath],
      analysis,
      hitSuccess,
      timestamp: performance.now(),
    });

    if (this.pathHistory.length > this.maxHistory) {
      this.pathHistory.shift();
    }

    this.visualizeLastPath();
    return analysis;
  }

  analyzePath(path, hitSuccess) {
    if (path.length < 3) return null;

    const errors = path.map(p => p.angularError);
    const velocities = path.map(p => p.angularVelocity);

    const minError = Math.min(...errors);
    
    let overshootAmount = 0;
    let correctionCount = 0;
    let lastDirection = 0;

    for (let i = 1; i < path.length; i++) {
      const errorDelta = errors[i] - errors[i - 1];
      const direction = Math.sign(errorDelta);
      if (direction !== 0 && direction !== lastDirection && lastDirection !== 0) {
        correctionCount++;
        if (errors[i - 1] > errors[0] * 0.5) {
          overshootAmount = Math.max(overshootAmount, errors[i - 1] - minError);
        }
      }
      if (direction !== 0) lastDirection = direction;
    }

    const accelerations = [];
    for (let i = 1; i < velocities.length; i++) {
      accelerations.push(velocities[i] - velocities[i - 1]);
    }
    const avgAccel = accelerations.reduce((a, b) => a + b, 0) / accelerations.length;
    const accelVariance = accelerations.reduce((sum, a) => sum + (a - avgAccel) ** 2, 0) / accelerations.length;
    const smoothnessScore = 1 / (1 + Math.sqrt(accelVariance) * 10);

    const threshold = 0.05; 
    let timeToAcquire = null;
    for (let i = 0; i < errors.length; i++) {
      if (errors[i] < threshold) {
        timeToAcquire = path[i].timestamp - path[0].timestamp;
        break;
      }
    }

    return {
      overshootAmount,
      overshootRatio: this.initialError > 0 ? overshootAmount / this.initialError : 0,
      correctionCount,
      smoothnessScore,
      timeToAcquire,
      minError,
      initialError: this.initialError,
      pathEfficiency: this.initialError > 0 
        ? this.initialError / this.computePathLength(path) 
        : 1,
      avgVelocity: velocities.reduce((a, b) => a + b, 0) / velocities.length,
      hitSuccess,
    };
  }

  computePathLength(path) {
    let length = 0;
    for (let i = 1; i < path.length; i++) {
      const dy = this.normalizeAngle(path[i].yaw - path[i - 1].yaw);
      const dp = path[i].pitch - path[i - 1].pitch;
      length += Math.sqrt(dy * dy + dp * dp);
    }
    return length;
  }

  visualizeLastPath() {
    while (this.markerGroup.children.length > 0) {
      const child = this.markerGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      this.markerGroup.remove(child);
    }

    if (this.pathHistory.length === 0) return;

    const lastPath = this.pathHistory[this.pathHistory.length - 1];
    const path = lastPath.path;

    const distance = 5;
    const points = path.map(p => {
      const x = distance * Math.sin(p.yaw) * Math.cos(p.pitch);
      const y = distance * Math.sin(p.pitch);
      const z = -distance * Math.cos(p.yaw) * Math.cos(p.pitch);
      return new THREE.Vector3(x, y, z);
    });

    const colors = points.map((_, i) => {
      const t = i / points.length;
      return new THREE.Color(1 - t, t, 0); 
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(
      colors.flatMap(c => [c.r, c.g, c.b]), 3
    ));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
    });

    this.pathLine = new THREE.Line(geometry, material);
    this.markerGroup.add(this.pathLine);

    const analysis = lastPath.analysis;
    if (analysis && analysis.overshootAmount > 0.02) {
      const overshootGeom = new THREE.SphereGeometry(0.08, 8, 8);
      const overshootMat = new THREE.MeshBasicMaterial({
        color: 0xff4444,
        transparent: true,
        opacity: 0.6,
      });
      const overshootMarker = new THREE.Mesh(overshootGeom, overshootMat);
      const peakIdx = path.findIndex(p => p.angularError === analysis.minError + analysis.overshootAmount);
      if (peakIdx >= 0) {
        overshootMarker.position.copy(points[peakIdx]);
        this.markerGroup.add(overshootMarker);
      }
    }

    setTimeout(() => {
      this.fadeOutVisualization();
    }, 3000);
  }

  fadeOutVisualization() {
    if (!this.pathLine) return;
    const mat = this.pathLine.material;
    let opacity = 0.8;
    const fade = setInterval(() => {
      opacity -= 0.05;
      mat.opacity = Math.max(0, opacity);
      if (opacity <= 0) {
        clearInterval(fade);
        this.markerGroup.clear();
        this.pathLine = null;
      }
    }, 50);
  }

  computeAngularError(pointer, targetPos, camera) {
    const offset = targetPos.clone().sub(camera.position);
    const targetYaw = Math.atan2(offset.x, -offset.z);
    const targetPitch = Math.atan2(offset.y, Math.hypot(offset.x, offset.z));
    return Math.hypot(
      this.normalizeAngle(targetYaw - pointer.yaw),
      targetPitch - pointer.pitch
    );
  }

  normalizeAngle(angle) {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
  }

  dispose() {
    this.markerGroup.clear();
    this.scene.remove(this.markerGroup);
  }
}
