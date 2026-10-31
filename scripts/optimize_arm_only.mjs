import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const glbBuffer = fs.readFileSync('public/assets/glb/character.glb');
new GLTFLoader().parse(glbBuffer.buffer, '', (gltf) => {
  const root = new THREE.Group();
  root.add(gltf.scene);
  const bones = {};
  gltf.scene.traverse((c) => { if (c.isBone) bones[c.name] = c; });

  const scale = 1.72 * (0.56 / 0.45) / 1.8093;
  root.scale.set(scale, scale, scale);
  const rootY = 0.82 - (1.03991 * scale);
  const rootZ = -0.16 - (0.02076 * scale);
  root.position.set(0, rootY, rootZ);

  bones['mixamorigSpine1'].rotation.x = -0.174;
  bones['mixamorigSpine2'].rotation.x = -0.05;
  bones['mixamorigHead'].rotation.x = 0.18;

  const targetHand = new THREE.Vector3(0.31, 1.24, 0.32);
  let bestErr = 999;
  let best = null;

  for (let shZ = -0.3; shZ <= 0.0; shZ += 0.05) {
    bones['mixamorigLeftShoulder'].rotation.set(-0.15, 0.10, shZ);
    for (let rx = -1.2; rx <= -0.4; rx += 0.04) {
      for (let ry = -0.8; ry <= -0.1; ry += 0.04) {
        for (let rz = -1.4; rz <= -0.6; rz += 0.04) {
          for (let fx = -0.6; fx <= 0.4; fx += 0.05) {
            bones['mixamorigLeftArm'].rotation.set(rx, ry, rz);
            bones['mixamorigLeftForeArm'].rotation.set(fx, 0, 0);
            root.updateMatrixWorld(true);

            const hand = new THREE.Vector3();
            bones['mixamorigLeftHand'].getWorldPosition(hand);
            const err = hand.distanceTo(targetHand);
            if (err < bestErr) {
              bestErr = err;
              best = { shZ, rx, ry, rz, fx, hand: hand.clone(), err };
            }
          }
        }
      }
    }
  }

  console.log('Best Arm Pose:', best);
});
