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

  // Let's test knee and foot angles:
  // Target: Foot/Toe planted on footboard at [0.14, 0.395, 0.14]
  // In our earlier calculation, the ankle is at y ~ 0.495.
  // The footboard surface is at y = 0.395, length z in [-0.18, 0.34], width x in [-0.21, 0.21].
  
  // Let's test various hip and knee angles to see the whole leg geometry
  for (let hx of [-1.30, -1.35, -1.40, -1.45, -1.50]) {
    for (let kx of [1.20, 1.30, 1.40, 1.50, 1.60]) {
      bones['mixamorigLeftUpLeg'].rotation.set(hx, 0.08, 0.06);
      bones['mixamorigLeftLeg'].rotation.set(kx, 0, 0);
      bones['mixamorigLeftFoot'].rotation.set(-hx - kx + 1.57, 0, 0); // Ankle keeps foot flat
      root.updateMatrixWorld(true);

      const knee = new THREE.Vector3();
      const ankle = new THREE.Vector3();
      const toe = new THREE.Vector3();
      bones['mixamorigLeftLeg'].getWorldPosition(knee);
      bones['mixamorigLeftFoot'].getWorldPosition(ankle);
      if (bones['mixamorigLeftToeBase']) {
        bones['mixamorigLeftToeBase'].getWorldPosition(toe);
      }

      console.log(`hx=${hx} kx=${kx} -> knee:[${knee.y.toFixed(2)}, ${knee.z.toFixed(2)}] ankle:[${ankle.y.toFixed(2)}, ${ankle.z.toFixed(2)}]`);
    }
  }
});
