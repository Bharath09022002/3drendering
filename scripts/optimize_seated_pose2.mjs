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

  // Torso lean 10 degrees forward (-0.174 rad)
  bones['mixamorigSpine1'].rotation.x = -0.174;
  bones['mixamorigSpine2'].rotation.x = -0.05;

  // Let's optimize Left Leg:
  // Thigh points forward and slightly down: rx in [-1.5, -0.6], ry, rz
  // Knee bends: kneeX in [1.2, 2.5]
  // Foot ankle angles
  const targetFoot = new THREE.Vector3(0.14, 0.395, 0.14);

  let bestLegErr = 999;
  let bestLeg = null;

  for (let rx = -1.4; rx <= -0.7; rx += 0.02) {
    for (let ry = -0.2; ry <= 0.2; ry += 0.05) {
      for (let rz = -0.2; rz <= 0.2; rz += 0.05) {
        for (let k = 1.2; k <= 2.2; k += 0.02) {
          bones['mixamorigLeftUpLeg'].rotation.set(rx, ry, rz);
          bones['mixamorigLeftLeg'].rotation.set(k, 0, 0);
          root.updateMatrixWorld(true);

          const footPos = new THREE.Vector3();
          bones['mixamorigLeftFoot'].getWorldPosition(footPos);
          const err = footPos.distanceTo(targetFoot);
          if (err < bestLegErr) {
            bestLegErr = err;
            bestLeg = { rx, ry, rz, k, footPos: footPos.clone() };
          }
        }
      }
    }
  }

  console.log('Optimized Left Leg:', bestLeg, 'err:', bestLegErr);

  // Optimize Left Arm to grip [0.31, 1.24, 0.32]
  // In Mixamo, LeftArm has shoulder. Let's adjust LeftShoulder and LeftArm
  const targetGrip = new THREE.Vector3(0.31, 1.24, 0.32);
  let bestArmErr = 999;
  let bestArm = null;

  for (let sx = -0.3; sx <= 0.3; sx += 0.1) {
    for (let sy = -0.3; sy <= 0.3; sy += 0.1) {
      for (let sz = -0.3; sz <= 0.3; sz += 0.1) {
        bones['mixamorigLeftShoulder'].rotation.set(sx, sy, sz);
        for (let ax = -1.4; ax <= -0.4; ax += 0.05) {
          for (let ay = -0.6; ay <= 0.6; ay += 0.05) {
            for (let az = -0.8; az <= 0.0; az += 0.05) {
              for (let ex = -1.2; ex <= 0.5; ex += 0.05) {
                bones['mixamorigLeftArm'].rotation.set(ax, ay, az);
                bones['mixamorigLeftForeArm'].rotation.set(ex, 0, 0);
                root.updateMatrixWorld(true);

                const handPos = new THREE.Vector3();
                bones['mixamorigLeftHand'].getWorldPosition(handPos);
                const err = handPos.distanceTo(targetGrip);
                if (err < bestArmErr) {
                  bestArmErr = err;
                  bestArm = { sx, sy, sz, ax, ay, az, ex, handPos: handPos.clone() };
                }
              }
            }
          }
        }
      }
    }
  }

  console.log('Optimized Left Arm:', bestArm, 'err:', bestArmErr);
});
