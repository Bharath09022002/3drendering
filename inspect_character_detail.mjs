// inspect_character_detail.mjs
import fs from 'fs';
import path from 'path';

const buffer = fs.readFileSync('src/assets/glb/character.glb');
const chunk0Length = buffer.readUInt32LE(12);
const jsonStr = buffer.toString('utf8', 20, 20 + chunk0Length);
const gltf = JSON.parse(jsonStr);

console.log('=== CHARACTER GLB DETAILED AUDIT ===\n');
console.log('File size:', buffer.length, 'bytes');

// Bone names
const skin = gltf.skins[0];
const bones = skin.joints.map(jointIdx => gltf.nodes[jointIdx].name);
console.log(`\nSkeleton: ${bones.length} bones`);
console.log('Bone list:', bones.join(', '));

// Animation clips with durations
console.log(`\nAnimation Clips (${gltf.animations.length}):`);
gltf.animations.forEach(anim => {
  // Find max time in accessors
  let maxTime = 0;
  anim.channels.forEach(ch => {
    const sampler = anim.samplers[ch.sampler];
    const inputAcc = gltf.accessors[sampler.input];
    if (inputAcc.max && inputAcc.max[0] > maxTime) {
      maxTime = inputAcc.max[0];
    }
  });
  console.log(`  - "${anim.name}": duration ${maxTime.toFixed(2)}s`);
});

// Materials
console.log(`\nMaterials (${gltf.materials.length}):`);
gltf.materials.forEach(mat => {
  console.log(`  - "${mat.name}"`);
});

// Triangle count estimation from accessors
let totalTriangles = 0;
gltf.meshes.forEach(mesh => {
  mesh.primitives.forEach(prim => {
    if (prim.indices !== undefined) {
      const acc = gltf.accessors[prim.indices];
      totalTriangles += acc.count / 3;
    }
  });
});
console.log(`\nTotal Triangles: ${totalTriangles.toLocaleString()}`);

