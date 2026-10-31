// inspect_nodes.mjs
import fs from 'fs';

const buffer = fs.readFileSync('src/assets/glb/character.glb');
const chunk0Length = buffer.readUInt32LE(12);
const jsonStr = buffer.toString('utf8', 20, 20 + chunk0Length);
const gltf = JSON.parse(jsonStr);

console.log('Meshes in GLTF:');
gltf.meshes.forEach((m, idx) => {
  console.log(`Mesh ${idx}: "${m.name}"`);
  m.primitives.forEach((p, pIdx) => {
    const matName = p.material !== undefined ? gltf.materials[p.material].name : 'default';
    console.log(`  Primitive ${pIdx}: material = "${matName}"`);
  });
});

console.log('\nTop nodes:');
gltf.nodes.forEach((n, idx) => {
  if (n.mesh !== undefined || n.skin !== undefined) {
    console.log(`Node ${idx}: "${n.name}", mesh=${n.mesh}, skin=${n.skin}`);
  }
});

