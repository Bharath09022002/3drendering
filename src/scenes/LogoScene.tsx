// src/scenes/LogoScene.tsx
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollProgress, getLocalProgress, isInWindow, W, seg } from '../scroll/progress';
import { PALETTE } from '../config/palette';

const START = W.logoReveal.start;
const END = W.logoReveal.end;

export function LogoScene() {
  const groupRef = useRef<THREE.Group>(null);
  const emblemRef = useRef<THREE.Group>(null);
  const orbitRingRef = useRef<THREE.Mesh>(null);
  const duskDomeRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();
  const isMobile = viewport.width < 7.0;

  useFrame(() => {
    if (!groupRef.current) return;
    const p = scrollProgress.current;
    const inWin = isInWindow(p, START, END, 0.005);
    groupRef.current.visible = inWin;

    if (!inWin) return;

    // Short scale ease-in (0.97 -> 1.0 over 0.01 of progress)
    const entryP = Math.min(1, Math.max(0, (p - (START - 0.005)) / 0.01));
    const cushion = entryP;
    const s = 0.97 + 0.03 * cushion;
    groupRef.current.scale.set(s, s, s);

    const localP = getLocalProgress(p, START, END);
    const easeP = seg(localP);

    // Responsive position: right side on desktop (1.1), centered on mobile (0)
    const targetX = isMobile ? 0 : 1.1;
    const targetY = isMobile ? -0.35 : 0.05;

    // 3D Capsule emblem assemble, settle, and gentle idle floating rotation
    if (emblemRef.current) {
      const scale = 0.9 + easeP * 0.2;
      emblemRef.current.scale.set(scale, scale, scale);
      emblemRef.current.position.set(targetX, targetY, 0);

      // Subtle dynamic float and rotation
      emblemRef.current.rotation.y = (1 - easeP) * -0.5 + Math.sin(localP * Math.PI * 2) * 0.12;
      emblemRef.current.rotation.x = 0.25 + Math.sin(easeP * Math.PI) * 0.05;
      emblemRef.current.rotation.z = -0.45; // Classic dynamic 45° pharmaceutical tilt
    }

    // Emissive teal ring orbital spin
    if (orbitRingRef.current) {
      orbitRingRef.current.rotation.z = localP * Math.PI * 0.8;
    }

    // Smooth night navy dusk backdrop fade
    if (duskDomeRef.current) {
      (duskDomeRef.current.material as THREE.MeshBasicMaterial).opacity = Math.min(0.98, easeP * 1.25);
    }
  });

  return (
    <group ref={groupRef} name="scene-11-logo">
      {/* 1. Night Navy Dusk Reveal Backdrop (#0A1A2F) */}
      <mesh ref={duskDomeRef} position={[0, 0, -3]}>
        <planeGeometry args={[36, 26]} />
        <meshBasicMaterial color={PALETTE.nightNavy} transparent opacity={0} />
      </mesh>

      {/* 2. Hero Pharmaceutical Dual-Tone Capsule */}
      <group ref={emblemRef} position={[1.1, 0.05, 0]}>
        {/* Upper Half: Glossy Emerald Teal (#0FA37F) */}
        <group position={[0, 0.35, 0]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.42, 0.42, 0.7, 32]} />
            <meshStandardMaterial
              color={PALETTE.primaryFill}
              emissive={new THREE.Color(PALETTE.primaryFill)}
              emissiveIntensity={0.35}
              roughness={0.08}
              metalness={0.1}
            />
          </mesh>
          {/* Top Dome Cap */}
          <mesh position={[0, 0.35, 0]}>
            <sphereGeometry args={[0.42, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color={PALETTE.primaryFill}
              emissive={new THREE.Color(PALETTE.primaryFill)}
              emissiveIntensity={0.35}
              roughness={0.08}
              metalness={0.1}
            />
          </mesh>
        </group>

        {/* Lower Half: Polished White (#FFFFFF) */}
        <group position={[0, -0.35, 0]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.42, 0.42, 0.7, 32]} />
            <meshStandardMaterial
              color="#FFFFFF"
              roughness={0.08}
              metalness={0.05}
            />
          </mesh>
          {/* Bottom Dome Cap */}
          <mesh position={[0, -0.35, 0]} rotation={[Math.PI, 0, 0]}>
            <sphereGeometry args={[0.42, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color="#FFFFFF"
              roughness={0.08}
              metalness={0.05}
            />
          </mesh>
        </group>

        {/* Center Metallic Seam Ring */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.43, 0.43, 0.05, 32]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.8} roughness={0.15} />
        </mesh>

        {/* Emissive Teal Orbital Halo Ring (#0FA37F) */}
        <mesh ref={orbitRingRef} position={[0, 0, 0]} rotation={[Math.PI / 2.5, 0.2, 0]}>
          <torusGeometry args={[1.15, 0.03, 16, 72]} />
          <meshStandardMaterial
            color={PALETTE.primaryFill}
            emissive={new THREE.Color(PALETTE.primaryFill)}
            emissiveIntensity={2.0}
            roughness={0.1}
          />
        </mesh>
      </group>
    </group>
  );
}