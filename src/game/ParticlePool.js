import * as THREE from 'three';

export class ParticlePool {
  constructor(scene, size = 60) {
    this.scene = scene;
    this.particles = [];

    const geometry = new THREE.SphereGeometry(0.03, 8, 8);

    for (let index = 0; index < size; index += 1) {
      const material = new THREE.MeshStandardMaterial({
        color: '#ff6644',
        emissive: '#552211',
        transparent: true,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0.3,
      });
    }
  }

  burst(position, color = '#ff6644') {
    let spawned = 0;
    for (const particle of this.particles) {
      if (particle.life > 0) continue;
      particle.mesh.visible = true;
      particle.mesh.position.copy(position);
      particle.mesh.material.color.set(color);
      particle.mesh.material.emissive.set(color).multiplyScalar(0.4);
      particle.mesh.material.opacity = 1;
      particle.velocity.set(
        (Math.random() - 0.5) * 3,
        Math.random() * 2.5,
        (Math.random() - 0.5) * 3,
      );
      particle.life = particle.maxLife;
      spawned += 1;
      if (spawned >= 12) break;
    }
  }

  update(delta) {
    for (const particle of this.particles) {
      if (particle.life <= 0) continue;
      particle.life -= delta;
      particle.velocity.y -= 4.8 * delta;
      particle.mesh.position.addScaledVector(particle.velocity, delta);
      particle.mesh.material.opacity = Math.max(particle.life / particle.maxLife, 0);
      if (particle.life <= 0) {
        particle.mesh.visible = false;
      }
    }
  }

  dispose() {
    for (const particle of this.particles) {
      this.scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      particle.mesh.material.dispose();
    }
  }
}
