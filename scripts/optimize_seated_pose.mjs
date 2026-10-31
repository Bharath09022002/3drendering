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

  const scale = 1.72 * (0.56 / 0.45) / 1.8093; // ~1.18302
  root.scale.set(scale, scale, scale);

  // Position rider container so hips is at [0, 0.82, -0.16]
  const rootY = 0.82 - (1.03991 * scale);
  const rootZ = -0.16 - (0.02076 * scale);
  root.position.set(0, rootY, rootZ);

  // Torso lean 10 degrees forward (-0.174 rad)
  bones['mixamorigSpine1'].rotation.x = -0.174;
  bones['mixamorigSpine2'].rotation.x = -0.05;

  // Let's test leg angles
  // Goal: Foot joint at Y ~ 0.395, Z ~ 0.14
  // We can do a grid search for UpLeg rotation.x, rotation.y, rotation.z, and Leg rotation.x
  let bestLegErr = 999;
  let bestLegAngles = null;
  const targetFoot = new THREE.Vector3(0.14, 0.395, 0.14);

  for (let rx = -1.6; rx <= -0.8; rx += 0.05) {
    for (let rz = 0.0; rz <= 0.3; rz += 0.05) {
      for (let kneeX = 0.6; kneeX <= 1.6; kneeX += 0.05) {
        bones['mixamorigLeftUpLeg'].rotation.set(rx, 0, rz);
        bones['mixamorigLeftLeg'].rotation.set(kneeX, 0, 0);
        root.updateMatrixWorld(true);

        const footPos = new THREE.Vector3();
        bones['mixamorigLeftFoot'].getWorldPosition(footPos);
        const err = footPos.distanceTo(targetFoot);
        if (err < bestLegErr) {
          bestLegErr = err;
          bestLegAngles = { rx, rz, kneeX, footPos: footPos.clone() };
        }
      }
    }
  }

  console.log('Best Leg Angles:', bestLegAngles, 'err:', bestLegErr);

  // Goal: Hand joint at Y ~ 1.24, Z ~ 0.32, X ~ 0.31
  let bestArmErr = 999;
  let bestArmAngles = null;
  const targetHand = new THREE.Vector3(0.31, 1.24, 0.32);

  for (let ax = -1.6; ax <= -0.6; ax += 0.05) {
    for (let ay = -0.5; ay <= 0.5; ay += 0.05) {
      for (let az = -0.8; az <= 0.0; az += 0.05) {
        for (let elbowX = -1.2; elbowX <= 0.2; elbowX += 0.05) {
          bones['mixamorigLeftArm'].rotation.set(ax, ay, az);
          bones['mixamorigLeftForeArm'].rotation.set(elbowX, 0, 0);
          root.updateMatrixWorld(true);

          const handPos = new THREE.Vector3();
          bones['mixamorigLeftHand'].getWorldPosition(handPos);
          const err = handPos.distanceTo(targetHand);
          if (err < bestArmErr) {
            bestArmErr = err;
            bestArmAngles = { ax, ay, az, elbowX, handPos: handPos.clone() };
          }
        }
      }
    }
  }

  console.log('Best Arm Angles:', bestArmAngles, 'err:', bestArmErr);
});
