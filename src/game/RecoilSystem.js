import * as THREE from 'three';

const RECOIL_PATTERNS = {
  rifle: {
    vertical: [
      0, -0.8, -1.2, -1.6, -2.0, -2.2, -2.4, -2.3, -2.1, -1.9,
      -1.8, -1.7, -1.6, -1.5, -1.4, -1.3, -1.2, -1.1, -1.0, -0.9,
      -0.8, -0.7, -0.6, -0.5, -0.4, -0.3, -0.3, -0.2, -0.2, -0.1,
    ],
    horizontal: [
      0, 0.1, 0.3, 0.5, 0.7, 0.4, 0.0, -0.3, -0.6, -0.8,
      -0.5, -0.2, 0.1, 0.4, 0.6, 0.3, 0.0, -0.2, -0.4, -0.3,
      -0.1, 0.1, 0.2, 0.1, 0.0, -0.1, -0.1, 0.0, 0.0, 0.0,
    ],
    recoverySpeed: 3.5,
    randomSpread: 0.08,
    adsMultiplier: 0.65,
  },
  pistol: {
    vertical: [0, -0.6, -0.5, -0.4],
    horizontal: [0, 0.1, -0.1],
    recoverySpeed: 6.0,
    randomSpread: 0.15,
    adsMultiplier: 0.8,
  },
  shotgun: {
    vertical: [0, -1.5],
    horizontal: [0, 0],
    recoverySpeed: 4.0,
    randomSpread: 0.3,
    adsMultiplier: 0.7,
  },
  sniper: {
    vertical: [0, -2.0],
    horizontal: [0, 0],
    recoverySpeed: 2.0,
    randomSpread: 0.05,
    adsMultiplier: 0.5,
  },
};

export class RecoilSystem {
  constructor() {
    this.shotIndex = 0;
    this.accumulatedRecoil = new THREE.Vector2(0, 0);
    this.isRecovering = false;
    this.lastShotTime = 0;
    this.currentPattern = null;
  }

  setWeapon(weaponType) {
    this.currentPattern = RECOIL_PATTERNS[weaponType] || RECOIL_PATTERNS.rifle;
    this.shotIndex = 0;
    this.accumulatedRecoil.set(0, 0);
  }

  fire(isADS = false) {
    if (!this.currentPattern) return new THREE.Vector2(0, 0);

    const pattern = this.currentPattern;
    const idx = Math.min(this.shotIndex, pattern.vertical.length - 1);

    let verticalRecoil = pattern.vertical[idx] || 0;
    let horizontalRecoil = pattern.horizontal[idx] || 0;

    if (isADS) {
      verticalRecoil *= pattern.adsMultiplier;
      horizontalRecoil *= pattern.adsMultiplier;
    }

    const randomYaw = (Math.random() - 0.5) * 2 * pattern.randomSpread;
    const randomPitch = (Math.random() - 0.5) * 2 * pattern.randomSpread;

    verticalRecoil += randomPitch;
    horizontalRecoil += randomYaw;

    this.accumulatedRecoil.x += horizontalRecoil;
    this.accumulatedRecoil.y += verticalRecoil;

    this.shotIndex++;
    this.lastShotTime = performance.now();
    this.isRecovering = false;

    return new THREE.Vector2(horizontalRecoil, verticalRecoil);
  }

  update(delta) {
    if (!this.currentPattern) return;

    const timeSinceShot = (performance.now() - this.lastShotTime) / 1000;
    const pattern = this.currentPattern;

    if (timeSinceShot > 0.15) {
      this.isRecovering = true;
    }

    if (this.isRecovering) {
      const recoveryRate = pattern.recoverySpeed * delta;
      this.accumulatedRecoil.x *= Math.max(0, 1 - recoveryRate * 0.5);
      this.accumulatedRecoil.y *= Math.max(0, 1 - recoveryRate);

      if (Math.abs(this.accumulatedRecoil.y) < 0.01) {
        this.shotIndex = 0;
        this.accumulatedRecoil.set(0, 0);
        this.isRecovering = false;
      }
    }
  }

  reset() {
    this.shotIndex = 0;
    this.accumulatedRecoil.set(0, 0);
    this.isRecovering = false;
  }
}
