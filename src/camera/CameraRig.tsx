// src/camera/CameraRig.tsx
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollProgress, masterProgress, foldProgress, FOLD_START, FOLD_END, smootherstep } from '../scroll/progress';
import { getCameraTransform, cameraDroneRoll } from './keyframes';
import { isWarmupActive, warmupStationProgress } from '../scenes/World';

const targetPos = new THREE.Vector3();
const targetLookAt = new THREE.Vector3();
const storyPos = new THREE.Vector3();
const storyLookAt = new THREE.Vector3();

export function CameraRig() {
  const { camera } = useThree();
  const smoothedPos = useRef(new THREE.Vector3());
  const smoothedLookAt = useRef(new THREE.Vector3());
  const smoothedRoll = useRef(0);
  const initialized = useRef(false);

  useFrame((_, dt) => {
    if (isWarmupActive.current) {
      const activeP = warmupStationProgress.current;
      getCameraTransform(activeP, targetPos, targetLookAt);
      camera.position.copy(targetPos);
      camera.lookAt(targetLookAt);
      camera.updateMatrixWorld();
      smoothedPos.current.copy(targetPos);
      smoothedLookAt.current.copy(targetLookAt);
      return;
    }

    const p = scrollProgress.current;
    const m = masterProgress.current;
    const f = foldProgress.current;

    // Direct override support for Gate 3 verification (?unfoldAngle or __FOLD_ANGLE_DEG__)
    let globalAngleDeg: number | null = null;
    if (typeof window !== 'undefined') {
      const gAngle = (window as any).__FOLD_ANGLE_DEG__;
      if (typeof gAngle === 'number') {
        globalAngleDeg = gAngle;
      } else {
        const params = new URLSearchParams(window.location.search);
        const pAngle = params.get('unfoldAngle');
        if (pAngle !== null) {
          globalAngleDeg = parseFloat(pAngle);
        }
      }
    }

    const isFoldActive = globalAngleDeg !== null || (m >= FOLD_START && m <= FOLD_END);

    if (isFoldActive) {
      const isMobile = typeof window !== 'undefined' ? (window.innerWidth < 768) : false;
      const deviceCenterX = isMobile ? 0 : 0.25;
      const deviceCenterY = isMobile ? -0.25 : 0;

      // Base framing on the centered open device
      const camX = deviceCenterX;
      const camY = deviceCenterY + 0.08;
      const camZ = 3.65;

      // Continuous camera tracking:
      // While screen expands (f from 0.05 to 0.85), camera smoothly transitions
      // from framing the phone to the story camera pose at progress p.
      // At f >= 0.85, main camera equals story camera pose (getCameraTransform(p)).
      getCameraTransform(p, storyPos, storyLookAt);
      const expandT = f <= 0.05 ? 0 : f <= 0.85 ? smootherstep((f - 0.05) / (0.85 - 0.05)) : 1.0;

      if (expandT < 1.0) {
        targetPos.set(camX, camY, camZ).lerp(storyPos, expandT);
        targetLookAt.set(deviceCenterX, deviceCenterY, 0.05).lerp(storyLookAt, expandT);
      } else {
        targetPos.copy(storyPos);
        targetLookAt.copy(storyLookAt);
      }
    } else {
      getCameraTransform(p, targetPos, targetLookAt);
    }

    // Support debug camera inspection angles for Gate verification (?angle=front|left|right|rear)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const angle = params.get('angle');
      if (angle === 'front') {
        targetPos.set(1.3, 1.25, 2.6);
        targetLookAt.set(1.3, 1.05, 0.2);
      } else if (angle === 'left') {
        targetPos.set(-1.3, 1.25, 0.2);
        targetLookAt.set(1.3, 1.05, 0.2);
      } else if (angle === 'right') {
        targetPos.set(3.9, 1.25, 0.2);
        targetLookAt.set(1.3, 1.05, 0.2);
      } else if (angle === 'rear') {
        targetPos.set(1.3, 1.25, -2.2);
        targetLookAt.set(1.3, 1.05, 0.2);
      }

      const override = (window as any).__PHARMAFLY_CAMERA_OVERRIDE__;
      if (override) {
        if (override.position) targetPos.copy(override.position);
        if (override.lookAt) targetLookAt.copy(override.lookAt);
      }
    }

    // Frame-rate independent exponential smoothing:
    // k = 1 - exp(-14 * min(dt, 0.05))
    const safeDt = Math.min(dt, 0.05);
    const k = 1 - Math.exp(-14 * safeDt);

    if (f >= 0.895 && f <= 1.00) {
      // Direct lock at handover to guarantee exact pose match with secondary FBO camera
      smoothedPos.current.copy(targetPos);
      smoothedLookAt.current.copy(targetLookAt);
      smoothedRoll.current = 0;
    } else if (!initialized.current) {
      smoothedPos.current.copy(targetPos);
      smoothedLookAt.current.copy(targetLookAt);
      smoothedRoll.current = cameraDroneRoll.current;
      initialized.current = true;
    } else {
      smoothedPos.current.lerp(targetPos, k);
      smoothedLookAt.current.lerp(targetLookAt, k);
      smoothedRoll.current = THREE.MathUtils.lerp(smoothedRoll.current, cameraDroneRoll.current, k);
    }

    camera.position.copy(smoothedPos.current);
    camera.lookAt(smoothedLookAt.current);

    // Apply damped banking roll with camera.rotateZ (never assign camera.rotation.z directly)
    if (Math.abs(smoothedRoll.current) > 1e-5) {
      camera.rotateZ(smoothedRoll.current);
    }
  });

  return null;
}
