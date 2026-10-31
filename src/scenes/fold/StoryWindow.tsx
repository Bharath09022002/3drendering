// src/scenes/fold/StoryWindow.tsx
import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { scrollProgress, masterProgress, foldProgress, FOLD_START } from '../../scroll/progress';
import { getCameraTransform, cameraDroneRoll } from '../../camera/keyframes';
import { getQuality } from '../../config/quality';

let globalStoryFBO: THREE.WebGLRenderTarget | null = null;

export function getStoryFBO(): THREE.WebGLRenderTarget | null {
  return globalStoryFBO;
}

const tempPos = new THREE.Vector3();
const tempLook = new THREE.Vector3();

export function StoryWindow() {
  const { size, gl, scene } = useThree();
  const quality = getQuality();
  const dpr = gl.getPixelRatio();

  // Sizing per visual tier specification:
  // Ultra (desktop, tier 3+): 1.0
  // Standard (desktop, tier 2): 0.75
  // Mobile (tier 1): 0.50
  const isUltra = !quality.isMobile && quality.tier >= 3;
  const fboScale = quality.isMobile ? 0.50 : (isUltra ? 1.0 : 0.75);
  const fboWidth = Math.max(256, Math.floor(size.width * dpr * fboScale));
  const fboHeight = Math.max(256, Math.floor(size.height * dpr * fboScale));
  const aspect = size.width / size.height;

  // Offscreen HalfFloat FBO with 4x MSAA desktop / 0 mobile
  const fbo = useFBO(fboWidth, fboHeight, {
    type: THREE.HalfFloatType,
    samples: quality.isMobile ? 0 : 4,
    depth: true,
  });

  globalStoryFBO = fbo;
  if (typeof window !== 'undefined') {
    (window as any).__STORY_FBO__ = fbo;
    (window as any).__STORY_FBO_TEXTURE__ = fbo.texture;
  }

  // Secondary PerspectiveCamera strictly seeing Layer 1 only
  const secondaryCamRef = useRef<THREE.PerspectiveCamera | null>(null);
  if (!secondaryCamRef.current) {
    const cam = new THREE.PerspectiveCamera(38, aspect, 0.3, 300);
    cam.layers.set(1); // Layer 1 only
    secondaryCamRef.current = cam;
  }

  useEffect(() => {
    if (secondaryCamRef.current) {
      secondaryCamRef.current.aspect = aspect;
      secondaryCamRef.current.updateProjectionMatrix();
      // Precompile shaders for the secondary FBO camera pass to avoid scroll hitches
      gl.compile(scene, secondaryCamRef.current);
    }
  }, [aspect, gl, scene]);

  useEffect(() => {
    return () => {
      globalStoryFBO = null;
      if (typeof window !== 'undefined') {
        delete (window as any).__STORY_FBO__;
        delete (window as any).__STORY_FBO_TEXTURE__;
      }
      fbo.dispose();
    };
  }, [fbo]);

  const isDebug = typeof window !== 'undefined' && window.location.search.includes('debug=1');
  const isFboDisabled = typeof window !== 'undefined' && window.location.search.includes('fbo=0');
  const smoothedRoll = useRef(0);
  const debugPlaneGroupRef = useRef<THREE.Group>(null);

  // Negative priority (-1) ensures this runs before the default render pass without taking over auto-render
  useFrame((state, dt) => {
    const f = foldProgress.current;
    const pLegacy = scrollProgress.current;
    const hasAngleOverride = typeof window !== 'undefined' && (
      (window as any).__FOLD_ANGLE_DEG__ !== undefined && (window as any).__FOLD_ANGLE_DEG__ !== null
    );

    // Gate 4 Handover testing hooks:
    const forceFbo = typeof window !== 'undefined' && (window as any).__GATE4_FORCE_FBO__ === true;
    const forceDirect = typeof window !== 'undefined' && (window as any).__GATE4_FORCE_DIRECT__ === true;

    // Handover occurs strictly at f = 0.90:
    // Prior to handover (m < FOLD_START or f < 0.90): main camera disables Layer 1.
    // At handover (f >= 0.90) and beyond: main camera enables Layer 1.
    const m = masterProgress.current;
    const isFoldWindow = m >= FOLD_START && f < 0.90;
    const isFboActive = !isFboDisabled && (
      forceFbo || (!forceDirect && (isFoldWindow || hasAngleOverride))
    );

    // Main camera layer coordination:
    const isHandover = f >= 0.90 || m > 0.384; // FOLD_END
    if (forceDirect || isHandover) {
      state.camera.layers.enable(1);
    } else {
      state.camera.layers.disable(1);
    }

    // Pin debug plane in top-right corner of main camera view in ?debug=1
    if (debugPlaneGroupRef.current) {
      debugPlaneGroupRef.current.position.set(0.95, 0.52, -2.0);
      debugPlaneGroupRef.current.applyMatrix4(state.camera.matrixWorld);
      debugPlaneGroupRef.current.quaternion.copy(state.camera.quaternion);
      debugPlaneGroupRef.current.traverse((c) => c.layers.set(0));
    }

    // Skip offscreen rendering when FBO is not needed (saves GPU draw calls)
    // FBO runs strictly while foldable is present and prior to handover:
    const shouldRender = isFboActive;
    if (!shouldRender || !secondaryCamRef.current) {
      return;
    }

    const secondaryCam = secondaryCamRef.current;

    // Position secondary camera each frame with getCameraTransform(legacyProgress)
    getCameraTransform(pLegacy, tempPos, tempLook);
    secondaryCam.position.copy(tempPos);
    secondaryCam.lookAt(tempLook);

    // Apply drone roll if active in Scene 9
    const safeDt = Math.min(dt, 0.05);
    const k = 1 - Math.exp(-14 * safeDt);
    smoothedRoll.current = THREE.MathUtils.lerp(smoothedRoll.current, cameraDroneRoll.current, k);
    if (Math.abs(smoothedRoll.current) > 1e-5) {
      secondaryCam.rotateZ(smoothedRoll.current);
    }

    secondaryCam.updateMatrixWorld();

    // Measure FBO pass frame cost in milliseconds
    const startT = performance.now();

    const previousRenderTarget = gl.getRenderTarget();
    gl.setRenderTarget(fbo);
    gl.clear();
    gl.render(scene, secondaryCam);
    gl.setRenderTarget(previousRenderTarget);

    const costMs = performance.now() - startT;
    if (typeof window !== 'undefined') {
      (window as any).__STORY_FBO_COST_MS__ = costMs;
    }
  }, -1);

  return (
    <>
      {/* Test plane: show the FBO on a debug plane in ?debug=1 */}
      {isDebug && (
        <group ref={debugPlaneGroupRef} renderOrder={9999}>
          {/* Outer Border / Card */}
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[1.34, 0.76]} />
            <meshBasicMaterial color="#0b192c" depthTest={false} />
          </mesh>
          {/* Inner FBO Texture Display Quad */}
          <mesh>
            <planeGeometry args={[1.30, 0.72]} />
            <meshBasicMaterial map={fbo.texture} toneMapped={false} depthTest={false} />
          </mesh>
        </group>
      )}
    </>
  );
}
