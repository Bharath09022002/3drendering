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
  bones['mixamorigLeftUpLeg'].rotation.set(-1.38, 0.10, 0.10);
  bones['mixamorigRightUpLeg'].rotation.set(-1.38, -0.10, -0.10);
  bones['mixamorigLeftLeg'].rotation.set(1.48, 0, 0);
  bones['mixamorigRightLeg'].rotation.set(1.48, 0, 0);
  bones['mixamorigLeftFoot'].rotation.set(-0.16, 0, 0);
  bones['mixamorigRightFoot'].rotation.set(-0.16, 0, 0);
  bones['mixamorigHead'].rotation.x = 0.18;

  root.updateMatrixWorld(true);

  // Measure bounding box of character
  const box = new THREE.Box3().setFromObject(root);
  console.log('Seated rider bounding box:');
  console.log('Min:', box.min);
  console.log('Max:', box.max);
  console.log('Size:', box.getSize(new THREE.Vector3()));
});
