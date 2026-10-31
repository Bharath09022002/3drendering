import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const glbBuffer = fs.readFileSync('public/assets/glb/character.glb');
new GLTFLoader().parse(glbBuffer.buffer, '', (gltf) => {
  const root = new THREE.Group();
  root.add(gltf.scene);
  const bones = {};
  gltf.scene.traverse((c) => { if (c.isBone) bones[c.name] = c; });

  const scale = 1.72 * (0.56 / 0.45) / 1.8093; // 1.18302
  root.scale.set(scale, scale, scale);
  const rootY = 0.82 - (1.03991 * scale);
  const rootZ = -0.16 - (0.02076 * scale);
  root.position.set(0, rootY, rootZ);

  bones['mixamorigSpine1'].rotation.x = -0.174;
  bones['mixamorigSpine2'].rotation.x = -0.05;

  // Let's test knee and hip orientations
  // To get the ankle at Y ~ 0.48-0.50 and Z ~ 0.20-0.35:
  // Thigh must be lifted: rx in [-1.8, -1.3]
  // Thigh can abduct slightly (knees apart for comfort): rz in [0.0, 0.3]
  // Knee flexion: kx in [0.8, 1.8]
  
  let solutions = [];

  for (let rx = -1.9; rx <= -1.4; rx += 0.02) {
    for (let rz = 0.05; rz <= 0.30; rz += 0.05) {
      for (let kx = 0.7; kx <= 1.4; kx += 0.02) {
        bones['mixamorigLeftUpLeg'].rotation.set(rx, 0.05, rz);
        bones['mixamorigLeftLeg'].rotation.set(kx, 0, 0);
        root.updateMatrixWorld(true);

        const ankle = new THREE.Vector3();
        bones['mixamorigLeftFoot'].getWorldPosition(ankle);

        // Ankle should be ~0.46 - 0.50 (sole on 0.395)
        // Z should be on footboard ~0.20 - 0.34
        // X should be ~0.14
        if (ankle.y >= 0.45 && ankle.y <= 0.52 && ankle.z >= 0.15 && ankle.z <= 0.35 && ankle.x >= 0.10 && ankle.x <= 0.22) {
          solutions.push({ rx, rz, kx, ankle: ankle.clone() });
        }
      }
    }
  }

  console.log(`Found ${solutions.length} leg solutions on footboard!`);
  if (solutions.length > 0) {
    // Sort by proximity to target foot anchor [0.14, 0.48, 0.22]
    const target = new THREE.Vector3(0.14, 0.48, 0.22);
    solutions.sort((a, b) => a.ankle.distanceTo(target) - b.ankle.distanceTo(target));
    console.log('Best leg solutions:', solutions.slice(0, 5));
  }
});
