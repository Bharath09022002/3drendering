import fs from 'fs';

function getBones(filePath) {
  const buf = fs.readFileSync(filePath);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));
  return gltf.nodes.filter(n => n.name && (n.name.includes('mixamorig') || n.name.includes('Bone'))).map(n => n.name);
}

const bChar = getBones('public/assets/glb/character.glb');
const bMichelle = getBones('temp_models/Michelle.glb');
const bSoldier = getBones('temp_models/Soldier.glb');

console.log('character.glb bones count:', bChar.length);
console.log('Michelle.glb bones count:', bMichelle.length);
console.log('Soldier.glb bones count:', bSoldier.length);

console.log('Michelle matches character:', bMichelle.filter(b => bChar.includes(b)).length);
console.log('Soldier matches character:', bSoldier.filter(b => bChar.includes(b)).length);
