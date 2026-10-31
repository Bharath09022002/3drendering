// src/scenes/models/UltraRealisticPharmacy.tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '../../config/palette';
import { BlobShadow } from './BlobShadow';
import { Human } from './Human';

/**
 * Ultra-Realistic Clinical Pharmacy Counter & Doctor/Pharmacist Model.
 * Features architectural fluted counter, Italian Corian top, digital verification terminal,
 * illuminated green cross, and an anatomically detailed pharmacist in a tailored lab coat.
 */
export function UltraRealisticPharmacy() {
  const terminalScreenRef = useRef<THREE.Mesh>(null);
  const scannerLaserRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Subtle pulsing checkmark glow on the POS terminal screen
    if (terminalScreenRef.current) {
      const mat = terminalScreenRef.current.material as THREE.MeshStandardMaterial;
      if (mat) mat.emissiveIntensity = 0.65 + Math.sin(t * 4) * 0.25;
    }
    // Barcode scanner laser micro-sweep
    if (scannerLaserRef.current) {
      scannerLaserRef.current.position.z = 0.12 + Math.sin(t * 3) * 0.08;
    }
  });

  return (
    <group name="ultra-realistic-pharmacy-rig">
      {/* ========================================================= */}
      {/* 1. CLINICAL PHARMACIST FIGURE (Rigged Skeletal Human)     */}
      {/* ========================================================= */}
      <group position={[1.4, 0, -0.65]}>
        <BlobShadow position={[0, 0.003, 0]} scale={[0.85, 0.65]} opacity={0.65} />
        <Human
          role="pharmacist"
          scale={1.0}
        />
      </group>

      {/* ========================================================= */}
      {/* 2. ARCHITECTURAL FLUTED PHARMACY COUNTER                  */}
      {/* ========================================================= */}
      <group position={[0.8, 0, 0]}>
        {/* Main Base Body with Fluted Wood Slats */}
        <mesh position={[0, 0.52, 0]}>
          <boxGeometry args={[2.8, 1.04, 1.0]} />
          <meshStandardMaterial color="#0B2B22" roughness={0.4} />
        </mesh>
        {/* Fluted Vertical Ribs along Counter Front */}
        {Array.from({ length: 24 }).map((_, i) => {
          const x = -1.32 + i * 0.115;
          return (
            <mesh key={i} position={[x, 0.52, 0.51]}>
              <boxGeometry args={[0.045, 1.0, 0.02]} />
              <meshStandardMaterial color="#115E59" roughness={0.35} metalness={0.15} />
            </mesh>
          );
        })}

        {/* Polished White Italian Corian Countertop with Chamfered Edge (Moulded Rounded Box) */}
        <RoundedBox args={[3.0, 0.08, 1.15]} radius={0.02} smoothness={4} position={[0, 1.06, 0]}>
          <meshStandardMaterial
            color="#FFFFFF"
            roughness={0.15}
            metalness={0.04}
          />
        </RoundedBox>

        {/* POS Touchscreen Verification Terminal on Swivel Arm (24 segments) */}
        <group position={[0.6, 1.1, 0.15]} rotation={[0, -0.35, 0]}>
          {/* Brushed Metal Base & Arm */}
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.08, 0.09, 0.04, 24]} />
            <meshStandardMaterial color="#9CA3AF" metalness={0.92} roughness={0.15} />
          </mesh>
          <mesh position={[0, 0.18, 0]} rotation={[0.2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.32, 24]} />
            <meshStandardMaterial color="#9CA3AF" metalness={0.92} roughness={0.15} />
          </mesh>
          {/* Display Housing */}
          <mesh position={[0, 0.36, 0.04]} rotation={[-0.32, 0, 0]}>
            <boxGeometry args={[0.48, 0.32, 0.03]} />
            <meshStandardMaterial color="#1F2937" roughness={0.25} metalness={0.8} />
          </mesh>
          {/* Emissive UI Screen: Active Prescription Match Verification */}
          <mesh ref={terminalScreenRef} position={[0, 0.36, 0.056]} rotation={[-0.32, 0, 0]}>
            <planeGeometry args={[0.44, 0.28]} />
            <meshStandardMaterial
              color="#0B1F1A"
              emissive={new THREE.Color('#0FA37F')}
              emissiveIntensity={0.65}
              roughness={0.1}
            />
          </mesh>
        </group>

        {/* Barcode Optic Scanner on Cradle */}
        <group position={[-0.2, 1.1, 0.18]} rotation={[0, 0.4, 0]}>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.1, 0.12, 0.14]} />
            <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Optic Scanner Laser Sweep Stripe */}
          <mesh ref={scannerLaserRef} position={[0, 0.12, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.14, 0.015]} />
            <meshBasicMaterial color="#EF4444" />
          </mesh>
        </group>

        {/* Prescription Clipboard & Clinical Pen */}
        <group position={[-0.7, 1.11, 0.08]} rotation={[0, 0.15, 0]}>
          <mesh>
            <boxGeometry args={[0.3, 0.015, 0.42]} />
            <meshStandardMaterial color="#78350F" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.01, 0]}>
            <planeGeometry args={[0.26, 0.36]} />
            <meshStandardMaterial color="#FAFAFA" roughness={0.8} />
          </mesh>
        </group>
      </group>

      {/* ========================================================= */}
      {/* 3. WALL SHELVING, AMBER MEDICINE BOTTLES & PHARMACY CROSS */}
      {/* ========================================================= */}
      <group position={[0.8, 2.2, -1.8]}>
        {/* Floating Glass Display Shelves on Brass Brackets (Moulded Rounded Box) */}
        {[0, 0.8, 1.6].map((sy, sIdx) => (
          <group key={sIdx} position={[0, sy, 0]}>
            {/* Tempered Glass Shelf */}
            <RoundedBox args={[3.2, 0.03, 0.4]} radius={0.01} smoothness={4} position={[0, 0, 0]}>
              <meshStandardMaterial
                color="#E6FFFA"
                roughness={0.08}
                transparent
                opacity={0.25}
                depthWrite={false}
              />
            </RoundedBox>
            {/* Satin Brass Wall Mounts */}
            {[-1.2, 1.2].map((bx, bIdx) => (
              <mesh key={bIdx} position={[bx, -0.08, -0.1]}>
                <boxGeometry args={[0.04, 0.14, 0.18]} />
                <meshStandardMaterial color="#D97706" metalness={0.9} roughness={0.2} />
              </mesh>
            ))}

            {/* Amber Glass Medication Syrup Bottles */}
            {[-1.0, -0.7, -0.4, 0.2, 0.5, 0.8].map((ox, bIdx) => (
              <group key={bIdx} position={[ox, 0.16, 0.02]}>
                <mesh>
                  <cylinderGeometry args={[0.045, 0.045, 0.22, 16]} />
                  <meshStandardMaterial
                    color="#B45309"
                    roughness={0.12}
                    transparent
                    opacity={0.75}
                    depthWrite={false}
                  />
                </mesh>
                {/* White Childproof Cap */}
                <mesh position={[0, 0.12, 0]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.04, 16]} />
                  <meshStandardMaterial color="#F9FAFB" roughness={0.3} />
                </mesh>
                {/* Prescription Label */}
                <mesh position={[0, 0, 0.046]}>
                  <planeGeometry args={[0.065, 0.12]} />
                  <meshStandardMaterial color="#FFFFFF" roughness={0.7} />
                </mesh>
              </group>
            ))}
          </group>
        ))}

        {/* Illuminated Pharmacy Green Cross Sign (#0FA37F) */}
        <group position={[-1.8, 1.4, 0.1]}>
          <mesh>
            <boxGeometry args={[0.65, 0.22, 0.08]} />
            <meshStandardMaterial
              color={PALETTE.primary}
              emissive={new THREE.Color(PALETTE.primary)}
              emissiveIntensity={1.8}
            />
          </mesh>
          <mesh>
            <boxGeometry args={[0.22, 0.65, 0.08]} />
            <meshStandardMaterial
              color={PALETTE.primary}
              emissive={new THREE.Color(PALETTE.primary)}
              emissiveIntensity={1.8}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}
