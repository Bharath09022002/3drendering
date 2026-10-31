// measure_foot_stride.mjs
import fs from 'fs';

const buffer = fs.readFileSync('src/assets/glb/character.glb');
const chunk0Length = buffer.readUInt32LE(12);
const jsonStr = buffer.toString('utf8', 20, 20 + chunk0Length);
const gltf = JSON.parse(jsonStr);
const binChunkOffset = 20 + chunk0Length + 8;

function getAccessorData(accIdx) {
  const acc = gltf.accessors[accIdx];
  const bv = gltf.bufferViews[acc.bufferView];
  const start = binChunkOffset + (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const count = acc.count;
  
  if (acc.type === 'VEC4') {
    const data = [];
    for (let i = 0; i < count; i++) {
      const o = start + i * 16;
      data.push([
        buffer.readFloatLE(o),
        buffer.readFloatLE(o + 4),
        buffer.readFloatLE(o + 8),
        buffer.readFloatLE(o + 12)
      ]);
    }
    return data;
  }
  return null;
}

const walkAnim = gltf.animations.find(a => a.name === 'walk');
const leftLegIdx = gltf.nodes.findIndex(n => n.name && n.name.includes('LeftLeg'));
const leftUpLegIdx = gltf.nodes.findIndex(n => n.name && n.name.includes('LeftUpLeg'));

console.log('LeftUpLeg index:', leftUpLegIdx, 'LeftLeg index:', leftLegIdx);

walkAnim.channels.forEach(ch => {
  if (ch.target.node === leftUpLegIdx && ch.target.path === 'rotation') {
    const sampler = walkAnim.samplers[ch.sampler];
    const rots = getAccessorData(sampler.output);
    console.log(`LeftUpLeg rotation samples: ${rots.length}`);
    // Check pitch angle min and max
    let minX = 999, maxX = -999;
    rots.forEach(q => {
      // Approximate pitch
      if (q[0] < minX) minX = q[0];
      if (q[0] > maxX) maxX = q[0];
    });
    console.log(`LeftUpLeg pitch quat range: [${minX.toFixed(3)}, ${maxX.toFixed(3)}]`);
  }
});

