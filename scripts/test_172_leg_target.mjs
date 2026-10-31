import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const glbBuffer = fs.readFileSync('public/assets/glb/character.glb');
new GLTFLoader().parse(glbBuffer.buffer, '', (gltf) => {
  const root = new THREE.Group();
  root.add(gltf.scene);
  const bones = {};
  gltf.scene.traverse((c) => { if (c.isBone) bones[c.name] = c; });

  const scale = 1.72 / 1.8093; // 0.9506
  root.scale.set(scale, scale, scale);
  const rootY = 0.82 - (1.03991 * scale);
  const rootZ = -0.16 - (0.02076 * scale);
  root.position.set(0, rootY, rootZ);

  bones['mixamorigSpine1'].rotation.x = -0.174;
  bones['mixamorigSpine2'].rotation.x = -0.05;

  const target = new THREE.Vector3(0.14, 0.395, 0.14);
  let bestErr = 999;
  let best = null;

  for (let rx = -1.6; rx <= -0.8; rx += 0.02) {
    for (let rz = 0.0; rz <= 0.25; rz += 0.02) {
      for (let kx = 0.8; kx <= 1.8; kx += 0.02) {
        bones['mixamorigLeftUpLeg'].rotation.set(rx, 0, rz);
        bones['mixamorigLeftLeg'].rotation.set(kx, 0, 0);
        root.updateMatrixWorld(true);

        const foot = new THREE.Vector3();
        bones['mixamorigLeftFoot'].getWorldPosition(foot);

        const err = foot.distanceTo(target);
        if (err < bestErr) {
          bestErr = err;
          best = { rx, rz, kx, foot: foot.clone(), err };
        }
      }
    }
  }

  console.log('Scale 0.95 best foot match:', best);
});
