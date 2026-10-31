// scripts/audit_phone_glb.mjs
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';

const data = fs.readFileSync('src/assets/glb/phone.glb');
const loader = new GLTFLoader();
loader.parse(data.buffer, '', (gltf) => {
  console.log('=== GLTF AUDIT: src/assets/glb/phone.glb ===');
  console.log('File size:', fs.statSync('src/assets/glb/phone.glb').size, 'bytes');
  let totalTris = 0;
  function printNode(node, indent = '') {
    let extra = '';
    if (node.isMesh) {
      const geom = node.geometry;
      const tris = geom.index ? geom.index.count / 3 : geom.attributes.position.count / 3;
      totalTris += tris;
      const mat = node.material;
      extra = ` [Mesh: ${tris} tris, mat: ${mat ? (mat.name || 'unnamed') : 'none'}]`;
    }
    console.log(indent + (node.name || 'Unnamed') + extra);
    node.children.forEach(c => printNode(c, indent + '  '));
  }
  printNode(gltf.scene);
  console.log('Total triangles:', totalTris);
  console.log('Animation clips:', gltf.animations.map(a => a.name));

  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  console.log('Bounding Box size (W x H x D):', size.x.toFixed(4), 'x', size.y.toFixed(4), 'x', size.z.toFixed(4));
  console.log('Center:', box.getCenter(new THREE.Vector3()));

  // Check Screen mesh specifically
  let screenMesh = null;
  gltf.scene.traverse(c => {
    if (c.name && c.name.toLowerCase().includes('screen')) screenMesh = c;
  });
  if (screenMesh) {
    console.log('\n--- Screen Mesh Audit ---');
    console.log('Name:', screenMesh.name);
    console.log('Geometry attributes:', Object.keys(screenMesh.geometry.attributes));
    const uv = screenMesh.geometry.attributes.uv;
    if (uv) {
      let minU = 999, maxU = -999, minV = 999, maxV = -999;
      for (let i = 0; i < uv.count; i++) {
        const u = uv.getX(i);
        const v = uv.getY(i);
        if (u < minU) minU = u;
        if (u > maxU) maxU = u;
        if (v < minV) minV = v;
        if (v > maxV) maxV = v;
      }
      console.log(`UV range: U[${minU}, ${maxU}], V[${minV}, ${maxV}]`);
    }
  }

  // Check for any fold / hinge / left / right nodes
  const foldNodes = [];
  gltf.scene.traverse(c => {
    const n = (c.name || '').toLowerCase();
    if (n.includes('hinge') || n.includes('left') || n.includes('right') || n.includes('fold') || n.includes('wing')) {
      foldNodes.push(c.name);
    }
  });
  console.log('Fold/Hinge/Left/Right nodes found:', foldNodes);
});

