// scripts/audit_assets.mjs
import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Polyfill browser globals for GLTFLoader in Node
global.THREE = THREE;
if (typeof self === 'undefined') global.self = global;
if (typeof window === 'undefined') global.window = global;

async function auditGlb(filePath) {
  console.log(`\n==============================================`);
  console.log(`AUDITING: ${filePath}`);
  console.log(`==============================================`);

  const buf = fs.readFileSync(filePath);
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(arrayBuffer, '', (gltf) => {
      const scene = gltf.scene;
      let totalTriangles = 0;
      let totalVertices = 0;
      const meshes = [];
      const materials = new Map();
      const bones = [];
      const textures = [];

      scene.traverse((obj) => {
        if (obj.isBone) {
          bones.push(obj.name);
        }
        if (obj.isMesh) {
          const geom = obj.geometry;
          let triCount = 0;
          let vertCount = 0;
          if (geom.index) {
            triCount = geom.index.count / 3;
          } else if (geom.attributes.position) {
            triCount = geom.attributes.position.count / 3;
          }
          if (geom.attributes.position) {
            vertCount = geom.attributes.position.count;
          }
          totalTriangles += triCount;
          totalVertices += vertCount;

          const matList = Array.isArray(obj.material) ? obj.material : [obj.material];
          const matNames = matList.map(m => {
            if (!m) return 'null';
            materials.set(m.name || m.uuid, m);
            return m.name || m.type;
          });

          meshes.push({
            name: obj.name,
            type: obj.type,
            triangles: triCount,
            vertices: vertCount,
            materials: matNames,
            morphTargets: obj.morphTargetInfluences ? obj.morphTargetInfluences.length : 0,
            morphTargetDictionary: obj.morphTargetDictionary ? Object.keys(obj.morphTargetDictionary) : []
          });
        }
      });

      console.log(`Total Triangles: ${totalTriangles}`);
      console.log(`Total Vertices: ${totalVertices}`);
      console.log(`Total Meshes: ${meshes.length}`);
      console.log(`Meshes Detail:`, JSON.stringify(meshes, null, 2));

      console.log(`\nUnique Materials (${materials.size}):`);
      for (const [key, mat] of materials.entries()) {
        const texMap = mat.map ? `map(${mat.map.name || 'unnamed'})` : '';
        const normalMap = mat.normalMap ? `normal(${mat.normalMap.name || 'unnamed'})` : '';
        const roughMap = mat.roughnessMap ? `rough(${mat.roughnessMap.name || 'unnamed'})` : '';
        console.log(` - Material "${mat.name || key}": type=${mat.type}, color=${mat.color ? mat.color.getHexString() : 'none'}, textures=[${[texMap, normalMap, roughMap].filter(Boolean).join(', ')}]`);
      }

      console.log(`\nBones Count: ${bones.length}`);
      console.log(`Bone Names:`, JSON.stringify(bones, null, 2));

      console.log(`\nAnimation Clips (${gltf.animations.length}):`);
      gltf.animations.forEach((clip, i) => {
        console.log(` - Clip ${i}: "${clip.name}", duration: ${clip.duration}s, tracks: ${clip.tracks.length}`);
      });

      if (gltf.asset) {
        console.log(`\nAsset Metadata:`, JSON.stringify(gltf.asset, null, 2));
      }

      resolve({ totalTriangles, totalVertices, meshes, materials, bones, animations: gltf.animations, asset: gltf.asset });
    }, reject);
  });
}

async function run() {
  await auditGlb(path.resolve('public/assets/glb/character.glb'));
  await auditGlb(path.resolve('public/assets/glb/phone.glb'));
  await auditGlb(path.resolve('public/assets/glb/bike.glb'));
}

run().catch(console.error);

