import * as THREE from 'three';

export const WEAPON_STATS = {
  pistol: {
    fireRate: 0.24,
    automatic: false,
    magazineSize: 18,
    pellets: 1,
    spread: 0.001,
    adsFovDelta: 8,
  },
  rifle: {
    fireRate: 0.09,
    automatic: true,
    magazineSize: 30,
    pellets: 1,
    spread: 0.0025,
    adsFovDelta: 10,
  },
  shotgun: {
    fireRate: 0.7,
    automatic: false,
    magazineSize: 8,
    pellets: 5,
    spread: 0.028,
    adsFovDelta: 6,
  },
  sniper: {
    fireRate: 1.0,
    automatic: false,
    magazineSize: 5,
    pellets: 1,
    spread: 0.0002,
    adsFovDelta: 14,
  },
};

function createMaterial(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.35,
    metalness: opts.metalness ?? 0.55,
    ...(opts.emissive ? { emissive: opts.emissive, emissiveIntensity: opts.emissiveIntensity ?? 0.35 } : {}),
  });
}

function chamferedBox(width, height, depth, bevel = 0.01) {
  const shape = new THREE.Shape();
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(bevel, w, h);
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel * 0.5,
    bevelSize: bevel * 0.5,
    bevelSegments: 2,
  });
}

export function buildWeapon(type = 'pistol') {
  const outerGroup = new THREE.Group();
  const innerGroup = new THREE.Group();

  const bodyDark = createMaterial('#1e2229', { roughness: 0.28, metalness: 0.65 });
  const bodyMid = createMaterial('#2d333c', { roughness: 0.32, metalness: 0.6 });
  const accent = createMaterial('#ff8a3d', { emissive: '#ff6a10', emissiveIntensity: 0.4, roughness: 0.4, metalness: 0.3 });
  const metal = createMaterial('#9aa3ae', { roughness: 0.18, metalness: 0.85 });
  const darkMetal = createMaterial('#40464f', { roughness: 0.22, metalness: 0.78 });
  const grip = createMaterial('#1a1d22', { roughness: 0.75, metalness: 0.1 });

  const add = (geometry, material, position, rotation = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.castShadow = true;
    innerGroup.add(mesh);
    return mesh;
  };

  if (type === 'pistol') {
    // Slide (upper receiver)
    add(new THREE.BoxGeometry(0.36, 0.13, 0.11), bodyDark, [0.02, 0.06, 0]);
    // Barrel
    add(new THREE.CylinderGeometry(0.025, 0.028, 0.28, 14), metal, [0.2, 0.04, 0], [0, 0, Math.PI / 2]);
    // Barrel shroud ring
    add(new THREE.CylinderGeometry(0.036, 0.036, 0.02, 14), darkMetal, [0.19, 0.04, 0], [0, 0, Math.PI / 2]);
    // Frame (lower receiver)
    add(new THREE.BoxGeometry(0.30, 0.08, 0.1), bodyMid, [0.0, -0.02, 0]);
    // Trigger guard
    add(new THREE.BoxGeometry(0.12, 0.06, 0.07), darkMetal, [0.0, -0.08, 0]);
    // Trigger
    add(new THREE.BoxGeometry(0.015, 0.04, 0.03), accent, [0.0, -0.06, 0]);
    // Grip
    add(chamferedBox(0.1, 0.22, 0.09, 0.012), grip, [-0.07, -0.2, -0.045], [0.18, 0, 0.1]);
    // Grip texture lines
    for (let i = 0; i < 3; i++) {
      add(new THREE.BoxGeometry(0.08, 0.008, 0.092), darkMetal, [-0.07, -0.13 - i * 0.04, -0.045], [0.18, 0, 0.1]);
    }
    // Rear sight
    add(new THREE.BoxGeometry(0.04, 0.03, 0.11), darkMetal, [-0.12, 0.14, 0]);
    // Front sight
    add(new THREE.BoxGeometry(0.015, 0.03, 0.015), accent, [0.15, 0.14, 0]);
    // Magazine base
    add(new THREE.BoxGeometry(0.07, 0.03, 0.07), darkMetal, [-0.07, -0.34, -0.025]);
    // Slide serrations (decorative lines)
    for (let i = 0; i < 4; i++) {
      add(new THREE.BoxGeometry(0.005, 0.13, 0.112), metal, [-0.08 - i * 0.02, 0.06, 0]);
    }
  } else if (type === 'rifle') {
    // Upper receiver
    add(new THREE.BoxGeometry(0.52, 0.13, 0.13), bodyDark, [0.08, 0.03, 0]);
    // Barrel
    add(new THREE.CylinderGeometry(0.022, 0.024, 0.65, 14), metal, [0.55, 0.02, 0], [0, 0, Math.PI / 2]);
    // Barrel shroud
    add(new THREE.CylinderGeometry(0.038, 0.038, 0.32, 14), darkMetal, [0.38, 0.02, 0], [0, 0, Math.PI / 2]);
    // Flash hider
    add(new THREE.CylinderGeometry(0.032, 0.026, 0.06, 14), metal, [0.87, 0.02, 0], [0, 0, Math.PI / 2]);
    // Handguard rails (top)
    add(new THREE.BoxGeometry(0.28, 0.025, 0.06), bodyMid, [0.38, 0.065, 0]);
    // Handguard rails (bottom)
    add(new THREE.BoxGeometry(0.28, 0.025, 0.06), bodyMid, [0.38, -0.025, 0]);
    // Handguard side rails
    add(new THREE.BoxGeometry(0.28, 0.05, 0.015), bodyMid, [0.38, 0.02, 0.065]);
    add(new THREE.BoxGeometry(0.28, 0.05, 0.015), bodyMid, [0.38, 0.02, -0.065]);
    // Lower receiver
    add(new THREE.BoxGeometry(0.22, 0.1, 0.12), bodyMid, [0.0, -0.06, 0]);
    // Magazine well
    add(new THREE.BoxGeometry(0.08, 0.22, 0.08), darkMetal, [0.0, -0.2, 0], [0.08, 0, 0]);
    // Magazine
    add(new THREE.BoxGeometry(0.065, 0.18, 0.065), accent, [0.0, -0.22, 0], [0.08, 0, 0]);
    // Trigger guard
    add(new THREE.BoxGeometry(0.1, 0.05, 0.06), darkMetal, [0.05, -0.12, 0]);
    // Trigger
    add(new THREE.BoxGeometry(0.012, 0.035, 0.025), accent, [0.04, -0.1, 0]);
    // Stock
    add(new THREE.BoxGeometry(0.32, 0.1, 0.1), bodyDark, [-0.32, 0.02, 0]);
    // Stock butt plate
    add(new THREE.BoxGeometry(0.03, 0.12, 0.12), grip, [-0.49, 0.02, 0]);
    // Optic mount
    add(new THREE.BoxGeometry(0.14, 0.035, 0.06), darkMetal, [0.1, 0.08, 0]);
    // Red dot sight body
    add(new THREE.BoxGeometry(0.07, 0.05, 0.05), bodyMid, [0.1, 0.115, 0]);
    // Red dot lens
    add(new THREE.BoxGeometry(0.005, 0.035, 0.035), createMaterial('#ff2222', { emissive: '#ff0000', emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.9 }), [0.135, 0.115, 0]);
    // Charging handle
    add(new THREE.BoxGeometry(0.04, 0.025, 0.04), metal, [-0.08, 0.06, 0]);
    // Forward grip
    add(chamferedBox(0.04, 0.1, 0.05, 0.008), grip, [0.3, -0.08, -0.025]);
  } else if (type === 'shotgun') {
    // Receiver
    add(new THREE.BoxGeometry(0.48, 0.16, 0.14), bodyDark, [0.04, 0.035, 0]);
    // Barrel
    add(new THREE.CylinderGeometry(0.03, 0.032, 0.55, 14), metal, [0.44, 0.06, 0], [0, 0, Math.PI / 2]);
    // Tube magazine (below barrel)
    add(new THREE.CylinderGeometry(0.028, 0.028, 0.42, 14), darkMetal, [0.36, -0.01, 0], [0, 0, Math.PI / 2]);
    // Barrel clamp
    add(new THREE.CylinderGeometry(0.042, 0.042, 0.02, 14), metal, [0.38, 0.03, 0], [0, 0, Math.PI / 2]);
    // Muzzle
    add(new THREE.CylinderGeometry(0.035, 0.03, 0.03, 14), metal, [0.72, 0.06, 0], [0, 0, Math.PI / 2]);
    // Pump/forend
    add(chamferedBox(0.16, 0.08, 0.1, 0.01), grip, [0.24, -0.01, -0.05]);
    // Pump grip lines
    for (let i = 0; i < 3; i++) {
      add(new THREE.BoxGeometry(0.01, 0.08, 0.102), darkMetal, [0.19 + i * 0.035, -0.01, -0.05]);
    }
    // Trigger guard
    add(new THREE.BoxGeometry(0.1, 0.05, 0.06), darkMetal, [0.0, -0.06, 0]);
    // Trigger
    add(new THREE.BoxGeometry(0.012, 0.035, 0.025), accent, [0.0, -0.04, 0]);
    // Stock
    add(chamferedBox(0.14, 0.28, 0.1, 0.015), grip, [-0.2, -0.18, -0.05], [0.22, 0, 0.12]);
    // Stock butt
    add(new THREE.BoxGeometry(0.14, 0.03, 0.1), darkMetal, [-0.25, -0.32, -0.01], [0.22, 0, 0.12]);
    // Ejection port
    add(new THREE.BoxGeometry(0.08, 0.06, 0.005), metal, [0.06, 0.035, 0.073]);
    // Bead sight
    add(new THREE.SphereGeometry(0.012, 10, 10), accent, [0.66, 0.1, 0]);
  } else {
    // Sniper — upper receiver
    add(new THREE.BoxGeometry(0.62, 0.13, 0.12), bodyDark, [0.1, 0.035, 0]);
    // Barrel
    add(new THREE.CylinderGeometry(0.02, 0.022, 0.85, 16), metal, [0.62, 0.02, 0], [0, 0, Math.PI / 2]);
    // Barrel fluting (decorative)
    add(new THREE.CylinderGeometry(0.028, 0.028, 0.5, 16), darkMetal, [0.46, 0.02, 0], [0, 0, Math.PI / 2]);
    // Muzzle brake
    add(new THREE.CylinderGeometry(0.03, 0.025, 0.08, 14), metal, [1.05, 0.02, 0], [0, 0, Math.PI / 2]);
    // Muzzle brake slots
    add(new THREE.BoxGeometry(0.008, 0.06, 0.06), darkMetal, [1.03, 0.02, 0]);
    add(new THREE.BoxGeometry(0.008, 0.06, 0.06), darkMetal, [1.07, 0.02, 0]);
    // Scope mount
    add(new THREE.BoxGeometry(0.18, 0.03, 0.06), darkMetal, [0.12, 0.07, 0]);
    // Scope tube
    add(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 16), bodyMid, [0.12, 0.12, 0], [0, 0, Math.PI / 2]);
    // Scope front lens
    add(new THREE.CylinderGeometry(0.04, 0.04, 0.015, 16), createMaterial('#3388ff', { emissive: '#2266cc', emissiveIntensity: 0.4, roughness: 0.08, metalness: 0.95 }), [0.24, 0.12, 0], [0, 0, Math.PI / 2]);
    // Scope rear lens
    add(new THREE.CylinderGeometry(0.032, 0.032, 0.01, 16), createMaterial('#3388ff', { emissive: '#2266cc', emissiveIntensity: 0.3, roughness: 0.08, metalness: 0.95 }), [0.0, 0.12, 0], [0, 0, Math.PI / 2]);
    // Scope adjustment turrets
    add(new THREE.CylinderGeometry(0.015, 0.015, 0.03, 10), darkMetal, [0.12, 0.16, 0]);
    add(new THREE.CylinderGeometry(0.015, 0.015, 0.03, 10), darkMetal, [0.12, 0.12, 0.04], [Math.PI / 2, 0, 0]);
    // Bolt handle
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 10), metal, [-0.05, 0.035, 0.06], [Math.PI / 2, 0, 0]);
    add(new THREE.SphereGeometry(0.018, 10, 10), metal, [-0.05, 0.035, 0.09]);
    // Lower receiver / trigger group
    add(new THREE.BoxGeometry(0.16, 0.08, 0.1), bodyMid, [0.0, -0.04, 0]);
    // Trigger guard
    add(new THREE.BoxGeometry(0.08, 0.045, 0.06), darkMetal, [0.02, -0.1, 0]);
    // Trigger
    add(new THREE.BoxGeometry(0.01, 0.03, 0.022), accent, [0.02, -0.08, 0]);
    // Magazine
    add(new THREE.BoxGeometry(0.06, 0.14, 0.06), darkMetal, [-0.02, -0.16, 0], [0.05, 0, 0]);
    // Stock
    add(new THREE.BoxGeometry(0.38, 0.1, 0.1), bodyDark, [-0.38, 0.025, 0]);
    // Cheek riser
    add(new THREE.BoxGeometry(0.14, 0.04, 0.08), bodyMid, [-0.28, 0.085, 0]);
    // Butt plate
    add(new THREE.BoxGeometry(0.03, 0.13, 0.12), grip, [-0.58, 0.025, 0]);
    // Bipod legs (folded under)
    add(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 8), darkMetal, [0.3, -0.06, 0.04], [0.3, 0, 0]);
    add(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 8), darkMetal, [0.3, -0.06, -0.04], [0.3, 0, 0]);
  }

  // Rotate the geometry -90 degrees so +X becomes -Z (forward)
  innerGroup.rotation.y = -Math.PI / 2;
  outerGroup.add(innerGroup);

  return outerGroup;
}
