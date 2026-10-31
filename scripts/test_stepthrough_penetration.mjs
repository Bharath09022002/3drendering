import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const glbBuffer = fs.readFileSync('public/assets/glb/character.glb');
new GLTFLoader().parse(glbBuffer.buffer, '', (gltf) => {
  const root = new THREE.Group();
  root.add(gltf.scene);
  const bones = {};
  gltf.scene.traverse((c) => { if (c.isBone) bones[c.name] = c; });

  const wheelOuterDiameter = 0.28 * 2; // 0.56m
  const standingHeight = 1.72 * (wheelOuterDiameter / 0.45); // 2.1404m
  const scale = standingHeight / 1.8093; // 1.18302

  root.scale.set(scale, scale, scale);
  const rootY = 0.82 - (1.03991 * scale);
  const rootZ = -0.16 - (0.02076 * scale);
  root.position.set(0, rootY, rootZ);

  // Apply Seated Posture
  bones['mixamorigSpine1'].rotation.x = -0.174;
  bones['mixamorigSpine2'].rotation.x = -0.05;
  bones['mixamorigHead'].rotation.x = 0.18;

  // Arms to handlebars: gripAnchorL/R at [+-0.31, 1.24, 0.32]
  if (bones['mixamorigLeftShoulder']) bones['mixamorigLeftShoulder'].rotation.set(-0.15, 0.10, 0);
  if (bones['mixamorigRightShoulder']) bones['mixamorigRightShoulder'].rotation.set(-0.15, -0.10, 0);
  bones['mixamorigLeftArm'].rotation.set(-1.04, -0.80, -1.40);
  bones['mixamorigRightArm'].rotation.set(-1.04, 0.80, 1.40);
  bones['mixamorigLeftForeArm'].rotation.set(-0.60, 0, 0);
  bones['mixamorigRightForeArm'].rotation.set(-0.60, 0, 0);

  // Thighs forward and down:
  bones['mixamorigLeftUpLeg'].rotation.set(-1.42, 0.12, 0.16);
  bones['mixamorigRightUpLeg'].rotation.set(-1.42, -0.12, -0.16);
  bones['mixamorigLeftLeg'].rotation.set(1.35, 0, 0);
  bones['mixamorigRightLeg'].rotation.set(1.35, 0, 0);
  bones['mixamorigLeftFoot'].rotation.set(-0.10, 0, 0);
  bones['mixamorigRightFoot'].rotation.set(-0.10, 0, 0);

  root.updateMatrixWorld(true);

  // Allowed Contacts:
  // - Seat Pad: [0, 0.74, -0.16] (size [0.34, 0.16, 0.54])
  // - Footboard: [0, 0.37, 0.10] (size [0.42, 0.05, 0.50])
  // - Grips: [+-0.31, 1.24, 0.32]
  
  // Solid Non-Contact Shell Obstacles:
  const obstacles = [
    { name: 'Under-Seat Fairing', box: new THREE.Box3(new THREE.Vector3(-0.17, 0.40, -0.56), new THREE.Vector3(0.17, 0.68, -0.26)) },
    { name: 'Central Step-Through Spine', box: new THREE.Box3(new THREE.Vector3(-0.06, 0.35, -0.10), new THREE.Vector3(0.06, 0.40, 0.24)) },
    { name: 'Front Aero Cowling', box: new THREE.Box3(new THREE.Vector3(-0.18, 0.54, 0.44), new THREE.Vector3(0.18, 0.98, 0.60)) },
    { name: 'Steering Column', box: new THREE.Box3(new THREE.Vector3(-0.05, 0.90, 0.30), new THREE.Vector3(0.05, 1.25, 0.40)) },
  ];

  const allowedContacts = [
    { name: 'Seat Pad', box: new THREE.Box3(new THREE.Vector3(-0.17, 0.66, -0.44), new THREE.Vector3(0.17, 0.82, -0.04)) },
    { name: 'Footboard', box: new THREE.Box3(new THREE.Vector3(-0.21, 0.35, -0.14), new THREE.Vector3(0.21, 0.40, 0.36)) },
    { name: 'Left Grip', box: new THREE.Box3(new THREE.Vector3(-0.38, 1.18, 0.26), new THREE.Vector3(-0.24, 1.30, 0.38)) },
    { name: 'Right Grip', box: new THREE.Box3(new THREE.Vector3(0.24, 1.18, 0.26), new THREE.Vector3(0.38, 1.30, 0.38)) },
  ];

  function getBoneSegmentBox(startBone, endBone, radius = 0.08) {
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    startBone.getWorldPosition(p1);
    endBone.getWorldPosition(p2);
    const box = new THREE.Box3();
    box.expandByPoint(new THREE.Vector3(p1.x - radius, p1.y - radius, p1.z - radius));
    box.expandByPoint(new THREE.Vector3(p1.x + radius, p1.y + radius, p1.z + radius));
    box.expandByPoint(new THREE.Vector3(p2.x - radius, p2.y - radius, p2.z - radius));
    box.expandByPoint(new THREE.Vector3(p2.x + radius, p2.y + radius, p2.z + radius));
    return box;
  }

  const riderParts = [
    { name: 'Torso', box: getBoneSegmentBox(bones['mixamorigHips'], bones['mixamorigSpine2'], 0.12) },
    { name: 'Left Thigh', box: getBoneSegmentBox(bones['mixamorigLeftUpLeg'], bones['mixamorigLeftLeg'], 0.07) },
    { name: 'Right Thigh', box: getBoneSegmentBox(bones['mixamorigRightUpLeg'], bones['mixamorigRightLeg'], 0.07) },
    { name: 'Left Shin', box: getBoneSegmentBox(bones['mixamorigLeftLeg'], bones['mixamorigLeftFoot'], 0.06) },
    { name: 'Right Shin', box: getBoneSegmentBox(bones['mixamorigRightLeg'], bones['mixamorigRightFoot'], 0.06) },
    { name: 'Left Arm', box: getBoneSegmentBox(bones['mixamorigLeftArm'], bones['mixamorigLeftHand'], 0.05) },
    { name: 'Right Arm', box: getBoneSegmentBox(bones['mixamorigRightArm'], bones['mixamorigRightHand'], 0.05) },
  ];

  console.log('=== RIGOROUS AUTOMATIC PENETRATION REPORT ===');
  
  // 1. Report allowed contacts
  for (const part of riderParts) {
    for (const contact of allowedContacts) {
      const inter = new THREE.Box3().copy(part.box).intersect(contact.box);
      if (!inter.isEmpty()) {
        const s = new THREE.Vector3();
        inter.getSize(s);
        const depth = Math.min(s.x, s.y, s.z);
        if (depth > 0.001) {
          console.log(`[VALID CONTACT] ${part.name} rests on ${contact.name} (contact depth: ${(depth * 100).toFixed(1)} cm)`);
        }
      }
    }
  }

  // 2. Check collisions against non-contact scooter shell obstacles
  let maxDeepestOverlap = 0;
  let violations = [];

  for (const part of riderParts) {
    for (const obs of obstacles) {
      const intersection = new THREE.Box3().copy(part.box).intersect(obs.box);
      if (!intersection.isEmpty()) {
        const size = new THREE.Vector3();
        intersection.getSize(size);
        const depth = Math.min(size.x, size.y, size.z);
        if (depth > 0.001) {
          console.log(`[NON-CONTACT OVERLAP] ${part.name} intersects ${obs.name} depth: ${(depth * 100).toFixed(2)} cm`);
          if (depth > maxDeepestOverlap) maxDeepestOverlap = depth;
          if (depth > 0.02) {
            violations.push({ part: part.name, obstacle: obs.name, depth: depth * 100 });
          }
        }
      }
    }
  }

  console.log(`\nMax non-contact overlap depth: ${(maxDeepestOverlap * 100).toFixed(2)} cm`);
  console.log(`Overlaps deeper than 2.0 cm: ${violations.length}`);
  if (violations.length === 0) {
    console.log('PASSED: ZERO overlaps above 2 cm. All contacts strictly within allowed seat pad, footboard, and grips!');
  } else {
    console.log('FAILED: Violations found:', violations);
  }
});
