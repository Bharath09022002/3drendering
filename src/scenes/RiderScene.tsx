// src/scenes/RiderScene.tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollProgress, getLocalProgress, isInWindow, W, seg } from '../scroll/progress';
import { PALETTE } from '../config/palette';
import { BlobShadow } from './models/BlobShadow';
import { Human, HumanRef } from './models/Human';

const START = W.riderPickup.start;
const END = W.riderPickup.end;

export const riderTravel = { current: 0 };

export function RiderScene() {
  const groupRef = useRef<THREE.Group>(null);
  const packageRef = useRef<THREE.Group>(null);
  const scooterGroupRef = useRef<THREE.Group>(null);
  const pharmacistGroupRef = useRef<THREE.Group>(null);
  const pharmacistRef = useRef<HumanRef>(null);
  const cargoLidRef = useRef<THREE.Group>(null);
  const verifyLatchMatRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const p = scrollProgress.current;
    const inWin = isInWindow(p, START, END);
    groupRef.current.visible = inWin;

    if (!inWin) return;

    const localP = getLocalProgress(p, START, END);

    // =========================================================================
    // 1. PHARMACIST HANDOVER TO DELIVERY RIDER (Character Rig + IK)
    // 5 States over action window (0.12 - 0.88):
    // Walk out -> Plant feet -> Place parcel (IK) -> Step back 0.4m -> Wave
    // =========================================================================
    if (pharmacistGroupRef.current) {
      if (localP < 0.12) {
        // Hold at door entrance
        pharmacistGroupRef.current.position.set(-0.8, 0, -1.4);
        pharmacistGroupRef.current.rotation.y = 0.50;
        pharmacistRef.current?.setPose({
          distanceWalked: 0,
          isWalking: false,
          reachAmount: 1.0,
          reachTarget: new THREE.Vector3(0, 1.05, 0.28),
        });
        if (packageRef.current) {
          packageRef.current.position.set(0, 1.05, 0.28);
          packageRef.current.scale.setScalar(1.0);
          packageRef.current.visible = true;
        }
        if (cargoLidRef.current) cargoLidRef.current.rotation.x = -0.8;
        if (verifyLatchMatRef.current) verifyLatchMatRef.current.emissiveIntensity = 0;
      } else if (localP < 0.42) {
        // State 1: Walk out from dispatch door [-0.8, 0, -1.4] to curbside [0.35, 0, -0.45]
        const walkP = seg(localP, 0.12, 0.42);
        const curX = -0.8 + walkP * 1.15;
        const curZ = -1.4 + walkP * 0.95;
        pharmacistGroupRef.current.position.set(curX, 0, curZ);
        pharmacistGroupRef.current.rotation.y = 0.50 - walkP * 0.18;

        const walkDist = walkP * 1.492;
        pharmacistRef.current?.setPose({
          distanceWalked: walkDist,
          isWalking: true,
          reachAmount: 1.0,
          reachTarget: new THREE.Vector3(0, 1.05, 0.28),
        });

        // Parcel firmly held in hands (parented directly in pharmacist group)
        if (packageRef.current) {
          packageRef.current.position.set(0, 1.05, 0.28);
          packageRef.current.scale.setScalar(1.0);
          packageRef.current.visible = true;
        }
        if (cargoLidRef.current) cargoLidRef.current.rotation.x = -0.8;
        if (verifyLatchMatRef.current) verifyLatchMatRef.current.emissiveIntensity = 0;
      } else if (localP < 0.48) {
        // State 2: Plant feet at curbside
        pharmacistGroupRef.current.position.set(0.35, 0, -0.45);
        pharmacistGroupRef.current.rotation.y = 0.32;

        pharmacistRef.current?.setPose({
          distanceWalked: 1.492,
          isWalking: false,
          reachAmount: 1.0,
          reachTarget: new THREE.Vector3(0, 1.05, 0.28),
        });

        if (packageRef.current) {
          packageRef.current.position.set(0, 1.05, 0.28);
          packageRef.current.scale.setScalar(1.0);
          packageRef.current.visible = true;
        }
        if (cargoLidRef.current) cargoLidRef.current.rotation.x = -0.8;
      } else if (localP < 0.64) {
        // State 3: Place parcel (IK) with slight bend of spine into rear cargo box
        const placeP = seg(localP, 0.48, 0.64);
        pharmacistGroupRef.current.position.set(0.35, 0, -0.45);
        pharmacistGroupRef.current.rotation.y = 0.32;

        const targetX = 0.08 * placeP;
        const targetY = 1.05 - 0.18 * placeP;
        const targetZ = 0.28 + 0.45 * placeP;

        pharmacistRef.current?.setPose({
          distanceWalked: 1.492,
          isWalking: false,
          lean: 0.20 * Math.sin(placeP * Math.PI),
          reachAmount: 1.0,
          reachTarget: new THREE.Vector3(targetX, targetY, targetZ),
        });

        if (packageRef.current) {
          packageRef.current.position.set(targetX, targetY, targetZ);
          packageRef.current.scale.setScalar(Math.max(0.1, 1.0 - placeP * 0.75));
          packageRef.current.visible = placeP < 0.95;
        }

        // Cargo lid closes as parcel securely enters
        if (cargoLidRef.current) {
          cargoLidRef.current.rotation.x = -0.8 * (1 - placeP);
        }

        if (verifyLatchMatRef.current) {
          verifyLatchMatRef.current.emissiveIntensity = Math.sin(placeP * Math.PI) * 2.8;
        }
      } else if (localP < 0.76) {
        // State 4: Step back 0.4m from curbside into clear buffer zone
        const stepP = seg(localP, 0.64, 0.76);
        pharmacistGroupRef.current.position.set(
          0.35 - 0.126 * stepP,
          0,
          -0.45 - 0.380 * stepP
        );
        pharmacistGroupRef.current.rotation.y = 0.32;

        // Backward walk stride
        pharmacistRef.current?.setPose({
          distanceWalked: 1.492 - stepP * 0.4,
          isWalking: true,
          reachAmount: 1.0 - stepP,
        });

        if (packageRef.current) packageRef.current.visible = false;
        if (cargoLidRef.current) cargoLidRef.current.rotation.x = 0;
        if (verifyLatchMatRef.current) verifyLatchMatRef.current.emissiveIntensity = 0;
      } else if (localP < 0.88) {
        // State 5: Relaxed arms + one small wave to scooter departing
        const waveP = seg(localP, 0.76, 0.88);
        pharmacistGroupRef.current.position.set(0.35 - 0.126, 0, -0.45 - 0.380);
        pharmacistGroupRef.current.rotation.y = 0.32;

        pharmacistRef.current?.setPose({
          distanceWalked: 1.492 - 0.4,
          isWalking: false,
          wave: Math.sin(waveP * Math.PI),
          headLook: 0.35 * waveP,
        });

        if (packageRef.current) packageRef.current.visible = false;
        if (cargoLidRef.current) cargoLidRef.current.rotation.x = 0;
        if (verifyLatchMatRef.current) verifyLatchMatRef.current.emissiveIntensity = 0;
      } else {
        // Hold at curbside watching departure
        pharmacistGroupRef.current.position.set(0.35 - 0.126, 0, -0.45 - 0.380);
        pharmacistRef.current?.setPose({
          distanceWalked: 1.492 - 0.4,
          isWalking: false,
          reachAmount: 0,
          headLook: 0.35,
        });
        if (packageRef.current) packageRef.current.visible = false;
      }
    }

    // =========================================================================
    // 2. SCOOTER ORIENTATION & DEPARTURE (localP: 0.58 -> 0.72 -> 1.0)
    // =========================================================================
    if (scooterGroupRef.current) {
      const dirX = 2.5; // [1.1, 0, 0.2] -> [3.6, 0, 0.5] (World [1.7, 0, 0.2] -> [4.2, 0, 0.5])
      const dirZ = 0.3;
      const targetAngle = Math.atan2(dirX, dirZ); // 1.4517 rad

      if (localP < 0.58) {
        // Parked curbside
        scooterGroupRef.current.position.set(1.1, 0, 0.2);
        scooterGroupRef.current.rotation.y = -0.25;
        riderTravel.current = 0;
      } else if (localP <= 0.72) {
        // Ease rotation.y from -0.25 to atan2(dirX, dirZ) over localP 0.58-0.72 (no sideways sliding)
        const turnT = (localP - 0.58) / (0.72 - 0.58);
        const easeTurn = turnT * turnT * (3 - 2 * turnT);
        scooterGroupRef.current.position.set(1.1, 0, 0.2);
        scooterGroupRef.current.rotation.y = -0.25 + easeTurn * (targetAngle - (-0.25));
        riderTravel.current = 0;
      } else {
        // Move straight along heading into roadway
        const launchT = (localP - 0.72) / (1.0 - 0.72);
        const easeLaunch = launchT * launchT * (3 - 2 * launchT);
        scooterGroupRef.current.position.x = 1.1 + easeLaunch * dirX;
        scooterGroupRef.current.position.z = 0.2 + easeLaunch * dirZ;

        // Smoothly blend to curve start tangent at boundary
        const curveTangentAngle = 1.3501;
        const angleBlend = easeLaunch > 0.75 ? (easeLaunch - 0.75) / 0.25 : 0;
        scooterGroupRef.current.rotation.y = targetAngle + angleBlend * (curveTangentAngle - targetAngle);

        // Distance traveled driving forward (drives positive wheel rotation)
        riderTravel.current = easeLaunch * 5.1;
      }
    }
  });

  return (
    <group ref={groupRef} name="scene-8-rider-pickup" position={[0.6, 0, 0]}>
      {/* 1. Curbside Asphalt & Pavement */}
      <mesh position={[1.5, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 14]} />
        <meshStandardMaterial color="#CFD8DC" roughness={0.8} />
      </mesh>

      {/* Curbside Parking Markings */}
      <group position={[1.1, 0.002, 0.2]}>
        <mesh position={[-0.8, 0, -1.4]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[5.0, 0.15]} />
          <meshBasicMaterial color="#FBBF24" />
        </mesh>
        <mesh position={[-0.6, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.08, 2.0]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0.6, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.08, 2.0]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      </group>

      {/* 2. Pharmacy Exterior Storefront with Glass Windows & Sign */}
      <group position={[0.5, 2.2, -2.4]}>
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[14, 5.2]} />
          <meshStandardMaterial color="#ECEFF1" roughness={0.7} />
        </mesh>

        <mesh position={[2.0, 0, 0.05]}>
          <planeGeometry args={[4.4, 3.2]} />
          <meshStandardMaterial
            color="#FFFFFF"
            roughness={0.08}
            transparent
            opacity={0.22}
            depthWrite={false}
          />
        </mesh>

        {/* Storefront Illuminated Sign */}
        <group position={[1.8, 2.05, 0.1]}>
          <mesh>
            <boxGeometry args={[4.6, 0.72, 0.12]} />
            <meshStandardMaterial color="#0B1F1A" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.07]}>
            <planeGeometry args={[4.4, 0.58]} />
            <meshStandardMaterial
              color={PALETTE.primary}
              emissive={new THREE.Color(PALETTE.primary)}
              emissiveIntensity={0.85}
            />
          </mesh>
        </group>

        {/* Pharmacy Dispatch Glass Sliding Door on the left */}
        <group position={[-1.7, -0.7, 0.06]}>
          <mesh>
            <boxGeometry args={[2.0, 3.2, 0.08]} />
            <meshStandardMaterial color="#1F2937" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[1.7, 2.9]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.08} transparent opacity={0.20} depthWrite={false} />
          </mesh>
        </group>
      </group>

      {/* 3. CLINICAL PHARMACIST FIGURE (Rigged Skeletal Human with IK Handover) */}
      <group ref={pharmacistGroupRef} position={[-0.8, 0, -1.4]}>
        <BlobShadow position={[0, 0.003, 0]} scale={[0.85, 0.65]} opacity={0.65} />
        <Human
          ref={pharmacistRef}
          role="pharmacist"
          scale={1.0}
        />

        {/* 4. Active Moving Sealed Medical Parcel (Amoxicillin 500mg, parented directly to pharmacist hands/IK) */}
        <group ref={packageRef} position={[0, 1.05, 0.28]}>
          <mesh>
            <boxGeometry args={[0.32, 0.24, 0.20]} />
            <meshStandardMaterial color={PALETTE.primary} roughness={0.35} />
          </mesh>
          {/* Tamper Evident Barcode Seal Strip */}
          <mesh position={[0, 0, 0.105]}>
            <boxGeometry args={[0.16, 0.12, 0.01]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        </group>
      </group>
    </group>
  );
}
