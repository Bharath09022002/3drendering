import fs from 'fs';

const buf = fs.readFileSync('public/assets/glb/character.glb');
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));

console.log('character.glb animations:', gltf.animations ? gltf.animations.map(a => a.name) : []);
console.log('character.glb bones sample:', gltf.nodes.filter(n => n.name && n.name.includes('mixamorig')).slice(0, 10).map(n => n.name));
