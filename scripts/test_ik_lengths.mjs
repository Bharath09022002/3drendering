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

  const scale = 1.72 * (0.56 / 0.45) / 1.8093;
  root.scale.set(scale, scale, scale);

  const rootY = 0.82 - (1.03991 * scale);
  const rootZ = -0.16 - (0.02076 * scale);
  root.position.set(0, rootY, rootZ);

  // Print resting bone lengths
  root.updateMatrixWorld(true);

  function getLength(b1, b2) {
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    b1.getWorldPosition(p1);
    b2.getWorldPosition(p2);
    return p1.distanceTo(p2);
  }

  console.log('Thigh length (UpLeg to Leg):', getLength(bones['mixamorigLeftUpLeg'], bones['mixamorigLeftLeg']));
  console.log('Shin length (Leg to Foot):', getLength(bones['mixamorigLeftLeg'], bones['mixamorigLeftFoot']));
  console.log('Upper arm (Arm to ForeArm):', getLength(bones['mixamorigLeftArm'], bones['mixamorigLeftForeArm']));
  console.log('Forearm (ForeArm to Hand):', getLength(bones['mixamorigLeftForeArm'], bones['mixamorigLeftHand']));

  // Let's test joint angles that place feet at footAnchors and hands at gripAnchors
  // Targets:
  // FootL: [-0.14, 0.395, 0.14]
  // GripL: [-0.31, 1.24, 0.32]
  // FootR: [0.14, 0.395, 0.14]
  // GripR: [0.31, 1.24, 0.32]

  const footTargetL = new THREE.Vector3(-0.14, 0.395, 0.14);
  const footTargetR = new THREE.Vector3(0.14, 0.395, 0.14);
  const gripTargetL = new THREE.Vector3(-0.31, 1.24, 0.32);
  const gripTargetR = new THREE.Vector3(0.31, 1.24, 0.32);

  const upLegLPos = new THREE.Vector3();
  bones['mixamorigLeftUpLeg'].getWorldPosition(upLegLPos);
  console.log('UpLegL position:', upLegLPos);
  console.log('Distance UpLegL to FootTargetL:', upLegLPos.distanceTo(footTargetL));

  const armLPos = new THREE.Vector3();
  bones['mixamorigLeftArm'].getWorldPosition(armLPos);
  console.log('ArmL position (rest):', armLPos);
  console.log('Distance ArmL to GripTargetL:', armLPos.distanceTo(gripTargetL));
});
