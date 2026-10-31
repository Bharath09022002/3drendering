// measure_walk.mjs
import fs from 'fs';
import * as THREE from 'three';

const buffer = fs.readFileSync('src/assets/glb/character.glb');
const chunk0Length = buffer.readUInt32LE(12);
const jsonStr = buffer.toString('utf8', 20, 20 + chunk0Length);
const gltf = JSON.parse(jsonStr);

// Find walk animation
const walkAnim = gltf.animations.find(a => a.name === 'walk');
console.log('Walk animation found:', walkAnim.name);

// Check channels targeting translation of Hips or root
const hipsNodeIdx = gltf.nodes.findIndex(n => n.name === 'mixamorig:Hips' || n.name === 'mixamorigHips');
console.log('Hips node index:', hipsNodeIdx);

walkAnim.channels.forEach(ch => {
  if (ch.target.node === hipsNodeIdx && ch.target.path === 'translation') {
    const sampler = walkAnim.samplers[ch.sampler];
    const outputAcc = gltf.accessors[sampler.output];
    console.log(`Hips translation min: [${outputAcc.min}], max: [${outputAcc.max}]`);
    const deltaZ = outputAcc.max[2] - outputAcc.min[2];
    const deltaY = outputAcc.max[1] - outputAcc.min[1];
    console.log(`Hips displacement: Z range = ${deltaZ.toFixed(4)}m, Y range = ${deltaY.toFixed(4)}m`);
  }
});

// Also check LeftFoot and RightFoot
const leftFootIdx = gltf.nodes.findIndex(n => n.name && n.name.includes('LeftFoot'));
const rightFootIdx = gltf.nodes.findIndex(n => n.name && n.name.includes('RightFoot'));
console.log('LeftFoot node:', leftFootIdx, 'RightFoot node:', rightFootIdx);

