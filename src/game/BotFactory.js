import * as THREE from 'three';

function partMesh(geometry, color, position) {
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.72,
      metalness: 0.08,
    }),
  );
  mesh.position.copy(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createBot() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const parts = {
    head: partMesh(new THREE.SphereGeometry(0.2, 18, 18), '#ff9b63', new THREE.Vector3(0, 1.58, 0)),
    neck: partMesh(new THREE.BoxGeometry(0.1, 0.15, 0.1), '#2d3138', new THREE.Vector3(0, 1.34, 0)),
    torso: partMesh(new THREE.BoxGeometry(0.5, 0.7, 0.25), '#20345a', new THREE.Vector3(0, 0.9, 0)),
    leftUpperArm: partMesh(new THREE.BoxGeometry(0.15, 0.4, 0.15), '#666c77', new THREE.Vector3(-0.37, 1.02, 0)),
    rightUpperArm: partMesh(new THREE.BoxGeometry(0.15, 0.4, 0.15), '#666c77', new THREE.Vector3(0.37, 1.02, 0)),
    leftLowerArm: partMesh(new THREE.BoxGeometry(0.12, 0.35, 0.12), '#666c77', new THREE.Vector3(-0.37, 0.66, 0)),
    rightLowerArm: partMesh(new THREE.BoxGeometry(0.12, 0.35, 0.12), '#666c77', new THREE.Vector3(0.37, 0.66, 0)),
    leftHand: partMesh(new THREE.SphereGeometry(0.1, 12, 12), '#f0c5a3', new THREE.Vector3(-0.37, 0.44, 0)),
    rightHand: partMesh(new THREE.SphereGeometry(0.1, 12, 12), '#f0c5a3', new THREE.Vector3(0.37, 0.44, 0)),
    leftUpperLeg: partMesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), '#20345a', new THREE.Vector3(-0.13, 0.27, 0)),
    rightUpperLeg: partMesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), '#20345a', new THREE.Vector3(0.13, 0.27, 0)),
    leftLowerLeg: partMesh(new THREE.BoxGeometry(0.16, 0.45, 0.16), '#2d3138', new THREE.Vector3(-0.13, -0.24, 0)),
    rightLowerLeg: partMesh(new THREE.BoxGeometry(0.16, 0.45, 0.16), '#2d3138', new THREE.Vector3(0.13, -0.24, 0)),
    leftFoot: partMesh(new THREE.BoxGeometry(0.15, 0.1, 0.3), '#14181f', new THREE.Vector3(-0.13, -0.53, 0.08)),
    rightFoot: partMesh(new THREE.BoxGeometry(0.15, 0.1, 0.3), '#14181f', new THREE.Vector3(0.13, -0.53, 0.08)),
  };

  Object.entries(parts).forEach(([name, mesh]) => {
    const hitPart = name === 'head' ? 'head' : 'body';
    mesh.userData.hitPart = hitPart;
    mesh.userData.hitbox = true;
    mesh.userData.defaultPosition = mesh.position.clone();
    body.add(mesh);
  });

  root.userData.parts = parts;
  root.userData.hitboxes = Object.values(parts);
  root.userData.defaultRotation = root.rotation.clone();
  root.userData.defaultPosition = root.position.clone();
  return root;
}
