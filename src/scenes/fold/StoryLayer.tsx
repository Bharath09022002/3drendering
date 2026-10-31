// src/scenes/fold/StoryLayer.tsx
import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface StoryLayerProps {
  children: React.ReactNode;
}

/**
 * StoryLayer: Wraps scenes 5-11 (+ SharedScooter) onto Three.js Layer 1.
 * Ensures all descendant objects belong to Layer 1 so they are invisible to Layer 0 camera
 * and only rendered by the secondary StoryWindow FBO camera during the fold transition.
 */
export function StoryLayer({ children }: StoryLayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const frameCountRef = useRef(0);

  const applyLayers = () => {
    if (!groupRef.current) return;
    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Light) {
        // Lights illuminate both Layer 0 and Layer 1
        child.layers.enable(0);
        child.layers.enable(1);
      } else {
        child.layers.set(1);
      }
    });
  };

  useEffect(() => {
    // Initial assignment
    applyLayers();

    // Re-apply once per second for the first 10 seconds to catch async GLTF / texture / character loads
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 1;
      applyLayers();
      if (elapsed >= 10) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Periodic safeguard during early frames to catch any Suspense child mounts
  useFrame(() => {
    frameCountRef.current++;
    if (frameCountRef.current < 60 || frameCountRef.current % 60 === 0 && frameCountRef.current <= 600) {
      applyLayers();
    }
  });

  return (
    <group ref={groupRef} name="StoryLayer-Layer1">
      {children}
    </group>
  );
}

