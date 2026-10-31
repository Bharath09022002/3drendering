// src/scenes/SharedScooter.tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollProgress, isInWindow, getLocalProgress, W } from '../scroll/progress';
import { isWarmupActive, warmupStationProgress } from './World';
import { CITY_ROAD_CURVE } from './CityScene';
import { UltraRealisticScooter } from './models/UltraRealisticScooter';
import { Human, HumanRef } from './models/Human';

// Global shared travel tracker across Scenes 8-10
export const sharedScooterTravel = { current: 0 };

const START_P = W.riderPickup.start;
const END_P = W.customerReceives.end;

// Module-level temps to eliminate per-frame allocations
const tempPos = new THREE.Vector3();
const tempTangent = new THREE.Vector3();
const tempTangentAhead = new THREE.Vector3();
const tempTanDiff = new THREE.Vector3();
const tempCurrentPoint = new THREE.Vector3();
const tempFuturePoint = new THREE.Vector3();
const tempLookTarget = new THREE.Vector3();

// Trajectory landmarks
const CURBSIDE_POS = new THREE.Vector3(1.7, 0, 0.2); // Scene 8 curbside
const ROAD_START_POS = new THREE.Vector3(4.2, 0, 0.5); // Scene 9 curve start
const APARTMENT_PARK_POS = new THREE.Vector3(36.8, 0, 4.5); // Scene 10 curbside park (clear of all walls)

const DIR_X = ROAD_START_POS.x - CURBSIDE_POS.x; // 2.5
const DIR_Z = ROAD_START_POS.z - CURBSIDE_POS.z; // 0.3
const TARGET_LAUNCH_ANGLE = Math.atan2(DIR_X, DIR_Z); // 1.4514 rad

const CURVE_LENGTH = CITY_ROAD_CURVE.getLength(); // 39.02m
const SCENE_8_MAX_TRAVEL = 5.1;

export function SharedScooter() {
  const scooterGroupRef = useRef<THREE.Group>(null);
  const riderMountRef = useRef<THREE.Group>(null);
  const turnRateRef = useRef(0);
  const riderRef = useRef<HumanRef>(null);

  // Dynamic reaction trackers (all smoothly derived from travel distance)
  const prevTravel = useRef(0);
  const smoothedVel = useRef(0);
  const prevVel = useRef(0);
  const smoothedAccel = useRef(0);
  const smoothedPitch = useRef(0);
  const smoothedRiderLean = useRef(0);
  const smoothedRiderRoll = useRef(0);
  const smoothedShrug = useRef(0);
  const headLook = useRef({ x: 0, y: 0 });

  useFrame((_, dt) => {
    if (!scooterGroupRef.current) return;
    const p = isWarmupActive.current ? warmupStationProgress.current : scrollProgress.current;

    const inRange = isWarmupActive.current || isInWindow(p, START_P, END_P, 0.005);
    scooterGroupRef.current.visible = inRange;
    if (!inRange) return;

    const safeDt = Math.max(0.001, Math.min(dt, 0.05));
    const kDamp = 1 - Math.exp(-12 * safeDt);

    // Smooth entry / exit scale cushion (0.97 -> 1.0) so it never pops suddenly
    const entryP = Math.min(1, Math.max(0, (p - (START_P - 0.005)) / 0.01));
    const exitP = Math.min(1, Math.max(0, ((END_P + 0.005) - p) / 0.01));
    const cushion = Math.min(entryP, exitP);
    const scale = 0.97 + 0.03 * cushion;
    scooterGroupRef.current.scale.set(scale, scale, scale);

    if (p < W.bikeThroughCity.start) {
      // =======================================================================
      // SCENE 8: Curbside Staging & Launch Departure
      // =======================================================================
      const localP = getLocalProgress(p, W.riderPickup.start, W.riderPickup.end);

      if (localP < 0.55) {
        // Parked curbside
        scooterGroupRef.current.position.copy(CURBSIDE_POS);
        scooterGroupRef.current.rotation.set(0, -0.25, 0);
        sharedScooterTravel.current = 0;
        turnRateRef.current = 0;
      } else if (localP <= 0.73) {
        // First 40% of departure segment (0.55 -> 0.73): Steer in place to face departure trajectory (no sideways sliding)
        const turnT = (localP - 0.55) / (0.73 - 0.55);
        const easeTurn = turnT * turnT * (3 - 2 * turnT);
        scooterGroupRef.current.position.copy(CURBSIDE_POS);
        scooterGroupRef.current.rotation.set(0, -0.25 + easeTurn * (TARGET_LAUNCH_ANGLE - (-0.25)), 0);
        sharedScooterTravel.current = 0; // Wheels stationary while steering in place
        turnRateRef.current = 0.22 * Math.sin(turnT * Math.PI);
      } else {
        // Remaining 60% of departure segment (0.73 -> 1.00): Accelerate straight along heading into roadway
        const launchT = (localP - 0.73) / (1.0 - 0.73);
        const easeLaunch = launchT * launchT * (3 - 2 * launchT);
        scooterGroupRef.current.position.set(
          CURBSIDE_POS.x + easeLaunch * DIR_X,
          0,
          CURBSIDE_POS.z + easeLaunch * DIR_Z
        );

        // Blend smoothly to curve start tangent angle at boundary (1.3501 rad)
        const curveTangentAngle = 1.3501;
        const blend = easeLaunch > 0.75 ? (easeLaunch - 0.75) / 0.25 : 0;
        const angle = TARGET_LAUNCH_ANGLE + blend * (curveTangentAngle - TARGET_LAUNCH_ANGLE);
        scooterGroupRef.current.rotation.set(0, angle, 0);

        sharedScooterTravel.current = easeLaunch * SCENE_8_MAX_TRAVEL;
        turnRateRef.current = blend * -0.15;
      }

      // Settle rider posture in staging
      smoothedRiderRoll.current = THREE.MathUtils.lerp(smoothedRiderRoll.current, 0, kDamp);
      smoothedShrug.current = THREE.MathUtils.lerp(smoothedShrug.current, 0, kDamp);
      headLook.current = {
        x: THREE.MathUtils.lerp(headLook.current.x, 0, kDamp),
        y: THREE.MathUtils.lerp(headLook.current.y, 0, kDamp),
      };
    } else if (p < W.customerReceives.start) {
      // =======================================================================
      // SCENE 9: Urban Corridor Transit along CITY_ROAD_CURVE
      // =======================================================================
      const localP = getLocalProgress(p, W.bikeThroughCity.start, W.bikeThroughCity.end);

      CITY_ROAD_CURVE.getPointAt(localP, tempPos);
      scooterGroupRef.current.position.copy(tempPos);

      CITY_ROAD_CURVE.getTangentAt(localP, tempTangent);
      const angle = Math.atan2(tempTangent.x, tempTangent.z);
      scooterGroupRef.current.rotation.y = angle;

      // Smoothed banking roll clamped to +-0.10 rad
      const pAhead = Math.min(1, localP + 0.02);
      const pFarAhead = Math.min(1, localP + 0.04);
      CITY_ROAD_CURVE.getPointAt(localP, tempCurrentPoint);
      CITY_ROAD_CURVE.getPointAt(pAhead, tempFuturePoint);
      CITY_ROAD_CURVE.getPointAt(pFarAhead, tempLookTarget);

      const h1 = Math.atan2(tempFuturePoint.x - tempCurrentPoint.x, tempFuturePoint.z - tempCurrentPoint.z);
      const h2 = Math.atan2(tempLookTarget.x - tempFuturePoint.x, tempLookTarget.z - tempFuturePoint.z);
      let headingDiff = h2 - h1;
      while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
      while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;
      scooterGroupRef.current.rotation.z = THREE.MathUtils.clamp(-headingDiff * 2.5, -0.10, 0.10);

      // Continuous cumulative travel distance
      sharedScooterTravel.current = SCENE_8_MAX_TRAVEL + localP * CURVE_LENGTH;
      turnRateRef.current = -headingDiff * 2.2;

      // 1. Dynamic Rider Roll: Lean into turns proportional to turn rate (clamped to +-0.12 rad)
      const targetRiderRoll = THREE.MathUtils.clamp(-turnRateRef.current * 0.28, -0.12, 0.12);
      smoothedRiderRoll.current = THREE.MathUtils.lerp(smoothedRiderRoll.current, targetRiderRoll, kDamp);

      // 2. Head looks along path 0.04 ahead
      CITY_ROAD_CURVE.getTangentAt(pFarAhead, tempTangentAhead);
      let lookAngleDiff = Math.atan2(tempTangentAhead.x, tempTangentAhead.z) - angle;
      while (lookAngleDiff > Math.PI) lookAngleDiff -= Math.PI * 2;
      while (lookAngleDiff < -Math.PI) lookAngleDiff += Math.PI * 2;
      const targetLookX = THREE.MathUtils.clamp(lookAngleDiff * 0.85, -0.35, 0.35);
      headLook.current.x = THREE.MathUtils.lerp(headLook.current.x, targetLookX, kDamp);
      headLook.current.y = THREE.MathUtils.lerp(headLook.current.y, -smoothedRiderLean.current * 0.35, kDamp);

      // 3. Small shoulder shrug on bumps driven by road curve curvature (not random noise)
      tempTanDiff.subVectors(tempTangentAhead, tempTangent);
      const curvature = tempTanDiff.length() / 0.04;
      const targetShrug = THREE.MathUtils.clamp(curvature * 0.035, 0, 0.08);
      smoothedShrug.current = THREE.MathUtils.lerp(smoothedShrug.current, targetShrug, kDamp);
    } else {
      // =======================================================================
      // SCENE 10: Apartment Doorstep Arrival & Curbside Settle
      // =======================================================================
      const localP = getLocalProgress(p, W.customerReceives.start, W.customerReceives.end);
      const curveEndPos = CITY_ROAD_CURVE.getPointAt(1);

      if (localP < 0.30) {
        // Glide smoothly from curve endpoint [38.5, 0, 3.8] into curbside parking spot [37.3, 0, 4.0]
        const parkT = localP / 0.30;
        const easePark = parkT * parkT * (3 - 2 * parkT);
        scooterGroupRef.current.position.lerpVectors(curveEndPos, APARTMENT_PARK_POS, easePark);
        scooterGroupRef.current.rotation.set(0, THREE.MathUtils.lerp(1.08, 0.35, easePark), 0);
        sharedScooterTravel.current = SCENE_8_MAX_TRAVEL + CURVE_LENGTH + easePark * 1.3;
        turnRateRef.current = -0.1 * (1 - parkT);
      } else {
        // Parked curbside by apartment entrance during handover
        scooterGroupRef.current.position.copy(APARTMENT_PARK_POS);
        scooterGroupRef.current.rotation.set(0, 0.35, 0);
        // Distance stays fixed so wheels remain completely stopped
        sharedScooterTravel.current = SCENE_8_MAX_TRAVEL + CURVE_LENGTH + 1.3;
        turnRateRef.current = 0;
      }

      smoothedRiderRoll.current = THREE.MathUtils.lerp(smoothedRiderRoll.current, 0, kDamp);
      smoothedShrug.current = THREE.MathUtils.lerp(smoothedShrug.current, 0, kDamp);
      headLook.current = {
        x: THREE.MathUtils.lerp(headLook.current.x, 0, kDamp),
        y: THREE.MathUtils.lerp(headLook.current.y, 0, kDamp),
      };
    }

    // =========================================================================
    // DYNAMIC DERIVATIONS FROM TRAVEL DISTANCE (Velocity, Acceleration, Pitch, Lean)
    // =========================================================================
    const distDelta = sharedScooterTravel.current - prevTravel.current;
    prevTravel.current = sharedScooterTravel.current;
    const rawVel = distDelta / safeDt;
    smoothedVel.current = THREE.MathUtils.lerp(smoothedVel.current, rawVel, kDamp);

    const rawAccel = (smoothedVel.current - prevVel.current) / safeDt;
    prevVel.current = smoothedVel.current;
    smoothedAccel.current = THREE.MathUtils.lerp(smoothedAccel.current, rawAccel, 1 - Math.exp(-10 * safeDt));

    // Scooter body pitches slightly on accel/brake (+-0.03 rad)
    const targetPitch = THREE.MathUtils.clamp(-smoothedAccel.current * 0.0035, -0.03, 0.03);
    smoothedPitch.current = THREE.MathUtils.lerp(smoothedPitch.current, targetPitch, kDamp);

    // Rider lean forward proportional to smoothed acceleration
    const targetLean = THREE.MathUtils.clamp(smoothedAccel.current * 0.012, -0.05, 0.16);
    smoothedRiderLean.current = THREE.MathUtils.lerp(smoothedRiderLean.current, targetLean, kDamp);

    // Seated rider dynamics and posture
    if (riderRef.current) {
      riderRef.current.setPose({
        seated: true,
        roll: smoothedRiderRoll.current,
        lean: smoothedRiderLean.current,
        headLook: headLook.current.x,
      });
    }

    // Dynamic single-rider visibility: Seated rider hides once courier dismounts curbside (localP >= 0.18) in Scene 10
    if (riderMountRef.current) {
      const isScene10 = p >= W.customerReceives.start;
      const scene10P = isScene10 ? getLocalProgress(p, W.customerReceives.start, W.customerReceives.end) : 0;
      riderMountRef.current.visible = !isScene10 || scene10P < 0.18;
    }
  });

  // Scale rule: human standing height = 1.72 m * (scooter wheel outer diameter / 0.45 m)
  // Wheel outer diameter = 0.56m -> standing height = 2.1404m -> scale = 2.1404 / 1.8093 = 1.183
  // Hips bone rest pos: y = 1.03991, z = 0.02076 -> mount at [0, -0.410, -0.185] places hips on seatAnchor [0, 0.82, -0.16]
  const RIDER_SCALE = 1.183;
  const RIDER_POS: [number, number, number] = [0, -0.410, -0.185];

  return (
    <group ref={scooterGroupRef} name="world-shared-scooter">
      <UltraRealisticScooter
        isMoving={true}
        travelRef={sharedScooterTravel}
        turnRate={turnRateRef.current}
        pitch={smoothedPitch.current}
      />
      {/* Seated Courier Rider mounted directly on scooter saddle (Hips on seat, thighs forward, shins on footboard) */}
      <group ref={riderMountRef} position={RIDER_POS}>
        <Human
          ref={riderRef}
          role="rider"
          seated={true}
          hasHelmet={true}
          scale={RIDER_SCALE}
        />
      </group>
    </group>
  );
}

