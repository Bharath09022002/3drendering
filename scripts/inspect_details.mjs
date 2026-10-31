import fs from 'fs';

function inspectDetails(filePath) {
  const buf = fs.readFileSync(filePath);
  const jsonChunkLen = buf.readUInt32LE(12);
  const jsonText = buf.toString('utf8', 20, 20 + jsonChunkLen);
  const gltf = JSON.parse(jsonText);

  console.log(`\n================== ${filePath} ==================`);
  console.log('Meshes count:', gltf.meshes?.length);
  gltf.meshes?.forEach((m, idx) => {
    console.log(` Mesh ${idx}: "${m.name}", primitives: ${m.primitives.length}`);
    m.primitives.forEach((p, pIdx) => {
      const mat = p.material !== undefined ? gltf.materials[p.material] : null;
      console.log(`   Prim ${pIdx}: matIndex=${p.material}, matName="${mat?.name}"`);
    });
  });

  console.log('Materials:');
  gltf.materials?.forEach((mat, idx) => {
    console.log(` Mat ${idx}: "${mat.name}"`, JSON.stringify(mat.pbrMetallicRoughness || {}));
  });

  console.log('Textures count:', gltf.textures?.length);
  console.log('Images count:', gltf.images?.length);
  if (gltf.images) {
    gltf.images.forEach((img, idx) => {
      console.log(` Image ${idx}: name="${img.name}", mimeType="${img.mimeType}"`);
    });
  }

  console.log('Animations:', gltf.animations?.map(a => a.name));
}

inspectDetails('temp_models/Michelle.glb');
inspectDetails('temp_models/Soldier.glb');
