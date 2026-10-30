// src/dev/HumanDebugScene.tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Human, HumanRef } from '../scenes/models/Human';
import { scrollProgress } from '../scroll/progress';

export function HumanDebugScene() {
  const pharmacistRef = useRef<HumanRef>(null);
  const riderRef = useRef<HumanRef>(null);
  const customerRef = useRef<HumanRef>(null);

  useFrame(() => {
    const p = scrollProgress.current;
    const distanceWalked = p * 12.0; // Distance in meters

    // 1. Pharmacist: Idle breathing pose with stethoscope
    pharmacistRef.current?.setPose({
      distanceWalked: 0,
      isWalking: false,
    });

    // 2. Rider: Walking forward driven by scroll
    riderRef.current?.setPose({
      distanceWalked: distanceWalked,
      isWalking: true,
      headLook: Math.sin(p * 20) * 0.15,
    });

    // 3. Customer: Reverse scroll walk
    customerRef.current?.setPose({
      distanceWalked: -distanceWalked,
      isWalking: true,
    });
  });

  return (
    <group position={[0, 0, 0]} name="human-debug-stage">
      {/* 1. Pharmacist (Idle) */}
      <group position={[-1.6, -0.9, 0]}>
        <Human ref={pharmacistRef} role="pharmacist" scale={1.0} />
      </group>

      {/* 2. Courier Rider (Walking Forward) */}
      <group position={[0, -0.9, 0]}>
        <Human ref={riderRef} role="rider" hasHelmet={true} scale={1.0} />
      </group>

      {/* 3. Customer (Reverse Walk) */}
      <group position={[1.6, -0.9, 0]}>
        <Human ref={customerRef} role="customer" scale={1.0} />
      </group>
    </group>
  );
}

