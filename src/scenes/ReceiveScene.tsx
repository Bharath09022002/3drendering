// src/scenes/ReceiveScene.tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollProgress, isInWindow, getLocalProgress, W } from '../scroll/progress';
import { UltraRealisticApartmentHandover } from './models/UltraRealisticApartmentHandover';

const START = W.customerReceives.start;
const END = W.customerReceives.end;

export function ReceiveScene() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const p = scrollProgress.current;
    const inWin = isInWindow(p, START, END, 0.005);
    groupRef.current.visible = inWin;
    if (!inWin) return;

    // Short scale ease-in (0.97 -> 1.0 over 0.01 of progress)
    const entryP = Math.min(1, Math.max(0, (p - (START - 0.005)) / 0.01));
    const exitP = Math.min(1, Math.max(0, ((END + 0.005) - p) / 0.01));
    const cushion = Math.min(entryP, exitP);
    const s = 0.97 + 0.03 * cushion;
    groupRef.current.scale.set(s, s, s);
  });

  const p = scrollProgress.current;
  const localP = getLocalProgress(p, START, END);

  return (
    <group ref={groupRef} name="scene-10-receive" position={[38.5, 0, 4.0]}>
      {/* 1. Apartment Porch Ground / Stone Tile */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 10]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.7} />
      </mesh>

      {/* 2. Ultra-Realistic Apartment Entrance, Resident Customer & Courier Handover */}
      <UltraRealisticApartmentHandover localP={localP} />
    </group>
  );
}