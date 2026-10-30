// src/scenes/models/Character.tsx
import { useRef, useImperativeHandle, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE } from '../../config/palette';

export interface PoseParams {
  walkPhase?: number;
  walkAmount?: number;
  reachTarget?: THREE.Vector3;
  reachTargetL?: THREE.Vector3;
  reachTargetR?: THREE.Vector3;
  reachAmount?: number;
  lean?: number;
  roll?: number;
  shrug?: number;
  headLook?: { x?: number; y?: number };
  wave?: number;
  nod?: number;
  seated?: boolean;
}

export interface CharacterRef {
  setPose: (params: PoseParams) => void;
  getAngularVelocity: () => number; // Average joint angular speed for Gate 3 audit
}

export interface CharacterProps {
  skinTone?: string;
  coatColor?: string;
  pantsColor?: string;
  hairColor?: string;
  hasLabCoat?: boolean;
  hasHelmet?: boolean;
  hasGloves?: boolean;
  hasStethoscope?: boolean;
  hasBadge?: boolean;
  scale?: number;
}

const STRIDE_LENGTH = 0.85;

// Temp vectors for analytic IK
const tempArmDir = new THREE.Vector3();
const tempTargetLocal = new THREE.Vector3();

/**
 * Analytic 2-bone IK solver for shoulder -> elbow -> hand
 * Upper arm length L1 = 0.28m, Forearm length L2 = 0.26m
 */
function solveTwoBoneIK(
  shoulderPos: THREE.Vector3,
  targetPos: THREE.Vector3,
  isLeft: boolean
): { shoulderRot: [number, number, number]; elbowFlex: number } {
  tempTargetLocal.subVectors(targetPos, shoulderPos);
  const L1 = 0.28;
  const L2 = 0.26;
  const maxReach = (L1 + L2) * 0.999;
  const minReach = Math.abs(L1 - L2) + 0.01;
  const dist = THREE.MathUtils.clamp(tempTargetLocal.length(), minReach, maxReach);

  // Law of cosines
  const cosAlpha = (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist);
  const alpha = Math.acos(THREE.MathUtils.clamp(cosAlpha, -1, 1));

  const cosBeta = (L1 * L1 + L2 * L2 - dist * dist) / (2 * L1 * L2);
  const beta = Math.PI - Math.acos(THREE.MathUtils.clamp(cosBeta, -1, 1));

  tempArmDir.copy(tempTargetLocal).normalize();
  const pitch = Math.atan2(tempArmDir.z, -tempArmDir.y) + alpha * 0.5;
  const yaw = Math.atan2(tempArmDir.x, -tempArmDir.y) * (isLeft ? 1 : 1);

  return {
    shoulderRot: [pitch, yaw, isLeft ? -0.15 : 0.15],
    elbowFlex: beta,
  };
}

export const Character = forwardRef<CharacterRef, CharacterProps>(function Character(
  {
    skinTone = '#D1A384',
    coatColor = '#FFFFFF',
    pantsColor = '#1E293B',
    hairColor = '#1F2937',
    hasLabCoat = false,
    hasHelmet = false,
    hasGloves = false,
    hasStethoscope = false,
    hasBadge = false,
    scale = 1.0,
  },
  ref
) {
  // Pivot Groups
  const rootGroupRef = useRef<THREE.Group>(null);
  const hipsGroupRef = useRef<THREE.Group>(null);
  const spineGroupRef = useRef<THREE.Group>(null);
  const chestGroupRef = useRef<THREE.Group>(null);
  const neckGroupRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);

  // Left Arm Chain
  const shoulderLRef = useRef<THREE.Group>(null);
  const elbowLRef = useRef<THREE.Group>(null);
  const handLRef = useRef<THREE.Group>(null);

  // Right Arm Chain
  const shoulderRRef = useRef<THREE.Group>(null);
  const elbowRRef = useRef<THREE.Group>(null);
  const handRRef = useRef<THREE.Group>(null);

  // Left Leg Chain
  const hipLRef = useRef<THREE.Group>(null);
  const kneeLRef = useRef<THREE.Group>(null);
  const ankleLRef = useRef<THREE.Group>(null);

  // Right Leg Chain
  const hipRRef = useRef<THREE.Group>(null);
  const kneeRRef = useRef<THREE.Group>(null);
  const ankleRRef = useRef<THREE.Group>(null);

  // Target angles (set via setPose)
  const targets = useRef({
    hipsY: 0.90,
    hipsRotX: 0,
    hipsRotY: 0,
    hipsRotZ: 0,
    spineRotX: 0,
    spineRotY: 0,
    spineRotZ: 0,
    chestRotX: 0,
    neckRotX: 0,
    headRotX: 0,
    headRotY: 0,
    shoulderLRot: [0, 0, 0] as [number, number, number],
    elbowLFlex: 0.1,
    shoulderRRot: [0, 0, 0] as [number, number, number],
    elbowRFlex: 0.1,
    hipLRotX: 0,
    kneeLFlex: 0,
    ankleLRotX: 0,
    hipRRotX: 0,
    kneeRFlex: 0,
    ankleRRotX: 0,
  });

  // Current smoothed angles
  const current = useRef({ ...targets.current });
  const angularVelocity = useRef(0);
  const idleClock = useRef(0);

  // Expose setPose API
  useImperativeHandle(ref, () => ({
    getAngularVelocity: () => angularVelocity.current,
    setPose: (params: PoseParams) => {
      const {
        walkPhase = 0,
        walkAmount = 0,
        reachTarget,
        reachTargetL,
        reachTargetR,
        reachAmount = 0,
        lean = 0,
        roll = 0,
        shrug = 0,
        headLook = { x: 0, y: 0 },
        wave = 0,
        nod = 0,
        seated = false,
      } = params;

      const t = targets.current;

      if (seated) {
        // Seated on scooter: hips on seat, thighs forward, shins on footboard, hands on handlebar grips via IK
        t.hipsY = 0.65;
        t.hipsRotX = -0.15 + lean * 0.4;
        t.hipsRotZ = roll;
        t.hipLRotX = 1.35;
        t.kneeLFlex = 1.45;
        t.ankleLRotX = -0.2;
        t.hipRRotX = 1.35;
        t.kneeRFlex = 1.45;
        t.ankleRRotX = -0.2;
        t.spineRotX = 0.25 + lean * 0.6;
        t.spineRotZ = roll * 0.6;
        t.chestRotX = 0.10 + shrug * 0.25;

        // Head & Neck
        t.neckRotX = (headLook.y ?? 0) * 0.3;
        t.headRotX = (headLook.y ?? 0) * 0.7 - lean * 0.2;
        t.headRotY = (headLook.x ?? 0) * 0.85;

        // Arms: Hands on handlebar grips via IK
        const shoulderPosL = new THREE.Vector3(-0.20, 1.40, 0);
        const shoulderPosR = new THREE.Vector3(0.20, 1.40, 0);
        const gripL = reachTargetL ?? new THREE.Vector3(-0.28, 1.16, 0.48);
        const gripR = reachTargetR ?? new THREE.Vector3(0.28, 1.16, 0.48);

        const ikL = solveTwoBoneIK(shoulderPosL, gripL, true);
        const ikR = solveTwoBoneIK(shoulderPosR, gripR, false);

        t.shoulderLRot = [ikL.shoulderRot[0], ikL.shoulderRot[1], ikL.shoulderRot[2] + shrug * 0.15];
        t.elbowLFlex = ikL.elbowFlex;
        t.shoulderRRot = [ikR.shoulderRot[0], ikR.shoulderRot[1], ikR.shoulderRot[2] - shrug * 0.15];
        t.elbowRFlex = ikR.elbowFlex;
        return;
      }

      // Procedural Walk Cycle
      const p = walkPhase / STRIDE_LENGTH;
      const walk = Math.min(1, Math.max(0, walkAmount));

      // Hip swing & vertical bob
      t.hipsY = 0.90 - Math.abs(Math.sin(p * Math.PI)) * 0.02 * walk;
      t.hipsRotX = lean + walk * 0.05;
      t.hipsRotY = Math.sin(p * Math.PI * 2) * 0.08 * walk;

      // Spine & chest counter-rotation
      t.spineRotX = lean * 0.5;
      t.spineRotY = -Math.sin(p * Math.PI * 2) * 0.06 * walk;
      t.chestRotX = -lean * 0.2;

      // Head & Neck
      t.neckRotX = (headLook.y ?? 0) * 0.3 + nod * 0.25;
      t.headRotX = (headLook.y ?? 0) * 0.7 + nod * 0.35;
      t.headRotY = (headLook.x ?? 0) * 0.8;

      // Legs
      const legSwing = Math.sin(p * Math.PI * 2) * 0.50 * walk;
      t.hipLRotX = legSwing;
      t.kneeLFlex = Math.max(0, -Math.sin(p * Math.PI * 2)) * 0.85 * walk;
      t.ankleLRotX = -t.kneeLFlex * 0.45;

      t.hipRRotX = -legSwing;
      t.kneeRFlex = Math.max(0, Math.sin(p * Math.PI * 2)) * 0.85 * walk;
      t.ankleRRotX = -t.kneeRFlex * 0.45;

      // Arms (Natural swing opposite to legs, or IK reach / wave)
      const armSwing = Math.sin(p * Math.PI * 2) * 0.35 * walk;
      let leftShoulder: [number, number, number] = [-armSwing, 0, 0.1];
      let leftElbow = 0.18 + Math.abs(armSwing) * 0.3;
      let rightShoulder: [number, number, number] = [armSwing, 0, -0.1];
      let rightElbow = 0.18 + Math.abs(armSwing) * 0.3;

      if (wave > 0) {
        rightShoulder = [
          0.3 + wave * 0.8,
          0,
          -0.8 + Math.sin(walkPhase * 12) * 0.35 * wave,
        ];
        rightElbow = 1.4;
      }

      // Analytic IK blend for reaching / carrying parcel
      if (reachAmount > 0) {
        const shoulderPosL = new THREE.Vector3(-0.20, 1.40, 0);
        const shoulderPosR = new THREE.Vector3(0.20, 1.40, 0);

        const defaultTargetL = reachTarget
          ? new THREE.Vector3(reachTarget.x - 0.16, reachTarget.y, reachTarget.z)
          : new THREE.Vector3(-0.16, 1.05, 0.35);
        const defaultTargetR = reachTarget
          ? new THREE.Vector3(reachTarget.x + 0.16, reachTarget.y, reachTarget.z)
          : new THREE.Vector3(0.16, 1.05, 0.35);

        const targetL = reachTargetL ?? defaultTargetL;
        const targetR = reachTargetR ?? defaultTargetR;

        const ikL = solveTwoBoneIK(shoulderPosL, targetL, true);
        const ikR = solveTwoBoneIK(shoulderPosR, targetR, false);

        leftShoulder = [
          THREE.MathUtils.lerp(leftShoulder[0], ikL.shoulderRot[0], reachAmount),
          THREE.MathUtils.lerp(leftShoulder[1], ikL.shoulderRot[1], reachAmount),
          THREE.MathUtils.lerp(leftShoulder[2], ikL.shoulderRot[2], reachAmount),
        ];
        leftElbow = THREE.MathUtils.lerp(leftElbow, ikL.elbowFlex, reachAmount);

        rightShoulder = [
          THREE.MathUtils.lerp(rightShoulder[0], ikR.shoulderRot[0], reachAmount),
          THREE.MathUtils.lerp(rightShoulder[1], ikR.shoulderRot[1], reachAmount),
          THREE.MathUtils.lerp(rightShoulder[2], ikR.shoulderRot[2], reachAmount),
        ];
        rightElbow = THREE.MathUtils.lerp(rightElbow, ikR.elbowFlex, reachAmount);
      }

      t.shoulderLRot = leftShoulder;
      t.elbowLFlex = leftElbow;
      t.shoulderRRot = rightShoulder;
      t.elbowRFlex = rightElbow;
    },
  }));

  // Smoothly damp all joints toward targets each frame
  useFrame((_, dt) => {
    idleClock.current += dt;
    const k = 1 - Math.exp(-12 * Math.min(dt, 0.05));
    const cur = current.current;
    const tgt = targets.current;

    let deltaSum = 0;

    // Breathing idle subtle chest expansion
    const breath = Math.sin(idleClock.current * 2.5) * 0.004;

    // Hips
    deltaSum += Math.abs(tgt.hipsY - cur.hipsY);
    cur.hipsY = THREE.MathUtils.lerp(cur.hipsY, tgt.hipsY, k);
    cur.hipsRotX = THREE.MathUtils.lerp(cur.hipsRotX, tgt.hipsRotX, k);
    cur.hipsRotY = THREE.MathUtils.lerp(cur.hipsRotY, tgt.hipsRotY, k);
    cur.hipsRotZ = THREE.MathUtils.lerp(cur.hipsRotZ, tgt.hipsRotZ, k);
    if (hipsGroupRef.current) {
      hipsGroupRef.current.position.y = cur.hipsY;
      hipsGroupRef.current.rotation.set(cur.hipsRotX, cur.hipsRotY, cur.hipsRotZ);
    }

    // Spine & Chest
    cur.spineRotX = THREE.MathUtils.lerp(cur.spineRotX, tgt.spineRotX, k);
    cur.spineRotY = THREE.MathUtils.lerp(cur.spineRotY, tgt.spineRotY, k);
    cur.spineRotZ = THREE.MathUtils.lerp(cur.spineRotZ, tgt.spineRotZ, k);
    if (spineGroupRef.current) {
      spineGroupRef.current.rotation.set(cur.spineRotX, cur.spineRotY, cur.spineRotZ);
    }
    cur.chestRotX = THREE.MathUtils.lerp(cur.chestRotX, tgt.chestRotX, k);
    if (chestGroupRef.current) {
      chestGroupRef.current.rotation.x = cur.chestRotX;
      chestGroupRef.current.scale.set(1 + breath, 1 + breath, 1 + breath);
    }

    // Neck & Head
    cur.neckRotX = THREE.MathUtils.lerp(cur.neckRotX, tgt.neckRotX, k);
    if (neckGroupRef.current) neckGroupRef.current.rotation.x = cur.neckRotX;
    cur.headRotX = THREE.MathUtils.lerp(cur.headRotX, tgt.headRotX, k);
    cur.headRotY = THREE.MathUtils.lerp(cur.headRotY, tgt.headRotY, k);
    if (headGroupRef.current) headGroupRef.current.rotation.set(cur.headRotX, cur.headRotY, 0);

    // Left Arm
    for (let i = 0; i < 3; i++) {
      cur.shoulderLRot[i] = THREE.MathUtils.lerp(cur.shoulderLRot[i], tgt.shoulderLRot[i], k);
    }
    cur.elbowLFlex = THREE.MathUtils.lerp(cur.elbowLFlex, tgt.elbowLFlex, k);
    if (shoulderLRef.current) shoulderLRef.current.rotation.set(cur.shoulderLRot[0], cur.shoulderLRot[1], cur.shoulderLRot[2]);
    if (elbowLRef.current) elbowLRef.current.rotation.x = cur.elbowLFlex;

    // Right Arm
    for (let i = 0; i < 3; i++) {
      cur.shoulderRRot[i] = THREE.MathUtils.lerp(cur.shoulderRRot[i], tgt.shoulderRRot[i], k);
    }
    cur.elbowRFlex = THREE.MathUtils.lerp(cur.elbowRFlex, tgt.elbowRFlex, k);
    if (shoulderRRef.current) shoulderRRef.current.rotation.set(cur.shoulderRRot[0], cur.shoulderRRot[1], cur.shoulderRRot[2]);
    if (elbowRRef.current) elbowRRef.current.rotation.x = cur.elbowRFlex;

    // Left Leg
    cur.hipLRotX = THREE.MathUtils.lerp(cur.hipLRotX, tgt.hipLRotX, k);
    cur.kneeLFlex = THREE.MathUtils.lerp(cur.kneeLFlex, tgt.kneeLFlex, k);
    cur.ankleLRotX = THREE.MathUtils.lerp(cur.ankleLRotX, tgt.ankleLRotX, k);
    if (hipLRef.current) hipLRef.current.rotation.x = cur.hipLRotX;
    if (kneeLRef.current) kneeLRef.current.rotation.x = cur.kneeLFlex;
    if (ankleLRef.current) ankleLRef.current.rotation.x = cur.ankleLRotX;

    // Right Leg
    cur.hipRRotX = THREE.MathUtils.lerp(cur.hipRRotX, tgt.hipRRotX, k);
    cur.kneeRFlex = THREE.MathUtils.lerp(cur.kneeRFlex, tgt.kneeRFlex, k);
    cur.ankleRRotX = THREE.MathUtils.lerp(cur.ankleRRotX, tgt.ankleRRotX, k);
    if (hipRRef.current) hipRRef.current.rotation.x = cur.hipRRotX;
    if (kneeRRef.current) kneeRRef.current.rotation.x = cur.kneeRFlex;
    if (ankleRRef.current) ankleRRef.current.rotation.x = cur.ankleRRotX;

    // Joint angular velocity for Gate 3 audit
    const safeDt = Math.max(0.001, dt);
    angularVelocity.current = THREE.MathUtils.lerp(
      angularVelocity.current,
      (deltaSum + Math.abs(tgt.hipLRotX - cur.hipLRotX) + Math.abs(tgt.shoulderLRot[0] - cur.shoulderLRot[0])) / safeDt,
      0.15
    );
  });

  return (
    <group ref={rootGroupRef} scale={scale} name="character-root">
      {/* 1. HIPS PIVOT AT Y=0.90 */}
      <group ref={hipsGroupRef} position={[0, 0.90, 0]}>
        {/* Pelvis Mesh */}
        <mesh position={[0, 0, 0]} castShadow>
          <capsuleGeometry args={[0.13, 0.14, 12, 8]} />
          <meshStandardMaterial color={pantsColor} roughness={0.7} />
        </mesh>

        {/* 2. SPINE PIVOT */}
        <group ref={spineGroupRef} position={[0, 0.12, 0]}>
          {/* Lower Torso / Waist Mesh */}
          <mesh position={[0, 0.08, 0]} castShadow>
            <capsuleGeometry args={[0.135, 0.16, 12, 8]} />
            <meshStandardMaterial color={hasLabCoat ? '#FFFFFF' : coatColor} roughness={0.5} />
          </mesh>

          {/* 3. CHEST PIVOT */}
          <group ref={chestGroupRef} position={[0, 0.22, 0]}>
            {/* Upper Chest Mesh */}
            <mesh position={[0, 0.08, 0]} castShadow>
              <capsuleGeometry args={[0.15, 0.18, 12, 8]} />
              <meshStandardMaterial color={hasLabCoat ? '#FFFFFF' : coatColor} roughness={0.4} />
            </mesh>

            {/* Doctor Badge */}
            {hasBadge && (
              <mesh position={[0.08, 0.12, 0.15]}>
                <boxGeometry args={[0.05, 0.07, 0.01]} />
                <meshStandardMaterial color={PALETTE.primary} roughness={0.2} />
              </mesh>
            )}

            {/* Stethoscope */}
            {hasStethoscope && (
              <mesh position={[0, 0.18, 0.04]} rotation={[Math.PI / 2.2, 0, 0]}>
                <torusGeometry args={[0.13, 0.012, 12, 24]} />
                <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.2} />
              </mesh>
            )}

            {/* 4. NECK PIVOT */}
            <group ref={neckGroupRef} position={[0, 0.20, 0]}>
              <mesh position={[0, 0.04, 0]}>
                <cylinderGeometry args={[0.048, 0.054, 0.09, 24]} />
                <meshStandardMaterial color={skinTone} roughness={0.65} />
              </mesh>

              {/* 5. HEAD PIVOT */}
              <group ref={headGroupRef} position={[0, 0.10, 0]}>
                {/* Cranium / Face */}
                <mesh position={[0, 0.06, 0]} castShadow>
                  <sphereGeometry args={[0.115, 32, 24]} />
                  <meshStandardMaterial color={skinTone} roughness={0.6} />
                </mesh>

                {/* Hair Cap or Helmet */}
                {hasHelmet ? (
                  <group>
                    <mesh position={[0, 0.08, 0]}>
                      <sphereGeometry args={[0.13, 32, 24]} />
                      <meshStandardMaterial color={PALETTE.nightNavy} metalness={0.6} roughness={0.2} />
                    </mesh>
                    {/* Dark glass visor (no transmission) */}
                    <mesh position={[0, 0.06, 0.09]} rotation={[-0.15, 0, 0]}>
                      <cylinderGeometry args={[0.115, 0.12, 0.08, 24, 1, false, Math.PI * 0.7, Math.PI * 0.6]} />
                      <meshStandardMaterial color="#020617" roughness={0.05} metalness={0.9} />
                    </mesh>
                    {/* Chin Strap */}
                    <mesh position={[0, -0.04, 0.02]} rotation={[0.35, 0, 0]}>
                      <torusGeometry args={[0.09, 0.007, 8, 16, Math.PI * 0.85]} />
                      <meshStandardMaterial color="#0B1F1A" roughness={0.8} />
                    </mesh>
                  </group>
                ) : (
                  <mesh position={[0, 0.10, -0.01]}>
                    <sphereGeometry args={[0.118, 32, 24]} />
                    <meshStandardMaterial color={hairColor} roughness={0.8} />
                  </mesh>
                )}

                {/* Facial Features: Eyes & Nose Bump */}
                {!hasHelmet && (
                  <group position={[0, 0.05, 0.108]}>
                    {/* Nose bump */}
                    <mesh position={[0, 0, 0.012]}>
                      <sphereGeometry args={[0.016, 8, 8]} />
                      <meshStandardMaterial color={skinTone} roughness={0.7} />
                    </mesh>
                    {/* Left & Right Eyes */}
                    <mesh position={[-0.038, 0.025, 0]}>
                      <sphereGeometry args={[0.012, 8, 8]} />
                      <meshBasicMaterial color="#0B1F1A" />
                    </mesh>
                    <mesh position={[0.038, 0.025, 0]}>
                      <sphereGeometry args={[0.012, 8, 8]} />
                      <meshBasicMaterial color="#0B1F1A" />
                    </mesh>
                  </group>
                )}
              </group>
            </group>

            {/* LEFT SHOULDER PIVOT */}
            <group ref={shoulderLRef} position={[-0.20, 0.14, 0]}>
              {/* Upper Arm Capsule hanging down */}
              <mesh position={[0, -0.14, 0]} castShadow>
                <capsuleGeometry args={[0.046, 0.20, 12, 8]} />
                <meshStandardMaterial color={hasLabCoat ? '#FFFFFF' : coatColor} roughness={0.5} />
              </mesh>

              {/* LEFT ELBOW PIVOT */}
              <group ref={elbowLRef} position={[0, -0.28, 0]}>
                {/* Forearm Capsule hanging down */}
                <mesh position={[0, -0.13, 0]} castShadow>
                  <capsuleGeometry args={[0.042, 0.18, 12, 8]} />
                  <meshStandardMaterial color={skinTone} roughness={0.6} />
                </mesh>

                {/* LEFT HAND PIVOT */}
                <group ref={handLRef} position={[0, -0.26, 0]}>
                  {/* Palm & Thumb */}
                  <mesh position={[0, -0.03, 0]} castShadow>
                    <sphereGeometry args={[0.036, 10, 10]} />
                    <meshStandardMaterial color={hasGloves ? '#1E293B' : skinTone} roughness={0.65} />
                  </mesh>
                  <mesh position={[0.024, -0.02, 0.015]} rotation={[0, 0, -0.4]}>
                    <capsuleGeometry args={[0.012, 0.03, 8, 6]} />
                    <meshStandardMaterial color={hasGloves ? '#1E293B' : skinTone} roughness={0.65} />
                  </mesh>
                </group>
              </group>
            </group>

            {/* RIGHT SHOULDER PIVOT */}
            <group ref={shoulderRRef} position={[0.20, 0.14, 0]}>
              {/* Upper Arm Capsule hanging down */}
              <mesh position={[0, -0.14, 0]} castShadow>
                <capsuleGeometry args={[0.046, 0.20, 12, 8]} />
                <meshStandardMaterial color={hasLabCoat ? '#FFFFFF' : coatColor} roughness={0.5} />
              </mesh>

              {/* RIGHT ELBOW PIVOT */}
              <group ref={elbowRRef} position={[0, -0.28, 0]}>
                {/* Forearm Capsule hanging down */}
                <mesh position={[0, -0.13, 0]} castShadow>
                  <capsuleGeometry args={[0.042, 0.18, 12, 8]} />
                  <meshStandardMaterial color={skinTone} roughness={0.6} />
                </mesh>

                {/* RIGHT HAND PIVOT */}
                <group ref={handRRef} position={[0, -0.26, 0]}>
                  {/* Palm & Thumb */}
                  <mesh position={[0, -0.03, 0]} castShadow>
                    <sphereGeometry args={[0.036, 10, 10]} />
                    <meshStandardMaterial color={hasGloves ? '#1E293B' : skinTone} roughness={0.65} />
                  </mesh>
                  <mesh position={[-0.024, -0.02, 0.015]} rotation={[0, 0, 0.4]}>
                    <capsuleGeometry args={[0.012, 0.03, 8, 6]} />
                    <meshStandardMaterial color={hasGloves ? '#1E293B' : skinTone} roughness={0.65} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        </group>

        {/* LEFT HIP PIVOT */}
        <group ref={hipLRef} position={[-0.12, -0.05, 0]}>
          {/* Thigh Capsule hanging down */}
          <mesh position={[0, -0.21, 0]} castShadow>
            <capsuleGeometry args={[0.062, 0.30, 12, 8]} />
            <meshStandardMaterial color={pantsColor} roughness={0.7} />
          </mesh>

          {/* LEFT KNEE PIVOT */}
          <group ref={kneeLRef} position={[0, -0.42, 0]}>
            {/* Shin Capsule hanging down */}
            <mesh position={[0, -0.19, 0]} castShadow>
              <capsuleGeometry args={[0.054, 0.28, 12, 8]} />
              <meshStandardMaterial color={pantsColor} roughness={0.7} />
            </mesh>

            {/* LEFT ANKLE PIVOT */}
            <group ref={ankleLRef} position={[0, -0.38, 0]}>
              {/* Rounded Shoe */}
              <mesh position={[0, -0.035, 0.055]} castShadow>
                <boxGeometry args={[0.088, 0.06, 0.18]} />
                <meshStandardMaterial color="#0B1F1A" roughness={0.4} />
              </mesh>
            </group>
          </group>
        </group>

        {/* RIGHT HIP PIVOT */}
        <group ref={hipRRef} position={[0.12, -0.05, 0]}>
          {/* Thigh Capsule hanging down */}
          <mesh position={[0, -0.21, 0]} castShadow>
            <capsuleGeometry args={[0.062, 0.30, 12, 8]} />
            <meshStandardMaterial color={pantsColor} roughness={0.7} />
          </mesh>

          {/* RIGHT KNEE PIVOT */}
          <group ref={kneeRRef} position={[0, -0.42, 0]}>
            {/* Shin Capsule hanging down */}
            <mesh position={[0, -0.19, 0]} castShadow>
              <capsuleGeometry args={[0.054, 0.28, 12, 8]} />
              <meshStandardMaterial color={pantsColor} roughness={0.7} />
            </mesh>

            {/* RIGHT ANKLE PIVOT */}
            <group ref={ankleRRef} position={[0, -0.38, 0]}>
              {/* Rounded Shoe */}
              <mesh position={[0, -0.035, 0.055]} castShadow>
                <boxGeometry args={[0.088, 0.06, 0.18]} />
                <meshStandardMaterial color="#0B1F1A" roughness={0.4} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
});

