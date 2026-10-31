// src/scenes/PharmacyScene.tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { scrollProgress, isInWindow, W, seg } from '../scroll/progress';
import { PALETTE } from '../config/palette';
import { UltraRealisticPharmacy } from './models/UltraRealisticPharmacy';

const START = W.cameraToPharmacy.start;
const END = W.cameraToPharmacy.end;

// Bezier control points for prescription parcel arcing from cloud to counter:
// Cloud exit position in PharmacyScene local coords (World [0.22, 3.85, -0.35] - [0.6, 0, 0]):
const P0 = new THREE.Vector3(-0.38, 3.85, -0.35);
const P1 = new THREE.Vector3(0.18, 2.65, -0.05);
// Countertop touchdown position in PharmacyScene local coords:
const P2 = new THREE.Vector3(0.80, 1.10, 0.08);

export function PharmacyScene() {
  const groupRef = useRef<THREE.Group>(null);
  const parcelRef = useRef<THREE.Group>(null);
  const parcelMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const ringRef = useRef<THREE.Mesh>(null);

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

    // =========================================================================
    // PRODUCT COMING FROM THE CLOUD TO THE PHARMACY COUNTER (Scene 5 -> Scene 6)
    // Over p in [START, START + 0.065]: Parcel arcs smoothly down from cloud to counter
    // Over p in [START + 0.065, END]: Parcel rests verified on counter for inspection
    // =========================================================================
    if (parcelRef.current) {
      const descendDuration = 0.065; // from 0.31 to 0.375
      const rawT = Math.min(1, Math.max(0, (p - START) / descendDuration));
      const e = seg(rawT);

      // Quadratic Bezier interpolation
      const invE = 1 - e;
      const x = invE * invE * P0.x + 2 * invE * e * P1.x + e * e * P2.x;
      const y = invE * invE * P0.y + 2 * invE * e * P1.y + e * e * P2.y;
      const z = invE * invE * P0.z + 2 * invE * e * P1.z + e * e * P2.z;

      parcelRef.current.position.set(x, y, z);
      parcelRef.current.rotation.y = (1 - e) * Math.PI * 1.8 + e * 0.12;
      parcelRef.current.rotation.x = Math.sin((1 - e) * Math.PI) * 0.25;

      const pScale = 1.0 + Math.sin(invE * Math.PI) * 0.18;
      parcelRef.current.scale.set(pScale, pScale, pScale);

      if (parcelMatRef.current) {
        // High emissive glow descending through sky, settles to verified calm glow on counter
        parcelMatRef.current.emissiveIntensity = 0.4 + invE * 1.8;
      }

      // Verification halo pulse when parcel lands on the counter
      if (ringRef.current) {
        if (rawT >= 0.85) {
          const landT = (rawT - 0.85) / 0.15;
          ringRef.current.visible = true;
          const rScale = 0.35 + landT * 0.45;
          ringRef.current.scale.set(rScale, rScale, 1);
          (ringRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - landT) * 0.75;
        } else {
          ringRef.current.visible = false;
        }
      }
    }
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

      {/* 4. Prescription Product Descending from Cloud onto Pharmacy Counter */}
      <group ref={parcelRef} position={[P0.x, P0.y, P0.z]}>
        {/* Prescription Box with Coral Accent & Medical Rx Cross */}
        <RoundedBox args={[0.48, 0.32, 0.20]} radius={0.015} smoothness={4} position={[0, 0, 0]} castShadow>
          <meshStandardMaterial
            ref={parcelMatRef}
            color={PALETTE.accent}
            emissive={new THREE.Color(PALETTE.accent)}
            emissiveIntensity={1.2}
            roughness={0.25}
            metalness={0.15}
          />
        </RoundedBox>

        {/* Holographic Tamper Seal Strip */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.50, 0.08, 0.21]} />
          <meshStandardMaterial
            color={PALETTE.primary}
            emissive={new THREE.Color(PALETTE.primary)}
            emissiveIntensity={0.6}
            roughness={0.2}
          />
        </mesh>

        {/* Rx Medical Badge on Face */}
        <group position={[0, 0, 0.106]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.14, 0.04, 0.01]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.04, 0.14, 0.01]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        </group>

        {/* Floating Prescription Particle Trail Aura while in flight */}
        <mesh position={[0, -0.16, 0]}>
          <sphereGeometry args={[0.14, 16, 16]} />
          <meshBasicMaterial
            color={PALETTE.accent}
            transparent={true}
            opacity={0.35}
          />
        </mesh>
      </group>

      {/* 5. Countertop Prescription Verification Ripple Ring on Touchdown */}
      <mesh
        ref={ringRef}
        position={[P2.x, 1.065, P2.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <ringGeometry args={[0.45, 0.52, 32]} />
        <meshBasicMaterial color={PALETTE.primary} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}