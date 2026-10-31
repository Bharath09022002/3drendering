import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const glbBuffer = fs.readFileSync('public/assets/glb/character.glb');
new GLTFLoader().parse(glbBuffer.buffer, '', (gltf) => {
  const root = new THREE.Group();
  root.add(gltf.scene);
  const bones = {};
  gltf.scene.traverse((c) => { if (c.isBone) bones[c.name] = c; });

  // Test scale = 0.9506 (standing height = 1.72m)
  const scale = 1.72 / 1.8093; // 0.9506
  root.scale.set(scale, scale, scale);
  const rootY = 0.82 - (1.03991 * scale);
  const rootZ = -0.16 - (0.02076 * scale);
  root.position.set(0, rootY, rootZ);

  bones['mixamorigSpine1'].rotation.x = -0.174;
  bones['mixamorigSpine2'].rotation.x = -0.05;

  root.updateMatrixWorld(true);

  function getLength(b1, b2) {
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    b1.getWorldPosition(p1);
    b2.getWorldPosition(p2);
    return p1.distanceTo(p2);
  }

  const thigh = getLength(bones['mixamorigLeftUpLeg'], bones['mixamorigLeftLeg']);
  const shin = getLength(bones['mixamorigLeftLeg'], bones['mixamorigLeftFoot']);
  console.log('At scale 0.95 (1.72m human):');
  console.log('Thigh length:', thigh);
  console.log('Shin length:', shin);
  console.log('Hips height: 0.82');
  console.log('Floorboard height: 0.395');
  console.log('Distance hips to floorboard:', 0.82 - 0.395);
});
