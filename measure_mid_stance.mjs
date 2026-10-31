// measure_mid_stance.mjs
import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const buf = fs.readFileSync('src/assets/glb/character.glb');
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

const loader = new GLTFLoader();
loader.parse(ab, '', (gltf) => {
  const root = gltf.scene;
  const walkClip = gltf.animations.find(a => a.name === 'walk');
  const mixer = new THREE.AnimationMixer(root);
  const action = mixer.clipAction(walkClip);
  action.play();

  let leftFoot = null;
  root.traverse(n => {
    if (n.isBone && n.name.includes('LeftFoot')) leftFoot = n;
  });

  const duration = walkClip.duration;
  // Mid stance: foot flat on floor between t=0.18 and t=0.32
  const midStanceTimes = [0.20, 0.22, 0.24, 0.26, 0.28, 0.30];
  const midSpeeds = [];

  midStanceTimes.forEach(t => {
    mixer.setTime(t);
    root.updateMatrixWorld(true);
    const p1 = new THREE.Vector3();
    leftFoot.getWorldPosition(p1);

    mixer.setTime(t + 0.01);
    root.updateMatrixWorld(true);
    const p2 = new THREE.Vector3();
    leftFoot.getWorldPosition(p2);

    const relVz = (p2.z - p1.z) / 0.01;
    midSpeeds.push(-relVz);
  });

  const avgMidSpeed = midSpeeds.reduce((a, b) => a + b, 0) / midSpeeds.length;
  console.log(`Mid-stance average backward foot velocity: ${avgMidSpeed.toFixed(4)} m/s`);
  const calibratedStride = avgMidSpeed * duration;
  console.log(`Calibrated Stride for flat-foot planting: ${calibratedStride.toFixed(4)}m`);

  // World foot speed during flat-foot mid-stance
  const worldSpeeds = midSpeeds.map(v => Math.abs(avgMidSpeed - v));
  const avgWorldSpeed = worldSpeeds.reduce((a, b) => a + b, 0) / worldSpeeds.length;
  console.log(`World foot speed during flat-foot mid-stance: ${avgWorldSpeed.toFixed(4)} m/s (Target < 0.0300 m/s)`);
});

