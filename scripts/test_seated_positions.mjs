import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const glbBuffer = fs.readFileSync('public/assets/glb/character.glb');
new GLTFLoader().parse(glbBuffer.buffer, '', (gltf) => {
  const root = new THREE.Group();
  root.name = 'rider-container';
  root.add(gltf.scene);

  const bones = {};
  gltf.scene.traverse((c) => {
    if (c.isBone) bones[c.name] = c;
  });

  const scale = 1.72 * (0.56 / 0.45) / 1.8093; // 1.18302
  root.scale.set(scale, scale, scale);

  // Position rider container so hips is at [0, 0.82, -0.16]
  const rootY = 0.82 - (1.03991 * scale);
  const rootZ = -0.16 - (0.02076 * scale);
  root.position.set(0, rootY, rootZ);

  // Set seated pose
  if (bones['mixamorigSpine1']) bones['mixamorigSpine1'].rotation.x = -0.174; // -10 deg
  if (bones['mixamorigSpine2']) bones['mixamorigSpine2'].rotation.x = -0.05;

  if (bones['mixamorigLeftUpLeg']) bones['mixamorigLeftUpLeg'].rotation.set(-1.38, 0.10, 0.10);
  if (bones['mixamorigRightUpLeg']) bones['mixamorigRightUpLeg'].rotation.set(-1.38, -0.10, -0.10);

  if (bones['mixamorigLeftLeg']) bones['mixamorigLeftLeg'].rotation.set(1.48, 0, 0);
  if (bones['mixamorigRightLeg']) bones['mixamorigRightLeg'].rotation.set(1.48, 0, 0);

  if (bones['mixamorigLeftFoot']) bones['mixamorigLeftFoot'].rotation.set(-0.16, 0, 0);
  if (bones['mixamorigRightFoot']) bones['mixamorigRightFoot'].rotation.set(-0.16, 0, 0);

  if (bones['mixamorigLeftArm']) bones['mixamorigLeftArm'].rotation.set(-1.18, 0.28, -0.32);
  if (bones['mixamorigRightArm']) bones['mixamorigRightArm'].rotation.set(-1.18, -0.28, 0.32);

  if (bones['mixamorigLeftForeArm']) bones['mixamorigLeftForeArm'].rotation.set(-0.35, 0.15, 0);
  if (bones['mixamorigRightForeArm']) bones['mixamorigRightForeArm'].rotation.set(-0.35, -0.15, 0);

  if (bones['mixamorigHead']) bones['mixamorigHead'].rotation.x = 0.18;

  root.updateMatrixWorld(true);

  const getWPos = (boneName) => {
    const v = new THREE.Vector3();
    if (bones[boneName]) bones[boneName].getWorldPosition(v);
    return v;
  };

  console.log('--- Rider Joint World Positions in Scooter Local Space ---');
  console.log('Hips:       ', getWPos('mixamorigHips'));
  console.log('LeftUpLeg:  ', getWPos('mixamorigLeftUpLeg'));
  console.log('LeftLeg:    ', getWPos('mixamorigLeftLeg'));
  console.log('LeftFoot:   ', getWPos('mixamorigLeftFoot'));
  console.log('RightFoot:  ', getWPos('mixamorigRightFoot'));
  console.log('LeftHand:   ', getWPos('mixamorigLeftHand'));
  console.log('RightHand:  ', getWPos('mixamorigRightHand'));
  console.log('Head:       ', getWPos('mixamorigHead'));

  console.log('\n--- Target Scooter Anchors ---');
  console.log('Seat:       [0, 0.82, -0.16]');
  console.log('FootL:      [-0.14, 0.395, 0.14]');
  console.log('FootR:      [0.14, 0.395, 0.14]');
  console.log('GripL:      [-0.31, 1.24, 0.32]');
  console.log('GripR:      [0.31, 1.24, 0.32]');
  console.log('HeadLook:   [0, 1.65, 2.5]');
});
