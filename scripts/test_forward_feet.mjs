import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const glbBuffer = fs.readFileSync('public/assets/glb/character.glb');
new GLTFLoader().parse(glbBuffer.buffer, '', (gltf) => {
  const root = new THREE.Group();
  root.add(gltf.scene);
  const bones = {};
  gltf.scene.traverse((c) => { if (c.isBone) bones[c.name] = c; });

  const scale = 1.72 * (0.56 / 0.45) / 1.8093; // 1.18302
  root.scale.set(scale, scale, scale);
  const rootY = 0.82 - (1.03991 * scale);
  const rootZ = -0.16 - (0.02076 * scale);
  root.position.set(0, rootY, rootZ);

  bones['mixamorigSpine1'].rotation.x = -0.174;
  bones['mixamorigSpine2'].rotation.x = -0.05;

  // Let's test knee angles where the foot lands on the footboard (y >= 0.38)
  for (let rx of [-1.55, -1.60, -1.65, -1.70]) {
    for (let kx of [0.8, 0.9, 1.0, 1.1]) {
      bones['mixamorigLeftUpLeg'].rotation.set(rx, 0.05, 0.12);
      bones['mixamorigLeftLeg'].rotation.set(kx, 0, 0);
      root.updateMatrixWorld(true);

      const knee = new THREE.Vector3();
      const ankle = new THREE.Vector3();
      bones['mixamorigLeftLeg'].getWorldPosition(knee);
      bones['mixamorigLeftFoot'].getWorldPosition(ankle);

      console.log(`rx=${rx} kx=${kx} -> knee:[${knee.y.toFixed(2)}, ${knee.z.toFixed(2)}] ankle:[${ankle.x.toFixed(2)}, ${ankle.y.toFixed(2)}, ${ankle.z.toFixed(2)}]`);
    }
  }
});
