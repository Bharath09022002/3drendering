// measure_fk_stride.mjs
import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Read file as ArrayBuffer
const buf = fs.readFileSync('src/assets/glb/character.glb');
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

const loader = new GLTFLoader();
loader.parse(ab, '', (gltf) => {
  const root = gltf.scene;
  const animations = gltf.animations;
  const walkClip = animations.find(a => a.name === 'walk');
  
  const mixer = new THREE.AnimationMixer(root);
  const action = mixer.clipAction(walkClip);
  action.play();
  
  // Find left and right foot bones
  let leftFoot = null, rightFoot = null;
  root.traverse(node => {
    if (node.isBone) {
      if (node.name.includes('LeftFoot')) leftFoot = node;
      if (node.name.includes('RightFoot')) rightFoot = node;
    }
  });
  
  console.log('Left foot found:', leftFoot ? leftFoot.name : 'none');
  console.log('Right foot found:', rightFoot ? rightFoot.name : 'none');
  
  const duration = walkClip.duration;
  const steps = 60;
  const lfPositions = [];
  const rfPositions = [];
  
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * duration;
    mixer.setTime(t);
    root.updateMatrixWorld(true);
    
    const lPos = new THREE.Vector3();
    const rPos = new THREE.Vector3();
    leftFoot.getWorldPosition(lPos);
    rightFoot.getWorldPosition(rPos);
    
    lfPositions.push({ t, pos: lPos });
    rfPositions.push({ t, pos: rPos });
  }
  
  // Measure total forward/backward travel range of the foot relative to the character
  let minZ = 999, maxZ = -999;
  lfPositions.forEach(p => {
    if (p.pos.z < minZ) minZ = p.pos.z;
    if (p.pos.z > maxZ) maxZ = p.pos.z;
  });
  
  const footTravel = maxZ - minZ;
  // A complete walk cycle has 2 steps (left and right), so stride distance for full cycle = 2 * step length
  const stepLength = footTravel;
  const fullCycleStride = footTravel * 2;
  
  console.log(`Foot Z min: ${minZ.toFixed(4)}, max: ${maxZ.toFixed(4)}`);
  console.log(`Single Step Length: ${stepLength.toFixed(4)}m`);
  console.log(`Full Walk Cycle Stride (2 steps): ${fullCycleStride.toFixed(4)}m`);
  console.log(`Clip duration: ${duration.toFixed(3)}s`);
  console.log(`Walk Speed = (Stride / Duration) = ${(fullCycleStride / duration).toFixed(3)} m/s`);
});

