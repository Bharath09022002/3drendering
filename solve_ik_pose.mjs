// solve_ik_pose.mjs
import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const buf = fs.readFileSync('src/assets/glb/character.glb');
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

const loader = new GLTFLoader();
loader.parse(ab, '', (gltf) => {
  const root = gltf.scene;
  const riderScale = 1.183;
  const bones = {};
  root.traverse(n => {
    if (n.isBone) bones[n.name] = n;
  });

  const SCOOTER_ANCHORS = {
    seatAnchor: new THREE.Vector3(0, 0.38, -0.16),
    footAnchorL: new THREE.Vector3(-0.14, -0.065, 0.12),
    gripAnchorL: new THREE.Vector3(-0.31, 0.78, 0.32),
  };

  root.position.set(0, 0.38 - 1.040 * riderScale, -0.16 - 0.021 * riderScale);
  root.scale.setScalar(riderScale);

  // We want LeftHand to reach gripAnchorL [-0.31, 0.78, 0.32]
  // Test angles for LeftArm and LeftForeArm
  let bestDist = 999;
  let bestArmRot = null;
  let bestForeRot = null;

  for (let rx = -1.6; rx <= -0.5; rx += 0.1) {
    for (let ry = -1.2; ry <= 0.2; ry += 0.1) {
      for (let rz = -2.2; rz <= -0.5; rz += 0.1) {
        bones.mixamorigLeftArm.rotation.set(rx, ry, rz);
        bones.mixamorigLeftForeArm.rotation.set(0, -0.6, -0.8);
        root.updateMatrixWorld(true);

        const wHand = new THREE.Vector3();
        bones.mixamorigLeftHand.getWorldPosition(wHand);
        const d = wHand.distanceTo(SCOOTER_ANCHORS.gripAnchorL);
        if (d < bestDist) {
          bestDist = d;
          bestArmRot = [rx, ry, rz];
          bestForeRot = [0, -0.6, -0.8];
        }
      }
    }
  }

  console.log(`Best Hand distance: ${bestDist.toFixed(4)}m`);
  console.log(`Best Arm rot:`, bestArmRot);
});
