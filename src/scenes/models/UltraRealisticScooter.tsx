// src/scenes/models/UltraRealisticScooter.tsx
import React, { useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '../../config/palette';
import { BlobShadow } from './BlobShadow';

export const WHEEL_RADIUS = 0.28;

/**
 * Named anchor sockets in scooter local space for anatomical rider placement.
 * Proportioned from human ergonomic standards:
 * - seatAnchor: Center of the saddle seat cushion
 * - footAnchorL/R: Left/right footboard rubber traction ribs
 * - gripAnchorL/R: Ergonomic handlebar ends
 * - headLookAnchor: Line of sight forward along vehicle path
 * - cargoAnchor: Interior of the rear insulated medical cargo box
 */
export const SCOOTER_ANCHORS = {
  seatAnchor: new THREE.Vector3(0, 0.82, -0.16),
  footAnchorL: new THREE.Vector3(-0.14, 0.395, 0.14),
  footAnchorR: new THREE.Vector3(0.14, 0.395, 0.14),
  gripAnchorL: new THREE.Vector3(-0.31, 1.24, 0.32),
  gripAnchorR: new THREE.Vector3(0.31, 1.24, 0.32),
  headLookAnchor: new THREE.Vector3(0, 1.65, 2.5),
  cargoAnchor: new THREE.Vector3(0, 1.14, -0.52),
};

export interface RiderDynamicProps {
  lean?: number;
  roll?: number;
  shrug?: number;
  headLook?: { x?: number; y?: number };
}

interface UltraRealisticScooterProps {
  isMoving?: boolean;
  speedMultiplier?: number;
  travelRef?: { current: number } | React.MutableRefObject<number>;
  turnRate?: number;
  riderDynamics?: RiderDynamicProps;
  pitch?: number;
}

const TREAD_COUNT = 28;
const tempMatrix = new THREE.Matrix4();
const tempPos = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();
const tempEuler = new THREE.Euler();
const tempScale = new THREE.Vector3(1, 1, 1);

/**
 * High-fidelity Scooter Wheel with Torus Tyre (axis X), 32-segment alloy rim,
 * 5 radial alloy spokes, center hub cap, 28-block InstancedMesh tread,
 * coral reflective stripe, rim air valve stem, and disc brake rotor.
 */
function ScooterWheel({
  wheelRef,
  hasRotor = true,
  rotorSide = 1,
}: {
  wheelRef: React.RefObject<THREE.Group>;
  hasRotor?: boolean;
  rotorSide?: number;
}) {
  const treadInstancedRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!treadInstancedRef.current) return;
    const inst = treadInstancedRef.current;
    const r = 0.276;
    for (let i = 0; i < TREAD_COUNT; i++) {
      const angle = (i * Math.PI * 2) / TREAD_COUNT;
      tempPos.set(0, Math.sin(angle) * r, Math.cos(angle) * r);
      tempEuler.set(angle, 0, 0);
      tempQuat.setFromEuler(tempEuler);
      tempMatrix.compose(tempPos, tempQuat, tempScale);
      inst.setMatrixAt(i, tempMatrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <group ref={wheelRef}>
      {/* 1. Vulcanized Rubber Tyre: Torus rotation [0, Math.PI/2, 0] so axis is strictly X */}
      <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
        <torusGeometry args={[0.222, 0.058, 24, 64]} />
        <meshStandardMaterial color="#0B1F1A" roughness={0.88} metalness={0.05} />
      </mesh>

      {/* 2. 28 Circumferential Tread Blocks */}
      <instancedMesh
        ref={treadInstancedRef}
        args={[undefined, undefined, TREAD_COUNT]}
        castShadow
      >
        <boxGeometry args={[0.048, 0.010, 0.024]} />
        <meshStandardMaterial color="#050C0A" roughness={0.92} metalness={0.02} />
      </instancedMesh>

      {/* 3. Machined Alloy Rim: Cylinder axis X, 32 segments */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.175, 0.175, 0.07, 32]} />
        <meshStandardMaterial color="#9CA3AF" metalness={0.92} roughness={0.14} />
      </mesh>

      {/* 4. Center Hub Cap */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.038, 0.038, 0.078, 16]} />
        <meshStandardMaterial color="#E5E7EB" metalness={0.96} roughness={0.08} />
      </mesh>

      {/* 5. 5 Radial Machined Alloy Spokes */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i * Math.PI * 2) / 5;
        return (
          <mesh
            key={i}
            rotation={[angle, 0, 0]}
            position={[0, Math.sin(angle) * 0.10, Math.cos(angle) * 0.10]}
            castShadow
          >
            <boxGeometry args={[0.032, 0.14, 0.02]} />
            <meshStandardMaterial color="#E2E8F0" metalness={0.95} roughness={0.10} />
          </mesh>
        );
      })}

      {/* 6. Coral Reflective Stripe Segment (makes rotation direction clearly visible) */}
      <mesh position={[0.036, 0.135, 0]} castShadow>
        <boxGeometry args={[0.015, 0.045, 0.02]} />
        <meshStandardMaterial
          color="#FF6B4A"
          emissive={new THREE.Color('#FF6B4A')}
          emissiveIntensity={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* 7. Rim Air Valve Stem */}
      <mesh position={[0.038, 0.11, 0.06]} rotation={[0.35, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.004, 0.005, 0.022, 8]} />
        <meshStandardMaterial color="#1F2937" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* 8. Disc Brake Rotor */}
      {hasRotor && (
        <mesh position={[0.045 * rotorSide, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.13, 0.13, 0.008, 24]} />
          <meshStandardMaterial color="#E5E7EB" metalness={0.96} roughness={0.12} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Ultra-Realistic Electric Delivery Scooter with Sculpted Courier Rider & Insulated Cargo Box.
 * Wheel rotation is strictly derived from travelled distance / WHEEL_RADIUS (0.28m).
 * Zero clock or getElapsedTime. Front fork steers with damping.
 */
export function UltraRealisticScooter({
  travelRef,
  turnRate = 0,
  pitch = 0,
}: UltraRealisticScooterProps) {
  const frontWheelRef = useRef<THREE.Group>(null);
  const rearWheelRef = useRef<THREE.Group>(null);
  const frontForkRef = useRef<THREE.Group>(null);
  const scooterBodyRef = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    // Scooter body pitch (+-0.03 rad) on accel/brake
    if (scooterBodyRef.current) {
      scooterBodyRef.current.position.y = 0;
      scooterBodyRef.current.rotation.x = pitch;
      scooterBodyRef.current.rotation.z = 0;
    }

    // Front fork group steers: clamped to [-0.35, 0.35] rad and smoothly damped
    if (frontForkRef.current) {
      const targetSteer = THREE.MathUtils.clamp(turnRate * 0.9, -0.35, 0.35);
      const kSteer = 1 - Math.exp(-14 * Math.min(dt, 0.05));
      frontForkRef.current.rotation.y = THREE.MathUtils.lerp(
        frontForkRef.current.rotation.y,
        targetSteer,
        kSteer
      );
    }

    // Forward roll = POSITIVE rotation.x based directly on actual traveled distance:
    // Wheel rotation = travelRef.current / WHEEL_RADIUS
    // Wheels stop when scroll stops and reverse when scrolling back
    const travel = travelRef ? travelRef.current : 0;
    const rot = travel / WHEEL_RADIUS;
    if (frontWheelRef.current) frontWheelRef.current.rotation.x = rot;
    if (rearWheelRef.current) rearWheelRef.current.rotation.x = rot;
  });

  return (
    <group ref={scooterBodyRef} name="ultra-realistic-scooter-rig">
      {/* Grounding Soft Blob Shadows under whole chassis and both wheel contact patches */}
      <BlobShadow position={[0, 0.003, 0]} scale={[0.75, 1.8]} opacity={0.6} />
      <BlobShadow position={[0, 0.003, 0.62]} scale={[0.22, 0.55]} opacity={0.75} />
      <BlobShadow position={[0, 0.003, -0.56]} scale={[0.24, 0.60]} opacity={0.80} />

      {/* Named Empty Anchor Sockets for Anatomical Rider Placement */}
      <group name="seatAnchor" position={[0, 0.82, -0.16]} />
      <group name="footAnchorL" position={[-0.14, 0.395, 0.14]} />
      <group name="footAnchorR" position={[0.14, 0.395, 0.14]} />
      <group name="gripAnchorL" position={[-0.31, 1.24, 0.32]} />
      <group name="gripAnchorR" position={[0.31, 1.24, 0.32]} />
      <group name="headLookAnchor" position={[0, 1.65, 2.5]} />
      <group name="cargoAnchor" position={[0, 1.14, -0.52]} />

      {/* ========================================================= */}
      {/* 1. MAIN CHASSIS & AERODYNAMIC BODYWORK (STEP-THROUGH)       */}
      {/* ========================================================= */}
      
      {/* Automotive High-Gloss Bodywork (Night Navy #0A1A2F) */}
      <group position={[0, 0.46, 0]}>
        {/* 1) Rear Under-Seat Chassis Fairing (Enclosing battery and rear frame, stops behind step-through volume) */}
        <RoundedBox
          args={[0.34, 0.28, 0.32]}
          radius={0.03}
          smoothness={4}
          position={[0, 0.08, -0.40]}
          castShadow
        >
          <meshStandardMaterial
            color={PALETTE.nightNavy}
            roughness={0.16}
            metalness={0.55}
          />
        </RoundedBox>

        {/* 2) Low Central Step-Through Spine (Leaves leg & shin volume completely unobstructed) */}
        <RoundedBox
          args={[0.12, 0.06, 0.34]}
          radius={0.02}
          smoothness={4}
          position={[0, -0.08, 0.07]}
          castShadow
        >
          <meshStandardMaterial
            color={PALETTE.nightNavy}
            roughness={0.16}
            metalness={0.55}
          />
        </RoundedBox>

        {/* 3) Front Aero Apron / Cowling (Moulded Rounded Box, positioned forward of leg volume) */}
        <RoundedBox
          args={[0.34, 0.44, 0.16]}
          radius={0.03}
          smoothness={4}
          position={[0, 0.30, 0.52]}
          rotation={[0.26, 0, 0]}
          castShadow
        >
          <meshStandardMaterial
            color={PALETTE.nightNavy}
            roughness={0.15}
            metalness={0.58}
          />
        </RoundedBox>

        {/* Steering Column & Handlebar Stem (24 segments) */}
        <mesh position={[0, 0.62, 0.42]} rotation={[-0.20, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.045, 0.46, 24]} />
          <meshStandardMaterial color="#1F2937" metalness={0.85} roughness={0.2} />
        </mesh>

        {/* Flat Anti-Slip Floorboard with Textured Rubber Ribs */}
        <mesh position={[0, -0.09, 0.11]}>
          <boxGeometry args={[0.42, 0.04, 0.50]} />
          <meshStandardMaterial color="#111827" roughness={0.9} />
        </mesh>
        {[-0.12, -0.04, 0.04, 0.12].map((x, i) => (
          <mesh key={i} position={[x, -0.065, 0.08]}>
            <boxGeometry args={[0.02, 0.015, 0.46]} />
            <meshStandardMaterial color="#1F2937" roughness={0.95} />
          </mesh>
        ))}

        {/* Curved Glass Windscreen */}
        <mesh position={[0, 0.72, 0.46]} rotation={[0.36, 0, 0]}>
          <planeGeometry args={[0.34, 0.28]} />
          <meshStandardMaterial
            roughness={0.08}
            transparent
            opacity={0.22}
            depthWrite={false}
            color="#E6FFFA"
          />
        </mesh>

        {/* LED Projector Headlight Array (24 segments) */}
        <group position={[0, 0.38, 0.61]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.085, 0.04, 24]} />
            <meshStandardMaterial color="#374151" metalness={0.9} roughness={0.15} />
          </mesh>
          <mesh position={[0, 0, 0.022]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.01, 24]} />
            <meshStandardMaterial
              color="#FFFFFF"
              emissive={new THREE.Color('#FFFFFF')}
              emissiveIntensity={2.5}
              roughness={0.05}
            />
          </mesh>
        </group>

        {/* Handlebars & Controls (24 segments) */}
        <group position={[0, 0.78, 0.32]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.022, 0.022, 0.68, 24]} />
            <meshStandardMaterial color="#374151" metalness={0.9} roughness={0.2} />
          </mesh>
          {[-0.31, 0.31].map((gx, idx) => (
            <mesh key={idx} position={[gx, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.028, 0.028, 0.12, 24]} />
              <meshStandardMaterial color="#0B1F1A" roughness={0.85} />
            </mesh>
          ))}
          {[-0.26, 0.26].map((lx, idx) => (
            <mesh key={idx} position={[lx, -0.01, 0.04]} rotation={[0.2, idx === 0 ? 0.3 : -0.3, 0]}>
              <boxGeometry args={[0.1, 0.01, 0.015]} />
              <meshStandardMaterial color="#D1D5DB" metalness={0.95} roughness={0.1} />
            </mesh>
          ))}
        </group>

        {/* Ergonomic Dual-Stitched Leather Saddle Seat (Moulded Rounded Box) */}
        <group position={[0, 0.28, -0.16]}>
          <RoundedBox args={[0.34, 0.14, 0.56]} radius={0.03} smoothness={4} position={[0, 0, 0]}>
            <meshStandardMaterial color="#111827" roughness={0.65} metalness={0.1} />
          </RoundedBox>
          <mesh position={[0, 0.08, -0.06]}>
            <boxGeometry args={[0.32, 0.04, 0.32]} />
            <meshStandardMaterial color="#1F2937" roughness={0.6} />
          </mesh>
        </group>
      </group>

      {/* ========================================================= */}
      {/* 2. REALISTIC WHEELS, FORK STEERING & MUDGUARDS             */}
      {/* ========================================================= */}

      {/* Front Wheel & Steering Assembly */}
      <group ref={frontForkRef} position={[0, 0.26, 0.62]}>
        {/* Telescopic Front Fork (Chrome Suspension Tubes) */}
        {[-0.14, 0.14].map((fx, idx) => (
          <mesh key={idx} position={[fx, 0.16, -0.06]} rotation={[-0.22, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.022, 0.38, 16]} />
            <meshStandardMaterial color="#E5E7EB" metalness={0.95} roughness={0.08} />
          </mesh>
        ))}

        {/* Front Mudguard (Curved fender over front tyre) */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.305, 0.305, 0.09, 32, 1, true, -Math.PI * 0.38, Math.PI * 0.72]} />
          <meshStandardMaterial color={PALETTE.nightNavy} roughness={0.18} metalness={0.5} side={THREE.DoubleSide} />
        </mesh>

        {/* Stationary Sport Brake Caliper Mounted to Left Fork */}
        <mesh position={[0.08, 0.08, -0.04]}>
          <boxGeometry args={[0.025, 0.07, 0.08]} />
          <meshStandardMaterial color={PALETTE.accent} roughness={0.25} metalness={0.4} />
        </mesh>

        {/* Rotating Front Wheel (Axis X) */}
        <ScooterWheel wheelRef={frontWheelRef} hasRotor={true} rotorSide={1} />
      </group>

      {/* Rear Mudguard Mounted over Rear Tyre */}
      <mesh position={[0, 0.26, -0.56]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.31, 0.31, 0.10, 32, 1, true, -Math.PI * 0.45, Math.PI * 0.75]} />
        <meshStandardMaterial color={PALETTE.nightNavy} roughness={0.18} metalness={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Rear Wheel Assembly */}
      <group position={[0, 0.26, -0.56]}>
        {/* Monoshock Coil Spring Suspension */}
        <mesh position={[0.12, 0.15, 0.1]} rotation={[0.5, 0, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.26, 12]} />
          <meshStandardMaterial color="#E11D48" roughness={0.3} metalness={0.5} />
        </mesh>

        {/* Rotating Rear Wheel (Axis X) */}
        <ScooterWheel wheelRef={rearWheelRef} hasRotor={true} rotorSide={-1} />
      </group>

      {/* ========================================================= */}
      {/* 4. REAR INSULATED MEDICAL CARGO BOX WITH TELEMETRY DISPLAY */}
      {/* ========================================================= */}
      <group position={[0, 0.68, -0.52]}>
        {/* Moulded Cargo Box Lid fitted cleanly flush on top of cargo box (No floating elements) */}
        <group position={[0, 0.25, 0]}>
          <RoundedBox args={[0.55, 0.03, 0.53]} radius={0.015} smoothness={4} position={[0, 0, 0]} castShadow>
            <meshStandardMaterial color="#1F2937" roughness={0.45} />
          </RoundedBox>
        </group>
        {/* Moulded Main Cargo Body */}
        <RoundedBox args={[0.54, 0.48, 0.52]} radius={0.03} smoothness={4} position={[0, 0, 0]} castShadow>
          <meshStandardMaterial
            color={PALETTE.accent}
            roughness={0.28}
            metalness={0.12}
          />
        </RoundedBox>
        {[
          [-0.27, 0.24, -0.26], [0.27, 0.24, -0.26],
          [-0.27, 0.24, 0.26],  [0.27, 0.24, 0.26]
        ].map(([cx, cy, cz], idx) => (
          <mesh key={idx} position={[cx, cy, cz]}>
            <boxGeometry args={[0.04, 0.08, 0.04]} />
            <meshStandardMaterial color="#111827" roughness={0.9} />
          </mesh>
        ))}
        {[-0.14, 0.14].map((lx, idx) => (
          <mesh key={idx} position={[lx, 0.08, 0.265]}>
            <boxGeometry args={[0.04, 0.07, 0.015]} />
            <meshStandardMaterial color="#E5E7EB" metalness={0.98} roughness={0.08} />
          </mesh>
        ))}
        <group position={[0, 0.04, 0.265]}>
          <mesh>
            <boxGeometry args={[0.18, 0.06, 0.01]} />
            <meshStandardMaterial color="#0B1F1A" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.006]}>
            <planeGeometry args={[0.16, 0.045]} />
            <meshBasicMaterial color="#022C22" />
          </mesh>
          <mesh position={[-0.06, 0, 0.01]}>
            <circleGeometry args={[0.009, 12]} />
            <meshBasicMaterial color={PALETTE.primary} />
          </mesh>
        </group>
        {[-0.275, 0.275].map((sx, idx) => (
          <mesh key={idx} position={[sx, 0.06, 0]} rotation={[0, idx === 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
            <planeGeometry args={[0.34, 0.14]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
