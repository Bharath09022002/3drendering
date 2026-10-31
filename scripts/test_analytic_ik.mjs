import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Analytical Two-Bone IK solver.
 * Adjusts rootBone and midBone rotations to reach targetPos.
 */
function solveTwoBoneIK(rootBone, midBone, endBone, targetPos, poleDir) {
  // Update parents
  rootBone.parent.updateWorldMatrix(true, false);

  const p0 = new THREE.Vector3();
  rootBone.getWorldPosition(p0);

  const p1 = new THREE.Vector3();
  midBone.getWorldPosition(p1);

  const p2 = new THREE.Vector3();
  endBone.getWorldPosition(p2);

  const l1 = p0.distanceTo(p1);
  const l2 = p1.distanceTo(p2);

  const targetDir = new THREE.Vector3().subVectors(targetPos, p0);
  const d = Math.max(0.001, Math.min(l1 + l2 - 0.001, targetDir.length()));

  // Angles via law of cosines
  const cosAngle0 = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const angle0 = Math.acos(cosAngle0);

  const cosAngle1 = Math.max(-1, Math.min(1, (l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2)));
  const angle1 = Math.PI - Math.acos(cosAngle1);

  // Direction to target
  targetDir.normalize();

  // Plane normal formed by targetDir and poleDir
  const normal = new THREE.Vector3().crossVectors(targetDir, poleDir).normalize();
  if (normal.lengthSq() < 0.001) {
    normal.set(0, 0, 1).cross(targetDir).normalize();
  }

  // Desired direction for bone 0: rotated by angle0 away from targetDir towards poleDir
  const bone0Dir = targetDir.clone().applyAxisAngle(normal, angle0);

  // Convert bone0Dir into rootBone parent's local space
  const parentWorldQuat = new THREE.Quaternion();
  rootBone.parent.getWorldQuaternion(parentWorldQuat);
  const localTargetDir = bone0Dir.clone().applyQuaternion(parentWorldQuat.clone().invert());

  // Default rest direction of bone in its rest orientation
  // In Mixamo, rest bone direction is along -Y (or down)
  const restDir = new THREE.Vector3(0, -1, 0);
  const q0 = new THREE.Quaternion().setFromUnitVectors(restDir, localTargetDir);
  rootBone.quaternion.copy(q0);

  // Mid bone bends by angle1 around the local bend axis
  midBone.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle1);
}

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

  bones['mixamorigSpine1'].rotation.x = -0.174;
  bones['mixamorigSpine2'].rotation.x = -0.05;
  bones['mixamorigHead'].rotation.x = 0.18;

  root.updateMatrixWorld(true);

  console.log('Rest LeftFoot world pos:', new THREE.Vector3().setFromMatrixPosition(bones['mixamorigLeftFoot'].matrixWorld));
});
