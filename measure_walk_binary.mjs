// measure_walk_binary.mjs
import fs from 'fs';

const buffer = fs.readFileSync('src/assets/glb/character.glb');
const chunk0Length = buffer.readUInt32LE(12);
const jsonStr = buffer.toString('utf8', 20, 20 + chunk0Length);
const gltf = JSON.parse(jsonStr);

// Binary chunk starts at 20 + chunk0Length + 8
const binChunkOffset = 20 + chunk0Length + 8;

function getAccessorData(accIdx) {
  const acc = gltf.accessors[accIdx];
  const bv = gltf.bufferViews[acc.bufferView];
  const start = binChunkOffset + (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const count = acc.count;
  
  if (acc.type === 'VEC3') {
    const data = [];
    for (let i = 0; i < count; i++) {
      const o = start + i * 12;
      data.push([
        buffer.readFloatLE(o),
        buffer.readFloatLE(o + 4),
        buffer.readFloatLE(o + 8)
      ]);
    }
    return data;
  }
  if (acc.type === 'SCALAR') {
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push(buffer.readFloatLE(start + i * 4));
    }
    return data;
  }
  return null;
}

const walkAnim = gltf.animations.find(a => a.name === 'walk');
const hipsNodeIdx = gltf.nodes.findIndex(n => n.name === 'mixamorig:Hips' || n.name === 'mixamorigHips');

walkAnim.channels.forEach(ch => {
  if (ch.target.node === hipsNodeIdx) {
    console.log(`Hips channel path: ${ch.target.path}`);
    if (ch.target.path === 'translation') {
      const sampler = walkAnim.samplers[ch.sampler];
      const times = getAccessorData(sampler.input);
      const values = getAccessorData(sampler.output);
      console.log(`Keyframes count: ${times.length}`);
      console.log(`First pos:`, values[0]);
      console.log(`Last pos:`, values[values.length - 1]);
      const deltaZ = values[values.length - 1][2] - values[0][2];
      const deltaY = values[values.length - 1][1] - values[0][1];
      console.log(`Delta Z (forward displacement): ${deltaZ.toFixed(4)}m`);
    }
  }
});

