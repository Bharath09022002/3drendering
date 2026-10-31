import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const glbBuffer = fs.readFileSync('public/assets/glb/character.glb');
const loader = new GLTFLoader();

loader.parse(glbBuffer.buffer, '', (gltf) => {
  const scene = gltf.scene;
  const bones = {};
  scene.traverse((child) => {
    if (child.isBone) {
      bones[child.name] = child;
    }
  });

  console.log('Found bones:', Object.keys(bones).length);
  const hips = bones['mixamorigHips'];
  console.log('mixamorigHips position:', hips.position);

  // Wheel diameter = 0.56m
  // human standing height = 1.72 * (0.56 / 0.45) = 2.1404m
  // In character.glb height is 1.8093m
  // scale = 2.1404 / 1.8093 = 1.183
  const scale = 1.72 * (0.56 / 0.45) / 1.8093;
  console.log('Calculated scale:', scale);

  // seatAnchor is [0, 0.82, -0.16] in scooter coordinates
  // hips position in model is [0, 1.040, 0.021]
  // riderRoot.position + hips.position * scale = seatAnchor
  // riderRoot.y = 0.82 - (hips.position.y * scale)
  // riderRoot.z = -0.16 - (hips.position.z * scale)
  const rootY = 0.82 - (hips.position.y * scale);
  const rootZ = -0.16 - (hips.position.z * scale);
  console.log('Rider root position to place hips at seatAnchor:', [0, rootY, rootZ]);
});
