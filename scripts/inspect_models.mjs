import fs from 'fs';

function inspectGlb(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  const buf = fs.readFileSync(filePath);
  const magic = buf.toString('utf8', 0, 4);
  const version = buf.readUInt32LE(4);
  const length = buf.readUInt32LE(8);
  const jsonChunkLen = buf.readUInt32LE(12);
  const jsonChunkType = buf.readUInt32LE(16);
  const jsonText = buf.toString('utf8', 20, 20 + jsonChunkLen);
  const gltf = JSON.parse(jsonText);

  console.log(`\n=== ${filePath} (${(buf.length / 1024 / 1024).toFixed(2)} MB) ===`);
  console.log('Meshes:', gltf.meshes ? gltf.meshes.map(m => m.name) : []);
  console.log('Materials:', gltf.materials ? gltf.materials.map(m => m.name) : []);
  console.log('Animations:', gltf.animations ? gltf.animations.map(a => a.name) : []);
  console.log('Images/Textures count:', gltf.images ? gltf.images.length : 0);
  if (gltf.nodes) {
    const bones = gltf.nodes.filter(n => n.name && (n.name.includes('mixamorig') || n.name.includes('Bone') || n.name.includes('Hips')));
    console.log(`Bones found (${bones.length}): sample:`, bones.slice(0, 5).map(b => b.name));
  }
}

inspectGlb('temp_models/Michelle.glb');
inspectGlb('temp_models/Soldier.glb');
inspectGlb('temp_models/kira.glb');
inspectGlb('public/assets/glb/human.glb');
