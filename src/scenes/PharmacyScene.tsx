// src/scenes/PharmacyScene.tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollProgress, isInWindow, W } from '../scroll/progress';
import { UltraRealisticPharmacy } from './models/UltraRealisticPharmacy';

const START = W.cameraToPharmacy.start;
const END = W.cameraToPharmacy.end;

export function PharmacyScene() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const p = scrollProgress.current;
    const inWin = isInWindow(p, START, END, 0.005);
    groupRef.current.visible = inWin;
    if (!inWin) return;

    // Short scale ease-in (0.97 -> 1.0 over 0.01 of progress) eliminates sudden visual pop-in
    const entryP = Math.min(1, Math.max(0, (p - (START - 0.005)) / 0.01));
    const exitP = Math.min(1, Math.max(0, ((END + 0.005) - p) / 0.01));
    const cushion = Math.min(entryP, exitP);
    const s = 0.97 + 0.03 * cushion;
    groupRef.current.scale.set(s, s, s);
  });

  return (
    <group ref={groupRef} name="scene-6-pharmacy" position={[0.6, 0, 0]}>
      {/* 1. Realistic Pharmacy Floor (Clean Clinical Tile) */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[16, 14]} />
        <meshStandardMaterial color="#ECEFF1" roughness={0.3} metalness={0.05} />
      </mesh>

      {/* 2. Pharmacy Back Wall with Soft Clinical Mint Hue */}
      <mesh position={[0, 3.5, -3.2]}>
        <planeGeometry args={[16, 8]} />
        <meshStandardMaterial color="#F4F8F6" roughness={0.8} />
      </mesh>

      {/* 3. Ultra-Realistic Pharmacy Counter, Pharmacist & Inventory */}
      <UltraRealisticPharmacy />
    </group>
  );
}