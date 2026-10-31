// inspect_glb.mjs
import fs from 'fs';
import path from 'path';

const glbDir = path.resolve('src/assets/glb');
const files = fs.readdirSync(glbDir);

console.log('Files in src/assets/glb:', files);

for (const file of files) {
  const filePath = path.join(glbDir, file);
  const stats = fs.statSync(filePath);
  console.log(`\nFile: ${file} (${stats.size} bytes)`);

  // Simple GLB header check
  const buffer = fs.readFileSync(filePath);
  const magic = buffer.toString('utf8', 0, 4);
  const version = buffer.readUInt32LE(4);
  const length = buffer.readUInt32LE(8);
  console.log(`  GLB Magic: ${magic}, Version: ${version}, Total Length: ${length}`);

  // First chunk: JSON
  const chunk0Length = buffer.readUInt32LE(12);
  const chunk0Type = buffer.toString('utf8', 16, 20);
  if (chunk0Type === 'JSON') {
    const jsonStr = buffer.toString('utf8', 20, 20 + chunk0Length);
    const gltf = JSON.parse(jsonStr);
    console.log(`  Meshes: ${gltf.meshes ? gltf.meshes.length : 0}`);
    console.log(`  Nodes: ${gltf.nodes ? gltf.nodes.length : 0}`);
    console.log(`  Skins/Bones: ${gltf.skins ? gltf.skins.length : 0}`);
    console.log(`  Animations: ${gltf.animations ? gltf.animations.length : 0}`);
    console.log(`  Materials: ${gltf.materials ? gltf.materials.map(m => m.name).join(', ') : 'none'}`);
    if (gltf.animations && gltf.animations.length > 0) {
      console.log(`  Animation Clips: ${gltf.animations.map(a => a.name).join(', ')}`);
    }
  }
}

