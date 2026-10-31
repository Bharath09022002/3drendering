// src/scenes/Phone.tsx
import { useEffect, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { scrollProgress, getLocalProgress, W, seg } from '../scroll/progress';
import { PhoneScreenTexture, CoverScreenTexture } from './PhoneScreenTexture';

interface FoldPhoneModelProps {
  screenTexture: THREE.CanvasTexture;
  coverTexture: THREE.CanvasTexture;
}

/**
 * Ultra-Realistic Samsung Galaxy Z Fold 5 3D Model.
 * Precision proportions:
 * - Unfolded wide mini-tablet: 2.24m width x 2.18m height (~1.03 aspect ratio)
 * - Folded cover phone: 1.12m width x 2.18m height
 * - Central brushed titanium flex-hinge mechanism at X=0, Z=0.022
 * - Fixed right wing facing forward
 * - Left wing with outer cover display and front selfie camera, pivoting 180deg -> 0deg like a book
 * - Dynamic shiftX = -0.56 * (1 - u) centering both closed phone and open tablet
 * - Real-time scroll-driven typing search and order confirmation
 */
function FoldPhoneModel({ screenTexture, coverTexture }: FoldPhoneModelProps) {
  const modelGroupRef = useRef<THREE.Group>(null);
  const leftWingPivotRef = useRef<THREE.Group>(null);
  const rightWingRef = useRef<THREE.Group>(null);
  const hingeRef = useRef<THREE.Group>(null);

  // Left half inner screen UVs: [0.0, 0.5] - Meets flush at X = 0 (zero center gap)
  const leftInnerGeom = useMemo(() => {
    const geom = new THREE.PlaneGeometry(1.12, 2.14);
    const uv = geom.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setX(i, uv.getX(i) * 0.5);
    }
    return geom;
  }, []);

  // Right half inner screen UVs: [0.5, 1.0] - Meets flush at X = 0 (zero center gap)
  const rightInnerGeom = useMemo(() => {
    const geom = new THREE.PlaneGeometry(1.12, 2.14);
    const uv = geom.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setX(i, 0.5 + uv.getX(i) * 0.5);
    }
    return geom;
  }, []);

  // Outer cover screen UVs: full [0.0, 1.0] for CoverScreenTexture
  const coverScreenGeom = useMemo(() => {
    return new THREE.PlaneGeometry(1.08, 2.10);
  }, []);

  useFrame(() => {
    const p = scrollProgress.current;
    let u = 1.0;
    let rotY = 0;
    let rotX = 0;

    if (p <= W.phoneRotates.end) {
      // Scene 1: Folded cover phone with subtle showcase 3D rotation
      u = 0.0;
      const localP = getLocalProgress(p, W.phoneRotates.start, W.phoneRotates.end);
      rotY = Math.sin(localP * Math.PI) * 0.18;
      rotX = Math.sin(localP * Math.PI) * 0.04;
    } else if (p <= W.appOpens.end) {
      // Scene 2: Mechanical book unfold from folded cover (180 deg) to flat tablet (0 deg)
      const localP = getLocalProgress(p, W.appOpens.start, W.appOpens.end);
      u = seg(localP, 0.05, 0.90);
      rotY = 0;
      rotX = 0;
    } else {
      // Scene 3, 4, 5: Fully flat open tablet
      u = 1.0;
      rotY = 0;
      rotX = 0;
    }

    const foldAngle = (1 - u) * Math.PI;
    if (leftWingPivotRef.current) {
      leftWingPivotRef.current.rotation.y = foldAngle;
    }
    if (modelGroupRef.current) {
      // Shift X centers the closed phone (width 1.12) at X=0 when closed (shift=-0.56)
      // and centers the open tablet (width 2.24) at X=0 when flat open (shift=0)
      const shiftX = -0.56 * (1 - u);
      modelGroupRef.current.position.x = shiftX;
      modelGroupRef.current.rotation.y = rotY;
      modelGroupRef.current.rotation.x = rotX;
    }
  });

  return (
    <group ref={modelGroupRef} name="galaxy-z-fold-5">
      {/* 1. CENTRAL BRUSHED TITANIUM FLEX HINGE (Recessed cleanly behind chassis at Z = -0.040, zero front seam) */}
      <group ref={hingeRef} position={[0, 0, -0.040]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.020, 0.020, 2.20, 32]} />
          <meshStandardMaterial color="#1E293B" metalness={0.96} roughness={0.16} />
        </mesh>
      </group>

      {/* 2. ROTATING LEFT CHASSIS WING (Pivots at X = 0, Z = 0.022 Hinge Axis) */}
      <group ref={leftWingPivotRef} position={[0, 0, 0.022]}>
        <group position={[0, 0, -0.022]}>
          {/* Chassis Body */}
          <RoundedBox
            args={[1.12, 2.18, 0.040]}
            radius={0.024}
            smoothness={4}
            position={[-0.56, 0, 0]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color="#1E293B" roughness={0.20} metalness={0.88} />
          </RoundedBox>

          {/* Protective Raised Display Bezel Rim */}
          <mesh position={[-0.56, 0, 0.020]}>
            <boxGeometry args={[1.11, 2.14, 0.003]} />
            <meshStandardMaterial color="#020617" roughness={0.35} metalness={0.5} />
          </mesh>

          {/* Inner Left Flexible OLED Screen Half */}
          <mesh
            geometry={leftInnerGeom}
            position={[-0.56, 0, 0.022]}
            castShadow={false}
            receiveShadow={false}
          >
            <meshBasicMaterial
              map={screenTexture}
              toneMapped={false}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
            />
          </mesh>

          {/* Outer Cover Screen (on Back Face, swings to front when phone is folded closed) */}
          <group position={[-0.56, 0, -0.022]} rotation={[0, Math.PI, 0]}>
            <mesh geometry={coverScreenGeom}>
              <meshBasicMaterial
                map={coverTexture}
                toneMapped={false}
                polygonOffset
                polygonOffsetFactor={-1}
                polygonOffsetUnits={-1}
              />
            </mesh>
            {/* Cover Screen Selfie Camera Hole */}
            <mesh position={[0, 0.95, 0.002]}>
              <circleGeometry args={[0.016, 24]} />
              <meshBasicMaterial color="#0A0E17" />
            </mesh>
          </group>
        </group>
      </group>

      {/* 3. FIXED RIGHT CHASSIS WING (Faces Forward) */}
      <group ref={rightWingRef} position={[0, 0, 0]}>
        {/* Chassis Body */}
        <RoundedBox
          args={[1.12, 2.18, 0.040]}
          radius={0.024}
          smoothness={4}
          position={[0.56, 0, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#1E293B" roughness={0.20} metalness={0.88} />
        </RoundedBox>

        {/* Protective Raised Display Bezel Rim */}
        <mesh position={[0.56, 0, 0.020]}>
          <boxGeometry args={[1.10, 2.14, 0.003]} />
          <meshStandardMaterial color="#020617" roughness={0.35} metalness={0.5} />
        </mesh>

        {/* Inner Right Flexible OLED Screen Half */}
        <mesh
          geometry={rightInnerGeom}
          position={[0.56, 0, 0.022]}
          castShadow={false}
          receiveShadow={false}
        >
          <meshBasicMaterial
            map={screenTexture}
            toneMapped={false}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>

        {/* Under-Display Front Camera Sensor on Right Inner Half */}
        <mesh position={[0.56, 0.95, 0.023]}>
          <circleGeometry args={[0.016, 24]} />
          <meshBasicMaterial color="#090D16" />
        </mesh>

        {/* Rear Camera Island Cluster (Back of Right Chassis) */}
        <group position={[0.86, 0.65, -0.026]} rotation={[0, Math.PI, 0]}>
          {/* Glass Camera Island Base */}
          <RoundedBox args={[0.26, 0.68, 0.018]} radius={0.025} smoothness={4} position={[0, 0, 0.009]} castShadow>
            <meshStandardMaterial color="#0F172A" roughness={0.15} metalness={0.7} />
          </RoundedBox>
          {/* Triple Lens Cluster - Rotated to face normal outward, no front penetration */}
          {[0.20, 0.0, -0.20].map((ly, idx) => (
            <group key={idx} position={[0, ly, 0.018]}>
              <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.062, 0.062, 0.008, 24]} />
                <meshStandardMaterial color="#475569" metalness={0.96} roughness={0.12} />
              </mesh>
              <mesh position={[0, 0, 0.005]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.050, 0.050, 0.004, 24]} />
                <meshStandardMaterial color="#020617" roughness={0.05} metalness={0.8} />
              </mesh>
            </group>
          ))}
          {/* Dual-Tone LED Flash */}
          <mesh position={[0, -0.27, 0.019]}>
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
  const coverTextureManager = useMemo(() => new CoverScreenTexture(1024, 2048), []);
  const { viewport, gl } = useThree();
  const isMobile = typeof window !== 'undefined' ? (window.innerWidth < 768 || viewport.aspect < 1.0) : false;

  useEffect(() => {
    if (gl?.capabilities) {
      const maxAniso = Math.min(16, gl.capabilities.getMaxAnisotropy());
      screenTextureManager.texture.anisotropy = maxAniso;
      coverTextureManager.texture.anisotropy = maxAniso;
    }
    return () => {
      screenTextureManager.dispose();
      coverTextureManager.dispose();
    };
  }, [screenTextureManager, coverTextureManager, gl]);

  useFrame(() => {
    if (!phoneGroupRef.current) return;
    const p = scrollProgress.current;

    const inRange = p <= W.placeOrder.end && p >= W.phoneRotates.start;
    phoneGroupRef.current.visible = inRange;
    if (!inRange) return;

    screenTextureManager.draw(p);

    // Desktop framing: Dynamically adapt baseX to viewport aspect so wide tablet is never clipped
    // Mobile framing: Centered horizontally (baseX = 0)
    const baseX = isMobile ? 0 : Math.min(0.85, Math.max(0.15, 1.17 * viewport.aspect - 0.90));
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
      <FoldPhoneModel
        screenTexture={screenTextureManager.texture}
        coverTexture={coverTextureManager.texture}
      />
    </group>
  );
}
