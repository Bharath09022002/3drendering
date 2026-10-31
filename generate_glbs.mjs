// generate_glbs.mjs
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'node:fs';
import path from 'node:path';

// Node.js FileReader polyfill for GLTFExporter
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    constructor() {
      this.result = null;
      this.onload = null;
      this.onloadend = null;
    }
    async readAsArrayBuffer(blob) {
      const buffer = await blob.arrayBuffer();
      this.result = buffer;
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    }
  };
}

const outDirs = [
  path.resolve('public/assets/glb'),
  path.resolve('src/assets/glb')
];

for (const dir of outDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 1. Build Phone Model
function createPhone() {
  const group = new THREE.Group();
  group.name = 'PhoneModel';

  // Unibody Chassis
  const chassisGeom = new THREE.BoxGeometry(1.52, 3.12, 0.14);
  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0x1F2937,
    roughness: 0.25,
    metalness: 0.85
  });
  const chassis = new THREE.Mesh(chassisGeom, chassisMat);
  chassis.name = 'Chassis';
  group.add(chassis);

  // Metallic Bezel Trim
  const rimGeom = new THREE.BoxGeometry(1.54, 3.14, 0.12);
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x374151,
    roughness: 0.15,
    metalness: 0.95
  });
  const rim = new THREE.Mesh(rimGeom, rimMat);
  rim.name = 'Rim';
  group.add(rim);

  // Front Screen Quad (UV mapped)
  const screenGeom = new THREE.PlaneGeometry(1.44, 3.02);
  const screenMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
  const screen = new THREE.Mesh(screenGeom, screenMat);
  screen.name = 'Screen';
  screen.position.set(0, 0, 0.071);
  group.add(screen);

  // Dynamic Island
  const islandGeom = new THREE.CapsuleGeometry(0.035, 0.18, 16, 16);
  const islandMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const island = new THREE.Mesh(islandGeom, islandMat);
  island.name = 'DynamicIsland';
  island.position.set(0, 1.34, 0.075);
  group.add(island);

  // Rear Camera Bump & Lenses
  const cameraGroup = new THREE.Group();
  cameraGroup.name = 'CameraModule';
  cameraGroup.position.set(-0.42, 0.95, -0.08);

  const plateauGeom = new THREE.BoxGeometry(0.55, 0.55, 0.04);
  const plateauMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.3, metalness: 0.6 });
  const plateau = new THREE.Mesh(plateauGeom, plateauMat);
  plateau.name = 'CameraPlateau';
  cameraGroup.add(plateau);

  const lensGeom = new THREE.CylinderGeometry(0.09, 0.09, 0.03, 24);
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x030712, roughness: 0.1, metalness: 0.95 });
  
  const lens1 = new THREE.Mesh(lensGeom, lensMat);
  lens1.name = 'Lens1';
  lens1.rotation.x = Math.PI / 2;
  lens1.position.set(-0.14, 0.13, -0.02);
  cameraGroup.add(lens1);

  const lens2 = new THREE.Mesh(lensGeom, lensMat);
  lens2.name = 'Lens2';
  lens2.rotation.x = Math.PI / 2;
  lens2.position.set(-0.14, -0.13, -0.02);
  cameraGroup.add(lens2);

  const lens3 = new THREE.Mesh(lensGeom, lensMat);
  lens3.name = 'Lens3';
  lens3.rotation.x = Math.PI / 2;
  lens3.position.set(0.14, 0, -0.02);
  cameraGroup.add(lens3);

  group.add(cameraGroup);
  return group;
}

// 2. Build Delivery Bike Model
function createDeliveryBike() {
  const group = new THREE.Group();
  group.name = 'DeliveryBikeModel';

  // Main Motorcycle Frame
  const frameGeom = new THREE.BoxGeometry(0.42, 0.5, 1.6);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0FA37F, roughness: 0.35, metalness: 0.2 });
  const frame = new THREE.Mesh(frameGeom, frameMat);
  frame.name = 'BikeFrame';
  frame.position.set(0, 0.5, 0);
  group.add(frame);

  // Wheels (Front & Rear)
  const wheelGeom = new THREE.CylinderGeometry(0.28, 0.28, 0.14, 20);
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0B1F1A, roughness: 0.8 });
  
  const frontWheel = new THREE.Mesh(wheelGeom, tireMat);
  frontWheel.name = 'FrontWheel';
  frontWheel.rotation.z = Math.PI / 2;
  frontWheel.position.set(0, 0.28, 0.65);
  group.add(frontWheel);

  const rearWheel = new THREE.Mesh(wheelGeom, tireMat);
  rearWheel.name = 'RearWheel';
  rearWheel.rotation.z = Math.PI / 2;
  rearWheel.position.set(0, 0.28, -0.65);
  group.add(rearWheel);

  // Handlebars & Headlight
  const handleGeom = new THREE.BoxGeometry(0.65, 0.05, 0.06);
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.8, roughness: 0.2 });
  const handlebars = new THREE.Mesh(handleGeom, metalMat);
  handlebars.name = 'Handlebars';
  handlebars.position.set(0, 0.88, 0.45);
  group.add(handlebars);

  const lightGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
  const light = new THREE.Mesh(lightGeom, lightMat);
  light.name = 'Headlight';
  light.rotation.x = Math.PI / 2;
  light.position.set(0, 0.78, 0.82);
  group.add(light);

  // Insulated Thermal Top Cargo Box in Coral Accent (#FF6B4A)
  const boxGeom = new THREE.BoxGeometry(0.55, 0.55, 0.55);
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xFF6B4A, roughness: 0.4 });
  const cargoBox = new THREE.Mesh(boxGeom, boxMat);
  cargoBox.name = 'CargoBox';
  cargoBox.position.set(0, 0.95, -0.45);
  group.add(cargoBox);

  // Rider Stand-in (Torso & Helmet)
  const riderGroup = new THREE.Group();
  riderGroup.name = 'Rider';
  riderGroup.position.set(0, 0.7, 0.05);

  const torsoGeom = new THREE.BoxGeometry(0.42, 0.65, 0.35);
  const torsoMat = new THREE.MeshStandardMaterial({ color: 0xFF6B4A, roughness: 0.5 });
  const torso = new THREE.Mesh(torsoGeom, torsoMat);
  torso.name = 'RiderTorso';
  torso.position.set(0, 0.32, 0);
  riderGroup.add(torso);

  const helmetGeom = new THREE.SphereGeometry(0.2, 18, 18);
  const helmetMat = new THREE.MeshStandardMaterial({ color: 0x0B1F1A, roughness: 0.3 });
  const helmet = new THREE.Mesh(helmetGeom, helmetMat);
  helmet.name = 'RiderHelmet';
  helmet.position.set(0, 0.76, 0.05);
  riderGroup.add(helmet);

  group.add(riderGroup);
  return group;
}

async function exportToGLB(object, filename) {
  try {
    const exporter = new GLTFExporter();
    console.log(`Starting export of ${filename}...`);
    const gltf = await exporter.parseAsync(object, { binary: true });
    console.log(`Finished parseAsync for ${filename}`);
    const buffer = Buffer.from(gltf);
    for (const dir of outDirs) {
      const filePath = path.join(dir, filename);
      fs.writeFileSync(filePath, buffer);
      console.log(`Saved ${filename} to ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
    }
  } catch (e) {
    console.error(`Export failed for ${filename}:`, e);
  }
}

async function main() {
  console.log('Generating production GLB assets...');
  const phone = createPhone();
  await exportToGLB(phone, 'phone.glb');

  const bike = createDeliveryBike();
  await exportToGLB(bike, 'bike.glb');

  console.log('GLB generation completed successfully!');
}

main().catch(err => {
  console.error('Failed to generate GLBs:', err);
  process.exit(1);
});
