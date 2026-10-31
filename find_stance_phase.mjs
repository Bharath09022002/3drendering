// find_stance_phase.mjs
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
  const steps = 60;
  const dt = duration / steps;
  
  // Track foot Y (height) and foot Z velocity
  const samples = [];
  for (let i = 0; i < steps; i++) {
    const t = i * dt;
    mixer.setTime(t);
    root.updateMatrixWorld(true);
    const p1 = new THREE.Vector3();
    leftFoot.getWorldPosition(p1);

    mixer.setTime(t + 0.005);
    root.updateMatrixWorld(true);
    const p2 = new THREE.Vector3();
    leftFoot.getWorldPosition(p2);

    const relVz = (p2.z - p1.z) / 0.005;
    samples.push({ t, y: p1.y, z: p1.z, relVz });
  }

  // Find lowest Y (planted on ground)
  const minY = Math.min(...samples.map(s => s.y));
  console.log(`Lowest foot Y (ground contact): ${minY.toFixed(4)}m`);
  
  // Stance samples: foot within 0.03m of ground contact
  const stanceSamples = samples.filter(s => s.y <= minY + 0.035);
  console.log(`Stance sample count: ${stanceSamples.length}`);
  
  // Stance travel
  const minZ = Math.min(...stanceSamples.map(s => s.z));
  const maxZ = Math.max(...stanceSamples.map(s => s.z));
  const stanceDist = maxZ - minZ;
  const stanceDur = stanceSamples.length * dt;
  const exactStanceSpeed = stanceDist / stanceDur;
  console.log(`Stance distance: ${stanceDist.toFixed(4)}m over ${stanceDur.toFixed(3)}s`);
  console.log(`Average relative foot speed during contact: ${exactStanceSpeed.toFixed(4)} m/s`);
  
  // Calibrated root speed to match exact contact speed
  const STRIDE_DISTANCE = exactStanceSpeed * duration;
  console.log(`Optimal Stride Distance to cancel relative foot velocity: ${STRIDE_DISTANCE.toFixed(4)}m`);

  // World foot speed during stance with calibrated stride:
  const worldSpeeds = stanceSamples.map(s => Math.abs(exactStanceSpeed + s.relVz));
  const avgWorldSpeed = worldSpeeds.reduce((a, b) => a + b, 0) / worldSpeeds.length;
  console.log(`Average World Foot Speed during Stance: ${avgWorldSpeed.toFixed(4)} m/s (Target < 0.0300 m/s)`);
});

