// src/camera/CameraRig.tsx
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollProgress } from '../scroll/progress';
import { getCameraTransform, cameraDroneRoll } from './keyframes';

const targetPos = new THREE.Vector3();
const targetLookAt = new THREE.Vector3();

export function CameraRig() {
  const { camera } = useThree();
  const smoothedPos = useRef(new THREE.Vector3());
  const smoothedLookAt = useRef(new THREE.Vector3());
  const smoothedRoll = useRef(0);
  const initialized = useRef(false);

  useFrame((_, dt) => {
    const p = scrollProgress.current;
    getCameraTransform(p, targetPos, targetLookAt);

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

    if (!initialized.current) {
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
