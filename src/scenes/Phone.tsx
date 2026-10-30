// src/scenes/Phone.tsx
import { useEffect, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { scrollProgress, isInWindow, getLocalProgress, W, seg } from '../scroll/progress';
import { PhoneScreenTexture } from './PhoneScreenTexture';

interface FoldPhoneModelProps {
  screenTexture: THREE.CanvasTexture;
}

/**
 * Ultra-Realistic Samsung Galaxy Z Fold 5 3D Model.
 * Precision proportions:
 * - Unfolded wide mini-tablet: 1.92m width x 2.32m height (~0.83 aspect ratio)
 * - Folded cover phone: 0.96m width x 2.32m height
 * - Central brushed titanium flex-hinge mechanism
 * - Left wing with outer cover display and front selfie camera
 * - Right wing with iconic triple-lens camera bump
 * - Scroll-driven mechanical butterfly unfold directly evaluated per-frame
 */
function FoldPhoneModel({ screenTexture }: FoldPhoneModelProps) {
  const modelGroupRef = useRef<THREE.Group>(null);
  const leftWingRef = useRef<THREE.Group>(null);
  const rightWingRef = useRef<THREE.Group>(null);
  const hingeRef = useRef<THREE.Group>(null);

  // Left half inner screen UVs: [0.0, 0.5]
  const leftInnerGeom = useMemo(() => {
    const geom = new THREE.PlaneGeometry(0.93, 2.26);
    const uv = geom.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setX(i, uv.getX(i) * 0.5);
    }
    return geom;
  }, []);

  // Right half inner screen UVs: [0.5, 1.0]
  const rightInnerGeom = useMemo(() => {
    const geom = new THREE.PlaneGeometry(0.93, 2.26);
    const uv = geom.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setX(i, 0.5 + uv.getX(i) * 0.5);
    }
    return geom;
  }, []);

  // Outer cover screen UVs: maps left half [0.0, 0.5] so it displays full mobile UI
  const coverScreenGeom = useMemo(() => {
    const geom = new THREE.PlaneGeometry(0.91, 2.24);
    const uv = geom.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setX(i, uv.getX(i) * 0.5);
    }
    return geom;
  }, []);

  useFrame(() => {
    const p = scrollProgress.current;
    let u = 1.0;
    let rotY = 0;

    if (p <= W.phoneRotates.end) {
      // Scene 1: Folded cover phone with subtle showcase rotation
      u = 0.0;
      const localP = getLocalProgress(p, W.phoneRotates.start, W.phoneRotates.end);
      rotY = -Math.PI / 2 + Math.sin(localP * Math.PI) * 0.16;
    } else if (p <= W.appOpens.end) {
      // Scene 2: Mechanical unfold from folded cover to flat tablet
      const localP = getLocalProgress(p, W.appOpens.start, W.appOpens.end);
      u = seg(localP, 0.05, 0.90);
      rotY = (-Math.PI / 2) * (1 - u);
    } else {
      // Scene 3, 4, 5: Fully flat open tablet
      u = 1.0;
      rotY = 0;
    }

    const wingAngle = (1 - u) * (Math.PI / 2);
    if (leftWingRef.current) leftWingRef.current.rotation.y = wingAngle;
    if (rightWingRef.current) rightWingRef.current.rotation.y = -wingAngle;
    if (modelGroupRef.current) modelGroupRef.current.rotation.y = rotY;
  });

  return (
    <group ref={modelGroupRef} name="galaxy-z-fold-5">
      {/* 1. CENTRAL BRUSHED TITANIUM FLEX HINGE */}
      <group ref={hingeRef} position={[0, 0, -0.018]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.024, 0.024, 2.34, 32]} />
          <meshStandardMaterial color="#334155" metalness={0.96} roughness={0.16} />
        </mesh>
        {[-1.17, 1.17].map((capY, i) => (
          <mesh key={i} position={[0, capY, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 0.035, 32]} />
            <meshStandardMaterial color="#0B7F63" metalness={0.92} roughness={0.15} />
          </mesh>
        ))}
      </group>

      {/* 2. LEFT CHASSIS WING (Pivots at X = 0 Hinge) */}
      <group ref={leftWingRef} position={[0, 0, 0]}>
        {/* Chassis Body */}
        <RoundedBox
          args={[0.96, 2.32, 0.040]}
          radius={0.024}
          smoothness={4}
          position={[-0.48, 0, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#1E293B" roughness={0.20} metalness={0.88} />
        </RoundedBox>

        {/* Protective Raised Display Bezel Rim */}
        <mesh position={[-0.48, 0, 0.020]}>
          <boxGeometry args={[0.94, 2.28, 0.004]} />
          <meshStandardMaterial color="#0F172A" roughness={0.35} metalness={0.5} />
        </mesh>

        {/* Inner Left Flexible OLED Screen Half */}
        <mesh
          geometry={leftInnerGeom}
          position={[-0.48, 0, 0.022]}
          castShadow={false}
          receiveShadow={false}
        >
          <meshBasicMaterial map={screenTexture} toneMapped={false} />
        </mesh>

        {/* Outer Cover Screen (on Back Face, visible when phone is folded) */}
        <group position={[-0.48, 0, -0.022]} rotation={[0, Math.PI, 0]}>
          <mesh geometry={coverScreenGeom}>
            <meshBasicMaterial map={screenTexture} toneMapped={false} />
          </mesh>
          {/* Cover Screen Selfie Camera Hole */}
          <mesh position={[0, 1.02, 0.002]}>
            <circleGeometry args={[0.016, 24]} />
            <meshBasicMaterial color="#0A0E17" />
          </mesh>
        </group>
      </group>

      {/* 3. RIGHT CHASSIS WING (Pivots at X = 0 Hinge) */}
      <group ref={rightWingRef} position={[0, 0, 0]}>
        {/* Chassis Body */}
        <RoundedBox
          args={[0.96, 2.32, 0.040]}
          radius={0.024}
          smoothness={4}
          position={[0.48, 0, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#1E293B" roughness={0.20} metalness={0.88} />
        </RoundedBox>

        {/* Protective Raised Display Bezel Rim */}
        <mesh position={[0.48, 0, 0.020]}>
          <boxGeometry args={[0.94, 2.28, 0.004]} />
          <meshStandardMaterial color="#0F172A" roughness={0.35} metalness={0.5} />
        </mesh>

        {/* Inner Right Flexible OLED Screen Half */}
        <mesh
          geometry={rightInnerGeom}
          position={[0.48, 0, 0.022]}
          castShadow={false}
          receiveShadow={false}
        >
          <meshBasicMaterial map={screenTexture} toneMapped={false} />
        </mesh>

        {/* Under-Display Front Camera Sensor on Right Inner Half */}
        <mesh position={[0.48, 1.02, 0.023]}>
          <circleGeometry args={[0.016, 24]} />
          <meshBasicMaterial color="#090D16" />
        </mesh>

        {/* Rear Camera Island Cluster (Back of Right Chassis) */}
        <group position={[0.72, 0.72, -0.026]} rotation={[0, Math.PI, 0]}>
          {/* Glass Camera Island Base */}
          <RoundedBox args={[0.26, 0.68, 0.018]} radius={0.025} smoothness={4} position={[0, 0, 0]} castShadow>
            <meshStandardMaterial color="#0F172A" roughness={0.15} metalness={0.7} />
          </RoundedBox>
          {/* Triple Lens Cluster */}
          {[0.20, 0.0, -0.20].map((ly, idx) => (
            <group key={idx} position={[0, ly, 0.010]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.062, 0.062, 0.014, 24]} />
                <meshStandardMaterial color="#475569" metalness={0.96} roughness={0.12} />
              </mesh>
              <mesh position={[0, 0, 0.008]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.050, 0.050, 0.004, 24]} />
                <meshStandardMaterial color="#020617" roughness={0.05} metalness={0.8} />
              </mesh>
            </group>
          ))}
          {/* Dual-Tone LED Flash */}
          <mesh position={[0, -0.27, 0.010]}>
            <circleGeometry args={[0.024, 16]} />
            <meshBasicMaterial color="#FEF08A" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function Phone() {
  const phoneGroupRef = useRef<THREE.Group>(null);
  const screenTextureManager = useMemo(() => new PhoneScreenTexture(2048, 2480), []);
  const { viewport, gl } = useThree();
  const isMobile = typeof window !== 'undefined' ? (window.innerWidth < 768 || viewport.aspect < 1.0) : false;

  useEffect(() => {
    if (gl?.capabilities) {
      screenTextureManager.texture.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
    }
    return () => {
      screenTextureManager.dispose();
    };
  }, [screenTextureManager, gl]);

  useFrame(() => {
    if (!phoneGroupRef.current) return;
    const p = scrollProgress.current;

    const inRange = isInWindow(p, W.phoneRotates.start, W.orderToCloud.end, 0.02);
    phoneGroupRef.current.visible = inRange;
    if (!inRange) return;

    screenTextureManager.draw(p);

    // Desktop framing: Positioned in right half (baseX = 0.95), clear of left copy
    // Mobile framing: Centered horizontally (baseX = 0)
    const baseX = isMobile ? 0 : 0.95;
    const baseY = isMobile ? -0.25 : 0;
    const baseScale = isMobile ? 0.65 : 0.82;

    if (p <= W.phoneRotates.end) {
      // Scene 1: Folded Hero Mobile
      phoneGroupRef.current.position.set(baseX, baseY, 0);
      phoneGroupRef.current.scale.set(baseScale, baseScale, baseScale);
    } else if (p <= W.appOpens.end) {
      // Scene 2: App opens - Fold Phone unfolds
      phoneGroupRef.current.position.set(baseX, baseY, 0);
      phoneGroupRef.current.scale.set(baseScale, baseScale, baseScale);
    } else if (p <= W.searchMedicine.end) {
      // Scene 3: Search typing - phone remains fully unfolded in wide tablet mode
      phoneGroupRef.current.position.set(baseX, baseY, 0.05);
      phoneGroupRef.current.scale.set(baseScale, baseScale, baseScale);
    } else if (p <= W.placeOrder.end) {
      // Scene 4: Order checkout - stable frontal focus on wide tablet checkout sheet
      phoneGroupRef.current.position.set(baseX, baseY, 0.05);
      phoneGroupRef.current.scale.set(baseScale, baseScale, baseScale);
    } else {
      // Scene 5: Order departs for cloud
      const localP = getLocalProgress(p, W.orderToCloud.start, W.orderToCloud.end);
      const easeP = seg(localP);
      phoneGroupRef.current.position.set(baseX, baseY - easeP * 2.2, 0.05 - easeP * 0.8);
      const scale = Math.max(0.48, 1 - easeP * 0.35) * baseScale;
      phoneGroupRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group ref={phoneGroupRef} name="hero-fold-phone-rig">
      <FoldPhoneModel screenTexture={screenTextureManager.texture} />
    </group>
  );
}
