// measure_bones.mjs
import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const buf = fs.readFileSync('src/assets/glb/character.glb');
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

const loader = new GLTFLoader();
loader.parse(ab, '', (gltf) => {
  const root = gltf.scene;
  root.updateMatrixWorld(true);

  const bones = {};
  root.traverse(n => {
    if (n.isBone) {
      bones[n.name] = n;
    }
  });

  const targetBones = [
    'mixamorigHips', 'mixamorigSpine', 'mixamorigHead',
    'mixamorigLeftUpLeg', 'mixamorigLeftLeg', 'mixamorigLeftFoot',
    'mixamorigLeftArm', 'mixamorigLeftForeArm', 'mixamorigLeftHand'
  ];

  targetBones.forEach(bName => {
    const b = bones[bName];
    if (b) {
      const wp = new THREE.Vector3();
      b.getWorldPosition(wp);
      console.log(`${bName.padEnd(24)}: pos = [${wp.x.toFixed(3)}, ${wp.y.toFixed(3)}, ${wp.z.toFixed(3)}]`);
    }
  });
});
