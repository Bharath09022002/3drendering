import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const glbBuffer = fs.readFileSync('public/assets/glb/character.glb');
new GLTFLoader().parse(glbBuffer.buffer, '', (gltf) => {
  const root = new THREE.Group();
  root.add(gltf.scene);

  const bones = {};
  gltf.scene.traverse((c) => {
    if (c.isBone) bones[c.name] = c;
  });

  const scale = 1.72 * (0.56 / 0.45) / 1.8093; // 1.18302
  root.scale.set(scale, scale, scale);
  const rootY = 0.82 - (1.03991 * scale);
  const rootZ = -0.16 - (0.02076 * scale);
  root.position.set(0, rootY, rootZ);

  // Spine & Chest
  bones['mixamorigSpine1'].rotation.x = -0.174; // 10 deg forward
  bones['mixamorigSpine2'].rotation.x = -0.05;
  bones['mixamorigHead'].rotation.x = 0.18;

  // Let's test arms reaching to gripAnchors:
  // In scooter space: GripL is [-0.31, 1.24, 0.32], GripR is [0.31, 1.24, 0.32]
  // In character space: Left arm is +X, Right arm is -X.
  // So Left Hand goes to [0.31, 1.24, 0.32] and Right Hand goes to [-0.31, 1.24, 0.32]!
  
  // Clavicles (shoulders) slight forward tilt:
  if (bones['mixamorigLeftShoulder']) {
    bones['mixamorigLeftShoulder'].rotation.set(-0.15, 0.10, -0.10);
  }
  if (bones['mixamorigRightShoulder']) {
    bones['mixamorigRightShoulder'].rotation.set(-0.15, -0.10, 0.10);
  }

  // Arms:
  // Shoulder to hand reach
  // In rest pose, arm is along +X for Left, -X for Right.
  // We want the arm to reach forward (+Z), down (-Y) and inward toward center (X ~ 0.31).
  bones['mixamorigLeftArm'].rotation.set(-0.75, -0.35, -0.85);
  bones['mixamorigRightArm'].rotation.set(-0.75, 0.35, 0.85);

  bones['mixamorigLeftForeArm'].rotation.set(-0.25, 0.20, -0.15);
  bones['mixamorigRightForeArm'].rotation.set(-0.25, -0.20, 0.15);

  root.updateMatrixWorld(true);

  const handL = new THREE.Vector3();
  const handR = new THREE.Vector3();
  bones['mixamorigLeftHand'].getWorldPosition(handL);
  bones['mixamorigRightHand'].getWorldPosition(handR);

  console.log('Left Hand world pos: ', handL, 'Target: [0.31, 1.24, 0.32]');
  console.log('Right Hand world pos:', handR, 'Target: [-0.31, 1.24, 0.32]');
});
