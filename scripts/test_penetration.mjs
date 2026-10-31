import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const glbBuffer = fs.readFileSync('public/assets/glb/character.glb');
new GLTFLoader().parse(glbBuffer.buffer, '', (gltf) => {
  const root = new THREE.Group();
  root.add(gltf.scene);
  const bones = {};
  gltf.scene.traverse((c) => { if (c.isBone) bones[c.name] = c; });

  // Scale rule: human standing height = 1.72 m * (scooter wheel outer diameter / 0.45 m)
  const wheelOuterDiameter = 0.28 * 2; // 0.56m
  const standingHeight = 1.72 * (wheelOuterDiameter / 0.45); // 2.1404m
  const scale = standingHeight / 1.8093; // 1.18302

  root.scale.set(scale, scale, scale);
  const rootY = 0.82 - (1.03991 * scale);
  const rootZ = -0.16 - (0.02076 * scale);
  root.position.set(0, rootY, rootZ);

  // Apply Seated Posture
  // 1. Torso leans 8-12 degrees forward (10 deg = -0.174 rad)
  bones['mixamorigSpine1'].rotation.x = -0.174;
  bones['mixamorigSpine2'].rotation.x = -0.05;
  bones['mixamorigHead'].rotation.x = 0.18;

  // 2. Arms to handlebars: gripAnchorL/R at [+-0.31, 1.24, 0.32]
  if (bones['mixamorigLeftShoulder']) bones['mixamorigLeftShoulder'].rotation.set(-0.15, 0.10, 0);
  if (bones['mixamorigRightShoulder']) bones['mixamorigRightShoulder'].rotation.set(-0.15, -0.10, 0);
  bones['mixamorigLeftArm'].rotation.set(-1.04, -0.80, -1.40);
  bones['mixamorigRightArm'].rotation.set(-1.04, 0.80, 1.40);
  bones['mixamorigLeftForeArm'].rotation.set(-0.60, 0, 0);
  bones['mixamorigRightForeArm'].rotation.set(-0.60, 0, 0);

  // 3. Thighs pointing forward and slightly down, shins to footAnchorL/R
  bones['mixamorigLeftUpLeg'].rotation.set(-1.55, 0.08, 0.14);
  bones['mixamorigRightUpLeg'].rotation.set(-1.55, -0.08, -0.14);
  bones['mixamorigLeftLeg'].rotation.set(0.95, 0, 0);
  bones['mixamorigRightLeg'].rotation.set(0.95, 0, 0);
  bones['mixamorigLeftFoot'].rotation.set(-0.25, 0, 0);
  bones['mixamorigRightFoot'].rotation.set(-0.25, 0, 0);

  root.updateMatrixWorld(true);

  // Define scooter solid shell obstacles
  const obstacles = [
    { name: 'Under-Seat Fairing', box: new THREE.Box3(new THREE.Vector3(-0.18, 0.40, -0.52), new THREE.Vector3(0.18, 0.72, 0.00)) },
    { name: 'Central Step-Through Spine', box: new THREE.Box3(new THREE.Vector3(-0.09, 0.35, -0.08), new THREE.Vector3(0.09, 0.43, 0.28)) },
    { name: 'Front Aero Cowling', box: new THREE.Box3(new THREE.Vector3(-0.18, 0.54, 0.32), new THREE.Vector3(0.18, 0.98, 0.60)) },
    { name: 'Floorboard', box: new THREE.Box3(new THREE.Vector3(-0.21, 0.35, -0.18), new THREE.Vector3(0.21, 0.39, 0.34)) },
  ];

  // Helper to compute bounding box of a bone segment (capsule / box from bone start to bone end)
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

  console.log('=== PENETRATION AUDIT REPORT ===');
  let maxDeepestOverlap = 0;
  let overlapsFound = [];

  for (const part of riderParts) {
    for (const obs of obstacles) {
      // Allowed contacts:
      // - Torso with Under-seat fairing top / seat pad
      // - Shin/Foot with Floorboard top
      const isAllowedContact = (part.name === 'Torso' && obs.name === 'Under-Seat Fairing') ||
                               ((part.name === 'Left Shin' || part.name === 'Right Shin') && obs.name === 'Floorboard');

      const intersection = new THREE.Box3();
      intersection.copy(part.box).intersect(obs.box);

      if (!intersection.isEmpty()) {
        const size = new THREE.Vector3();
        intersection.getSize(size);
        // Deepest penetration depth is min axis dimension of intersection box
        const depth = Math.min(size.x, size.y, size.z);
        if (depth > 0.001) {
          if (isAllowedContact) {
            console.log(`[ALLOWED CONTACT] ${part.name} touches ${obs.name} (overlap depth: ${(depth * 100).toFixed(1)} cm)`);
          } else {
            console.log(`[OVERLAP DETECTED] ${part.name} intersects ${obs.name} depth: ${(depth * 100).toFixed(2)} cm`);
            if (depth > maxDeepestOverlap) maxDeepestOverlap = depth;
            if (depth > 0.02) {
              overlapsFound.push({ part: part.name, obstacle: obs.name, depth: depth * 100 });
            }
          }
        }
      }
    }
  }

  console.log(`\nMax non-contact overlap depth: ${(maxDeepestOverlap * 100).toFixed(2)} cm`);
  console.log(`Overlaps deeper than 2.0 cm: ${overlapsFound.length}`);
  if (overlapsFound.length > 0) {
    console.log('Violations:', overlapsFound);
  } else {
    console.log('PASSED: Zero unwanted overlaps deeper than 2.0 cm!');
  }
});
