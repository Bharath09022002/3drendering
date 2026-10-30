// src/scenes/CloudScene.tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollProgress, getLocalProgress, isInWindow, W, seg } from '../scroll/progress';
import { PALETTE } from '../config/palette';

const START = W.orderToCloud.start;
const END = W.orderToCloud.end;

// Cloud puff coordinates for realistic airy cumulus volume
const CLOUD_PUFFS = [
  { pos: [0, 0, 0], scale: 1.35 },
  { pos: [-0.95, -0.2, 0.25], scale: 1.05 },
  { pos: [0.92, -0.15, -0.2], scale: 1.15 },
  { pos: [-0.45, 0.55, -0.3], scale: 0.95 },
  { pos: [0.55, 0.50, 0.35], scale: 0.90 },
  { pos: [-1.45, -0.35, -0.15], scale: 0.82 },
  { pos: [1.38, -0.3, 0.2], scale: 0.88 },
  { pos: [0, 0.8, -0.1], scale: 0.78 },
  { pos: [-0.6, -0.45, 0.45], scale: 0.75 },
  { pos: [0.7, -0.4, -0.4], scale: 0.80 },
];

export function CloudScene() {
  const groupRef = useRef<THREE.Group>(null);
  const packetRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Group>(null);
  const packetMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const p = scrollProgress.current;
    const inWin = isInWindow(p, START, END, 0.02);
    groupRef.current.visible = inWin;

    if (!inWin) return;

    const localP = getLocalProgress(p, START, END);
    const easeT = seg(localP);

    // Order packet ascends smoothly with glowing trail towards cloud (emerges directly from phone at 0.88)
    const isMobileDevice = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    const startX = isMobileDevice ? 0 : 0.88;
    if (packetRef.current) {
      packetRef.current.position.y = -0.5 + easeT * 4.4;
      packetRef.current.position.x = startX * (1 - easeT * 0.75); // Centers as it reaches cloud
      packetRef.current.position.z = 0.2 - easeT * 0.5;
      packetRef.current.rotation.y = easeT * Math.PI * 2.8;
      packetRef.current.rotation.x = Math.sin(easeT * Math.PI) * 0.35;

      const s = 1.0 + Math.sin(easeT * Math.PI) * 0.22;
      packetRef.current.scale.set(s, s, s);

      if (packetMatRef.current) {
        packetMatRef.current.emissiveIntensity = 1.2 + Math.sin(easeT * Math.PI) * 2.2;
      }
    }

    // Cloud billow subtle floating rotation
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = localP * 0.22;
      cloudsRef.current.position.y = 3.6 + Math.sin(localP * Math.PI) * 0.12;
    }

    // Expanding dispatch radar signal rings
    if (ring1Ref.current && ring2Ref.current) {
      const ring1Scale = 0.8 + localP * 2.5;
      const ring2Scale = 0.4 + localP * 2.2;
      ring1Ref.current.scale.set(ring1Scale, ring1Scale, 1);
      ring2Ref.current.scale.set(ring2Scale, ring2Scale, 1);

      (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, Math.sin(localP * Math.PI) * 0.75);
      (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, Math.sin((localP + 0.18) * Math.PI) * 0.55);
    }
  });

  return (
    <group ref={groupRef} name="scene-5-cloud">
      {/* 1. Ascending Glowing Prescription Order Parcel */}
      <group ref={packetRef} position={[0.88, -0.5, 0.2]}>
        {/* Parcel Thermal Box with Coral Accent Emissive Material */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.55, 0.38, 0.22]} />
          <meshStandardMaterial
            ref={packetMatRef}
            color={PALETTE.accent}
            emissive={new THREE.Color(PALETTE.accent)}
            emissiveIntensity={1.2}
            roughness={0.25}
            metalness={0.15}
          />
        </mesh>

        {/* Holographic Tamper Seal Strip */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.57, 0.10, 0.23]} />
          <meshStandardMaterial
            color={PALETTE.primary}
            emissive={new THREE.Color(PALETTE.primary)}
            emissiveIntensity={0.8}
            roughness={0.2}
          />
        </mesh>

        {/* Rx Medical Badge on Package Face */}
        <group position={[0, 0, 0.116]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.16, 0.045, 0.01]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.045, 0.16, 0.01]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        </group>

        {/* Glowing Trailing Particle Aura */}
        <mesh position={[0, -0.22, 0]}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshBasicMaterial
            color={PALETTE.accent}
            transparent={true}
            opacity={0.45}
          />
        </mesh>
      </group>

      {/* 2. Soft Airy Volumetric-Style Cumulus Cloud Cluster */}
      <group ref={cloudsRef} position={[0.2, 3.6, -0.4]}>
        {CLOUD_PUFFS.map((puff, i) => (
          <mesh key={i} position={puff.pos as [number, number, number]}>
            <sphereGeometry args={[puff.scale, 28, 28]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? PALETTE.bg : PALETTE.mint}
              roughness={0.92}
              metalness={0.02}
              transparent={true}
              opacity={0.78}
            />
          </mesh>
        ))}

        {/* Dispatch Georouting Target Node (glowing emerald pin) */}
        <group position={[0, 0.1, 0.4]}>
          <mesh>
            <octahedronGeometry args={[0.22, 0]} />
            <meshStandardMaterial
              color={PALETTE.primary}
              emissive={new THREE.Color(PALETTE.primary)}
              emissiveIntensity={1.8}
              roughness={0.1}
            />
          </mesh>

          {/* Pulse Signal Radar Rings */}
          <mesh ref={ring1Ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
            <ringGeometry args={[0.55, 0.62, 32]} />
            <meshBasicMaterial color={PALETTE.primary} transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
          <mesh ref={ring2Ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
            <ringGeometry args={[0.85, 0.92, 32]} />
            <meshBasicMaterial color={PALETTE.primary} transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
    </group>
  );
}