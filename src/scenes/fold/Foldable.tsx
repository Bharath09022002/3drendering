// src/scenes/fold/Foldable.tsx
import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { masterProgress, foldProgress, smootherstep, FOLD_START } from '../../scroll/progress';
import { getStoryFBO } from './StoryWindow';

// Module-level scratch instances to eliminate per-frame allocations
const matCamInv = new THREE.Matrix4();
const matScreenWorld = new THREE.Matrix4();
const matLocalStart = new THREE.Matrix4();
const matLocalInterp = new THREE.Matrix4();
const matPlaneWorld = new THREE.Matrix4();

const posStart = new THREE.Vector3();
const quatStart = new THREE.Quaternion();
const scaleStart = new THREE.Vector3();

const posTarget = new THREE.Vector3();
const quatTarget = new THREE.Quaternion();
const scaleTarget = new THREE.Vector3();

const posInterp = new THREE.Vector3();
const quatInterp = new THREE.Quaternion();
const scaleInterp = new THREE.Vector3();

const tempScreenPos = new THREE.Vector3();

/**
 * Foldable: Next-Gen Book-Style Foldable Phone (Galaxy Z Fold 5 Form Factor)
 * - Single owner of screen image: old Phone hidden when Foldable is present.
 * - Sized FBO texture mapped with zero UI duplication.
 * - Perfectly framed, centered during unfold with ample margin (nothing cut off).
 * - Full-screen camera-space morph (0.45 -> 0.90) into camera-locked plane.
 * - Edge-to-edge coverage at f >= 0.90 within 1px, zero stretch UV morph.
 * - Clean handover at f >= 0.90 (plane & chassis hide in same frame, direct render on Layer 1).
 */
export function Foldable() {
  const groupRef = useRef<THREE.Group>(null);
  const bodyGroupRef = useRef<THREE.Group>(null);
  const leftWingPivotRef = useRef<THREE.Group>(null);
  const rightWingRef = useRef<THREE.Group>(null);
  const leftScreenMeshRef = useRef<THREE.Mesh>(null);
  const rightScreenMeshRef = useRef<THREE.Mesh>(null);
  const morphPlaneRef = useRef<THREE.Mesh>(null);
  const morphPlaneMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const smoothedAngle = useRef(0);
  const isInitialized = useRef(false);

  const { viewport } = useThree();
  const isMobile = typeof window !== 'undefined' ? (window.innerWidth < 768 || viewport.aspect < 1.0) : false;

  // Split UVs for inner chassis wings (kept hidden in favor of single unified morph plane)
  const leftInnerGeom = useMemo(() => {
    const geom = new THREE.PlaneGeometry(1.10, 2.12);
    const uv = geom.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 0.5);
    return geom;
  }, []);

  const rightInnerGeom = useMemo(() => {
    const geom = new THREE.PlaneGeometry(1.10, 2.12);
    const uv = geom.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, 0.5 + uv.getX(i) * 0.5);
    return geom;
  }, []);

  const coverScreenGeom = useMemo(() => new THREE.PlaneGeometry(1.08, 2.10), []);

  // 1x1 unit plane geometry for camera-space transform
  const morphPlaneGeom = useMemo(() => new THREE.PlaneGeometry(1.0, 1.0, 1, 1), []);

  useEffect(() => {
    return () => {
      leftInnerGeom.dispose();
      rightInnerGeom.dispose();
      coverScreenGeom.dispose();
      morphPlaneGeom.dispose();
    };
  }, [leftInnerGeom, rightInnerGeom, coverScreenGeom, morphPlaneGeom]);

  useFrame((state, dt) => {
    if (!groupRef.current) return;
    const f = foldProgress.current;
    const m = masterProgress.current;

    // Angle override support for Gate audits
    let overrideAngleRad: number | null = null;
    if (typeof window !== 'undefined') {
      const globalAngle = (window as any).__FOLD_ANGLE_DEG__;
      if (typeof globalAngle === 'number') {
        overrideAngleRad = (180 - globalAngle) * (Math.PI / 180);
      } else {
        const params = new URLSearchParams(window.location.search);
        const pAngle = params.get('unfoldAngle');
        if (pAngle !== null) {
          overrideAngleRad = (180 - parseFloat(pAngle)) * (Math.PI / 180);
        }
      }
    }

    // Testing hooks
    const forceFbo = typeof window !== 'undefined' && (window as any).__GATE4_FORCE_FBO__ === true;
    const forceDirect = typeof window !== 'undefined' && (window as any).__GATE4_FORCE_DIRECT__ === true;

    // Visibility rule: Active strictly while foldable is present and before handover (f < 0.90)
    const isFoldActive = overrideAngleRad !== null || forceFbo || (!forceDirect && m >= FOLD_START && f < 0.90);
    groupRef.current.visible = isFoldActive;

    if (!isFoldActive) {
      if (morphPlaneRef.current) morphPlaneRef.current.visible = false;
      return;
    }

    // 1. Framed fully in view during unfold, centered, with margin
    const baseX = isMobile ? 0 : Math.min(0.85, Math.max(0.15, 1.17 * viewport.aspect - 0.90));
    const baseY = isMobile ? -0.25 : 0;
    const baseScale = isMobile ? 0.60 : 0.72; // Generous vertical margin so chassis is never cut off
    const endX = 0.0;
    const endY = 0.0;

    // Center phone smoothly over f in [0.00, 0.45]
    let centerT = 0;
    if (f <= 0.45) {
      centerT = smootherstep(f / 0.45);
    } else {
      centerT = 1.0;
    }

    const targetAngleRad = overrideAngleRad !== null ? overrideAngleRad : 0;
    const safeDt = Math.min(dt, 0.05);
    const k = 1 - Math.exp(-10 * safeDt);

    if (overrideAngleRad !== null) {
      smoothedAngle.current = overrideAngleRad;
    } else if (!isInitialized.current) {
      smoothedAngle.current = targetAngleRad;
      isInitialized.current = true;
    } else {
      smoothedAngle.current = THREE.MathUtils.lerp(smoothedAngle.current, targetAngleRad, k);
    }

    if (leftWingPivotRef.current) {
      leftWingPivotRef.current.rotation.y = smoothedAngle.current;
    }

    const posX = THREE.MathUtils.lerp(baseX, endX, centerT);
    const posY = THREE.MathUtils.lerp(baseY, endY, centerT);
    const scale = baseScale;

    groupRef.current.position.set(posX, posY, 0.05);
    groupRef.current.scale.set(scale, scale, scale);

    // 2. Full-Screen Morph Phase (foldProgress 0.45 -> 0.90)
    const morphProgress = f < 0.45 ? 0.0 : Math.min(1.0, (f - 0.45) / (0.90 - 0.45));
    const tExpand = overrideAngleRad === null ? smootherstep(morphProgress) : 0.0;

    // Body slides away downwards and backwards during morph
    if (bodyGroupRef.current) {
      if (tExpand > 0) {
        bodyGroupRef.current.position.y = -3.5 * tExpand * tExpand;
        bodyGroupRef.current.position.z = -1.2 * tExpand;
      } else {
        bodyGroupRef.current.position.set(0, 0, 0);
      }
    }

    // Morph Screen Plane:
    if (morphPlaneRef.current) {
      if (leftScreenMeshRef.current) leftScreenMeshRef.current.visible = false;
      if (rightScreenMeshRef.current) rightScreenMeshRef.current.visible = false;
      morphPlaneRef.current.visible = true;

      const camera = state.camera as THREE.PerspectiveCamera;

      // Start pose: screen mesh plane on the device in world space
      const screenWDev = 2.22 * scale;
      const screenHDev = 2.14 * scale;
      tempScreenPos.set(posX, posY, 0.05 + 0.022 * scale);
      matScreenWorld.compose(tempScreenPos, groupRef.current.quaternion, new THREE.Vector3(screenWDev, screenHDev, 1.0));

      // Express start pose in camera local space:
      camera.updateMatrixWorld();
      matCamInv.copy(camera.matrixWorldInverse);
      matLocalStart.multiplyMatrices(matCamInv, matScreenWorld);
      matLocalStart.decompose(posStart, quatStart, scaleStart);

      // Target pose in camera local space: camera-locked plane at distance d = 1.0
      const d = 1.0;
      const fovRad = (camera.fov * Math.PI) / 180;
      const hTarget = 2 * d * Math.tan(fovRad / 2);
      const wTarget = hTarget * camera.aspect;

      posTarget.set(0, 0, -d);
      quatTarget.set(0, 0, 0, 1);
      scaleTarget.set(wTarget, hTarget, 1);

      // Interpolate startLocal -> targetLocal with smootherstep
      posInterp.lerpVectors(posStart, posTarget, tExpand);
      quatInterp.slerpQuaternions(quatStart, quatTarget, tExpand);
      scaleInterp.lerpVectors(scaleStart, scaleTarget, tExpand);

      matLocalInterp.compose(posInterp, quatInterp, scaleInterp);
      matPlaneWorld.multiplyMatrices(camera.matrixWorld, matLocalInterp);

      matPlaneWorld.decompose(
        morphPlaneRef.current.position,
        morphPlaneRef.current.quaternion,
        morphPlaneRef.current.scale
      );
      morphPlaneRef.current.updateMatrixWorld(true);

      // UV Morph: start with cover-crop of FBO to device screen aspect, end with repeat (1,1) offset (0,0)
      const devAspect = 2.22 / 2.14;
      const vpAspect = camera.aspect;

      let uMinStart = 0;
      let uMaxStart = 1;
      let vMinStart = 0;
      let vMaxStart = 1;

      if (vpAspect >= devAspect) {
        // Landscape desktop: horizontal cover crop
        const uSpan = devAspect / vpAspect;
        uMinStart = 0.5 - 0.5 * uSpan;
        uMaxStart = 0.5 + 0.5 * uSpan;
        vMinStart = 0.0;
        vMaxStart = 1.0;
      } else {
        // Portrait mobile: vertical cover crop
        const vSpan = vpAspect / devAspect;
        vMinStart = 0.5 - 0.5 * vSpan;
        vMaxStart = 0.5 + 0.5 * vSpan;
        uMinStart = 0.0;
        uMaxStart = 1.0;
      }

      const curUMin = THREE.MathUtils.lerp(uMinStart, 0.0, tExpand);
      const curUMax = THREE.MathUtils.lerp(uMaxStart, 1.0, tExpand);
      const curVMin = THREE.MathUtils.lerp(vMinStart, 0.0, tExpand);
      const curVMax = THREE.MathUtils.lerp(vMaxStart, 1.0, tExpand);

      const uv = morphPlaneGeom.attributes.uv;
      uv.setXY(0, curUMin, curVMax);
      uv.setXY(1, curUMax, curVMax);
      uv.setXY(2, curUMin, curVMin);
      uv.setXY(3, curUMax, curVMin);
      uv.needsUpdate = true;
    }

    // Material & debug mode handling
    const isMagentaDebug = typeof window !== 'undefined' && (
      window.location.search.includes('magenta=1') ||
      (window as any).__GATE1_MAGENTA__ === true
    );

    if (morphPlaneMatRef.current) {
      if (isMagentaDebug) {
        morphPlaneMatRef.current.map = null;
        morphPlaneMatRef.current.color.set('#FF00FF');
        morphPlaneMatRef.current.needsUpdate = true;
      } else {
        const fbo = getStoryFBO();
        if (fbo && fbo.texture) {
          if (morphPlaneMatRef.current.map !== fbo.texture) {
            morphPlaneMatRef.current.map = fbo.texture;
            morphPlaneMatRef.current.color.set('#FFFFFF');
            morphPlaneMatRef.current.needsUpdate = true;
          }
        }
      }
    }
  });

  return (
    <>
      {/* Unified Single Morphing Screen Plane (Layer 0) */}
      <mesh
        ref={morphPlaneRef}
        geometry={morphPlaneGeom}
        visible={false}
        renderOrder={100}
        frustumCulled={false}
      >
        <meshBasicMaterial
          ref={morphPlaneMatRef}
          toneMapped={false}
          fog={false}
          side={THREE.DoubleSide}
          polygonOffset={true}
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {/* Main Foldable Phone (Layer 0) */}
      <group ref={groupRef} name="Foldable-Z-Fold" visible={false}>
        {/* Main Body Group (slides away downwards during Phase 4 morph) */}
        <group ref={bodyGroupRef}>
          {/* 1. CENTRAL TITANIUM SPINE FLEX-HINGE */}
          <group position={[0, 0, -0.040]}>
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.020, 0.020, 2.20, 32]} />
              <meshStandardMaterial color="#1E293B" metalness={0.95} roughness={0.18} />
            </mesh>
          </group>

          {/* 2. FIXED RIGHT CHASSIS WING (Facing Camera) */}
          <group ref={rightWingRef} position={[0, 0, 0]}>
            <RoundedBox
              args={[1.12, 2.18, 0.040]}
              radius={0.024}
              smoothness={4}
              position={[0.56, 0, 0]}
              castShadow={!isMobile}
              receiveShadow={!isMobile}
            >
              <meshStandardMaterial color="#0F172A" roughness={0.22} metalness={0.85} />
            </RoundedBox>

            <mesh position={[0.56, 0, 0.020]}>
              <boxGeometry args={[1.10, 2.14, 0.003]} />
              <meshStandardMaterial color="#020617" roughness={0.4} metalness={0.3} />
            </mesh>

            {/* Rear Camera Island Cluster */}
            <group position={[0.86, 0.65, -0.025]} rotation={[0, Math.PI, 0]}>
              <RoundedBox args={[0.26, 0.68, 0.018]} radius={0.025} smoothness={4} position={[0, 0, 0]}>
                <meshStandardMaterial color="#0B132B" roughness={0.15} metalness={0.7} />
              </RoundedBox>
              {[0.20, 0.0, -0.20].map((ly, idx) => (
                <group key={idx} position={[0, ly, 0.018]}>
                  <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.062, 0.062, 0.008, 24]} />
                    <meshStandardMaterial color="#334155" metalness={0.96} roughness={0.12} />
                  </mesh>
                  <mesh position={[0, 0, 0.005]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.050, 0.050, 0.004, 24]} />
                    <meshStandardMaterial color="#020617" roughness={0.05} metalness={0.8} />
                  </mesh>
                </group>
              ))}
            </group>
          </group>

          {/* 3. ROTATING LEFT CHASSIS WING (Pivots at X=0, Z=0.022 Hinge Axis) */}
          <group ref={leftWingPivotRef} position={[0, 0, 0.022]}>
            <group position={[0, 0, -0.022]}>
              <RoundedBox
                args={[1.12, 2.18, 0.040]}
                radius={0.024}
                smoothness={4}
                position={[-0.56, 0, 0]}
                castShadow={!isMobile}
                receiveShadow={!isMobile}
              >
                <meshStandardMaterial color="#0F172A" roughness={0.22} metalness={0.85} />
              </RoundedBox>

              <mesh position={[-0.56, 0, 0.020]}>
                <boxGeometry args={[1.10, 2.14, 0.003]} />
                <meshStandardMaterial color="#020617" roughness={0.4} metalness={0.3} />
              </mesh>

              {/* Cover Screen on Back Face */}
              <group position={[-0.56, 0, -0.022]} rotation={[0, Math.PI, 0]}>
                <mesh geometry={coverScreenGeom}>
                  <meshBasicMaterial color="#0B132B" />
                </mesh>
                <mesh position={[0, 0.95, 0.002]}>
                  <circleGeometry args={[0.016, 24]} />
                  <meshBasicMaterial color="#020617" />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>
    </>
  );
}

export default Foldable;
