// src/camera/keyframes.ts
import * as THREE from 'three';
import { CITY_ROAD_CURVE } from '../scenes/CityScene';
import { W } from '../scroll/progress';

export interface CameraKeyframe {
  progress: number;
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
}

export const CAMERA_KEYFRAMES: CameraKeyframe[] = [
  // Scene 1: Phone rotates (locked steady frontal framing)
  { progress: W.phoneRotates.start, position: new THREE.Vector3(0, 0, 4.5), lookAt: new THREE.Vector3(0, 0, 0) },
  { progress: W.phoneRotates.end, position: new THREE.Vector3(0, 0, 4.5), lookAt: new THREE.Vector3(0, 0, 0) },

  // Scene 2: App opens
  { progress: W.appOpens.end, position: new THREE.Vector3(0, 0, 3.8), lookAt: new THREE.Vector3(0, 0, 0) },

  // Scene 3: Search
  { progress: W.searchMedicine.end, position: new THREE.Vector3(0, -0.05, 3.4), lookAt: new THREE.Vector3(0, 0.1, 0) },

  // Scene 4: Place order
  { progress: W.placeOrder.end, position: new THREE.Vector3(0, 0.08, 3.3), lookAt: new THREE.Vector3(0, -0.15, 0) },

  // Scene 5: Order to cloud
  { progress: W.orderToCloud.end, position: new THREE.Vector3(0, 2.8, 4.8), lookAt: new THREE.Vector3(0, 3.2, 0) },

  // Scene 6: Camera to pharmacy - 3D framed in right 55%
  { progress: W.cameraToPharmacy.end, position: new THREE.Vector3(4.6, 3.2, 6.8), lookAt: new THREE.Vector3(1.2, 1.4, 0) },

  // Scene 7: Retailer packs
  { progress: W.retailerPacks.end, position: new THREE.Vector3(3.2, 2.4, 4.5), lookAt: new THREE.Vector3(0.8, 1.2, 0) },

  // Scene 8: Rider pickup - camera views curbside scooter & rider completely unobstructed
  { progress: W.riderPickup.end, position: new THREE.Vector3(3.6, 2.0, 4.8), lookAt: new THREE.Vector3(1.3, 0.9, 0.2) },

  // Scene 9: Bike through city (3-Part Drone Sequence handled procedurally)

  // Scene 10: Customer receives - elevated 3/4 rule-of-thirds composition (both characters, parcel & entrance fully framed)
  { progress: W.customerReceives.start, position: new THREE.Vector3(35.8, 2.65, 9.6), lookAt: new THREE.Vector3(38.4, 1.25, 3.8) },
  { progress: W.customerReceives.end, position: new THREE.Vector3(36.0, 2.55, 9.4), lookAt: new THREE.Vector3(38.4, 1.25, 3.8) },

  // Scene 11: Logo reveal
  { progress: W.logoReveal.end, position: new THREE.Vector3(0, 0.35, 5.0), lookAt: new THREE.Vector3(0, 0.1, 0) },
];

export const cameraDroneRoll = { current: 0 };

// Module-level temporary vectors to eliminate per-frame allocations
const tempPos = new THREE.Vector3();
const tempLookAt = new THREE.Vector3();
const tempBikePos = new THREE.Vector3();
const tempTangent = new THREE.Vector3();
const tempLookTarget = new THREE.Vector3();
const tempCurrentPoint = new THREE.Vector3();
const tempFuturePoint = new THREE.Vector3();
const chasePos = new THREE.Vector3();
const chaseLookAt = new THREE.Vector3();

// FPV Dynamic Drone Chase Offsets tracking rider entering and navigating urban corridor
const OFFSET_CHASE_A = new THREE.Vector3(0, 2.9, 0);
const OFFSET_LOOK_A = new THREE.Vector3(0, 1.15, 0);
const OFFSET_CHASE_B = new THREE.Vector3(0, 2.6, 0);
const OFFSET_LOOK_B = new THREE.Vector3(0, 1.05, 0);
const OFFSET_CHASE_C = new THREE.Vector3(0, 2.2, 0);
const OFFSET_LOOK_C = new THREE.Vector3(0, 1.0, 0);

/**
 * Uniform Catmull-Rom interpolation between p1 and p2 using adjacent p0 and p3.
 * Preserves velocity continuity across keyframe boundaries without zero-velocity hitches.
 */
function catmullRomVector3(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  t: number,
  out: THREE.Vector3
): void {
  const t2 = t * t;
  const t3 = t2 * t;
  out.x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
  out.y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
  out.z = 0.5 * ((2 * p1.z) + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3);
}

/**
 * Evaluates smooth camera position and lookAt vectors for any master scroll progress (0-1).
 */
export function getCameraTransform(progress: number, outPos: THREE.Vector3, outLookAt: THREE.Vector3): void {
  const p = Math.max(0, Math.min(1, progress));

  // --- SCENE 9 3-PART DRONE SEQUENCE ---
  if (p >= W.bikeThroughCity.start && p <= W.bikeThroughCity.end) {
    const localP = (p - W.bikeThroughCity.start) / (W.bikeThroughCity.end - W.bikeThroughCity.start);
    CITY_ROAD_CURVE.getPointAt(localP, tempBikePos);
    CITY_ROAD_CURVE.getTangentAt(localP, tempTangent);

    // Compute smoothed heading difference using two forward sample intervals
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

    // PART A: Dynamic FPV Drone Chase Swooping Behind Rider Entering City (0.00 to 0.35)
    if (localP <= 0.35) {
      const partAT = localP / 0.35;
      const easeA = partAT * partAT * (3 - 2 * partAT);
      const kPrev = CAMERA_KEYFRAMES[8]; // Scene 8 curbside position

      // Drone camera sweeps from curbside observation directly into dynamic follow behind driver
      chasePos.copy(tempBikePos).addScaledVector(tempTangent, -5.2).add(OFFSET_CHASE_A);
      chaseLookAt.copy(tempBikePos).add(OFFSET_LOOK_A).addScaledVector(tempTangent, 2.5);

      outPos.lerpVectors(kPrev.position, chasePos, easeA);
      outLookAt.lerpVectors(kPrev.lookAt, chaseLookAt, easeA);

      cameraDroneRoll.current = THREE.MathUtils.clamp(-headingDiff * 2.2 * easeA, -0.10, 0.10);
      return;
    }

    // Chase lookAt uses getPointAt(localP + 0.04) instead of noisy tangent math
    const lookAheadP = Math.min(1, localP + 0.04);
    CITY_ROAD_CURVE.getPointAt(lookAheadP, tempLookTarget);

    // PART B: FPV Drone Banking Chase into Urban Corridor (0.35 to 0.80)
    if (localP <= 0.80) {
      const partBT = (localP - 0.35) / 0.45;
      const followDist = THREE.MathUtils.lerp(5.2, 5.8, partBT);
      tempPos.lerpVectors(OFFSET_CHASE_A, OFFSET_CHASE_B, partBT);
      chasePos.copy(tempBikePos).addScaledVector(tempTangent, -followDist).add(tempPos);

      tempLookAt.lerpVectors(OFFSET_LOOK_A, OFFSET_LOOK_B, partBT);
      chaseLookAt.copy(tempLookTarget).add(tempLookAt);

      outPos.copy(chasePos);
      outLookAt.copy(chaseLookAt);

      cameraDroneRoll.current = THREE.MathUtils.clamp(-headingDiff * 2.5, -0.10, 0.10);
      return;
    }

    // PART C: Low Follow & Seamless Handoff to Customer Apartment (0.80 to 1.00)
    const partCT = (localP - 0.80) / 0.20;
    const followDist = THREE.MathUtils.lerp(6.5, 5.2, partCT);
    tempPos.lerpVectors(OFFSET_CHASE_B, OFFSET_CHASE_C, partCT);
    chasePos.copy(tempBikePos).addScaledVector(tempTangent, -followDist).add(tempPos);

    tempLookAt.lerpVectors(OFFSET_LOOK_B, OFFSET_LOOK_C, partCT);
    chaseLookAt.copy(tempLookTarget).add(tempLookAt);

    cameraDroneRoll.current = THREE.MathUtils.clamp(-headingDiff * 1.5 * (1 - partCT), -0.10, 0.10);

    if (partCT > 0.65) {
      const handoffT = (partCT - 0.65) / 0.35;
      const kNext = CAMERA_KEYFRAMES[9];
      outPos.lerpVectors(chasePos, kNext.position, handoffT);
      outLookAt.lerpVectors(chaseLookAt, kNext.lookAt, handoffT);
      cameraDroneRoll.current *= (1 - handoffT);
      return;
    }

    outPos.copy(chasePos);
    outLookAt.copy(chaseLookAt);
    return;
  }

  // Outside Scene 9, reset drone roll
  cameraDroneRoll.current = 0;

  // Find surrounding static keyframes
  let idx = 0;
  while (idx < CAMERA_KEYFRAMES.length - 1 && CAMERA_KEYFRAMES[idx + 1].progress <= p) {
    idx++;
  }

  const k1 = CAMERA_KEYFRAMES[idx];
  const k2 = CAMERA_KEYFRAMES[Math.min(idx + 1, CAMERA_KEYFRAMES.length - 1)];

  if (k1 === k2 || k2.progress === k1.progress) {
    outPos.copy(k1.position);
    outLookAt.copy(k1.lookAt);
    return;
  }

  const range = k2.progress - k1.progress;
  const t = Math.max(0, Math.min(1, (p - k1.progress) / range));

  // Determine segment bounds for Catmull-Rom clamping
  let minIdx = 0;
  let maxIdx = 8;
  if (idx >= 9) {
    minIdx = 9;
    maxIdx = CAMERA_KEYFRAMES.length - 1;
  }

  const i0 = Math.max(minIdx, idx - 1);
  const i1 = idx;
  const i2 = Math.min(maxIdx, idx + 1);
  const i3 = Math.min(maxIdx, idx + 2);

  const p0 = CAMERA_KEYFRAMES[i0].position;
  const p1 = CAMERA_KEYFRAMES[i1].position;
  const p2 = CAMERA_KEYFRAMES[i2].position;
  const p3 = CAMERA_KEYFRAMES[i3].position;

  // If camera is stationary between two keyframes, keep perfectly steady
  if (p1.distanceToSquared(p2) < 1e-6) {
    outPos.copy(p1);
  } else {
    catmullRomVector3(p0, p1, p2, p3, t, outPos);
  }

  const l0 = CAMERA_KEYFRAMES[i0].lookAt;
  const l1 = CAMERA_KEYFRAMES[i1].lookAt;
  const l2 = CAMERA_KEYFRAMES[i2].lookAt;
  const l3 = CAMERA_KEYFRAMES[i3].lookAt;

  if (l1.distanceToSquared(l2) < 1e-6) {
    outLookAt.copy(l1);
  } else {
    catmullRomVector3(l0, l1, l2, l3, t, outLookAt);
  }

  // Scene 10 gentle push-in only during handover moment (s10P: 0.35 -> 0.70)
  if (p >= W.customerReceives.start && p <= W.customerReceives.end) {
    const s10P = (p - W.customerReceives.start) / (W.customerReceives.end - W.customerReceives.start);
    if (s10P >= 0.35 && s10P <= 0.70) {
      const pushT = Math.sin(((s10P - 0.35) / 0.35) * Math.PI);
      outPos.z -= pushT * 0.95;
      outPos.y -= pushT * 0.20;
    }
  }
}
