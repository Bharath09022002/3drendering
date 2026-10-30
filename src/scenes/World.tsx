// src/scenes/World.tsx
import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { CameraRig } from '../camera/CameraRig';
import { getCameraTransform } from '../camera/keyframes';
import { Phone } from './Phone';

const tempCamPos = new THREE.Vector3();
const tempCamLook = new THREE.Vector3();
const COLOR_DAY_MINT = new THREE.Color(PALETTE.bg);
const COLOR_PHARMACY = new THREE.Color('#EDF7F2');
const COLOR_DUSK = new THREE.Color('#0B192C');
const tempBgColor = new THREE.Color();
const currentBgColor = new THREE.Color(PALETTE.bg);
import { CloudScene } from './CloudScene';
import { PharmacyScene } from './PharmacyScene';
import { PackingScene } from './PackingScene';
import { RiderScene } from './RiderScene';
import { CityScene } from './CityScene';
import { ReceiveScene } from './ReceiveScene';
import { LogoScene } from './LogoScene';
import { HumanDebugScene } from '../dev/HumanDebugScene';
import { runPenetrationCheck } from '../dev/penetrationCheck';

const isHumanDebug = typeof window !== 'undefined' && window.location.search.includes('human=1');
import { SharedScooter } from './SharedScooter';
import { PALETTE } from '../config/palette';
import { getQuality } from '../config/quality';
import { scrollProgress, W } from '../scroll/progress';

export function World() {
  const quality = getQuality();
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight>(null);
  const rimLightRef = useRef<THREE.DirectionalLight>(null);
  const penetrationTimer = useRef(0);

  useFrame(({ gl, scene }, dt) => {
    if (typeof window !== 'undefined') {
      (window as any).__THREE_DRAW_CALLS__ = gl.info.render.calls;
      (window as any).__THREE_TRIANGLES__ = gl.info.render.triangles;

      if (window.location.search.includes('debug=1')) {
        penetrationTimer.current += dt;
        if (penetrationTimer.current > 0.5) {
          penetrationTimer.current = 0;
          runPenetrationCheck(scene);
        }
      }
    }
    const p = scrollProgress.current;

    // 3 Dynamic Background stops: day mint -> pharmacy sky -> city/transit -> dusk navy
    if (p < W.cameraToPharmacy.start) {
      tempBgColor.copy(COLOR_DAY_MINT);
    } else if (p < W.bikeThroughCity.start) {
      const t = (p - W.cameraToPharmacy.start) / (W.bikeThroughCity.start - W.cameraToPharmacy.start);
      tempBgColor.lerpColors(COLOR_DAY_MINT, COLOR_PHARMACY, t);
    } else if (p < W.logoReveal.start) {
      const t = (p - W.bikeThroughCity.start) / (W.logoReveal.start - W.bikeThroughCity.start);
      tempBgColor.lerpColors(COLOR_PHARMACY, COLOR_DAY_MINT, t);
    } else {
      const t = (p - W.logoReveal.start) / (W.logoReveal.end - W.logoReveal.start);
      tempBgColor.lerpColors(COLOR_DAY_MINT, COLOR_DUSK, t);
    }

    const kBg = 1 - Math.exp(-6 * Math.min(dt, 0.05));
    currentBgColor.lerp(tempBgColor, kBg);
    if (!scene.background) {
      scene.background = currentBgColor.clone();
    } else {
      (scene.background as THREE.Color).copy(currentBgColor);
    }
    if (scene.fog) {
      scene.fog.color.copy(currentBgColor);
    }

    // Smoothly interpolate per-scene target intensities (no hard threshold jumps)
    let targetDir = 1.25;
    let targetHemi = 0.75;
    let targetRim = 0.85;

    if (p >= W.logoReveal.start) {
      // Scene 11: Dusk / night navy transition
      const t = Math.min(1, (p - W.logoReveal.start) / (W.logoReveal.end - W.logoReveal.start));
      targetDir = THREE.MathUtils.lerp(1.35, 0.45, t);
      targetHemi = THREE.MathUtils.lerp(0.85, 0.35, t);
      targetRim = THREE.MathUtils.lerp(0.85, 0.30, t);
    } else if (p >= W.bikeThroughCity.start) {
      // Scene 9-10: Overcast city exterior
      const t = Math.min(1, (p - W.bikeThroughCity.start) / (W.customerReceives.end - W.bikeThroughCity.start));
      targetDir = THREE.MathUtils.lerp(1.25, 1.35, t);
      targetHemi = THREE.MathUtils.lerp(0.75, 0.85, t);
      targetRim = THREE.MathUtils.lerp(0.70, 0.85, t);
    }

    // Center shadow camera frustum tightly on the active scene focus point
    getCameraTransform(p, tempCamPos, tempCamLook);
    if (dirLightRef.current) {
      dirLightRef.current.target.position.copy(tempCamLook);
      dirLightRef.current.position.set(tempCamLook.x + 8, tempCamLook.y + 14, tempCamLook.z + 10);
      dirLightRef.current.target.updateMatrixWorld();
    }

    // Damped smoothing
    const k = 1 - Math.exp(-8 * Math.min(dt, 0.05));
    if (dirLightRef.current) dirLightRef.current.intensity = THREE.MathUtils.lerp(dirLightRef.current.intensity, targetDir, k);
    if (hemiLightRef.current) hemiLightRef.current.intensity = THREE.MathUtils.lerp(hemiLightRef.current.intensity, targetHemi, k);
    if (rimLightRef.current) rimLightRef.current.intensity = THREE.MathUtils.lerp(rimLightRef.current.intensity, targetRim, k);
  });

  return (
    <>
      {/* 1. Poly Haven Studio HDRI Environment for Realistic Reflections */}
      <Suspense fallback={null}>
        <Environment files="/assets/hdri/studio_small_08_1k.hdr" />
      </Suspense>

      {/* 2. Constant 3-Light Rig with Precision Dynamic Shadow Camera */}
      {/* 1) Ambient / Sky Hemisphere Light */}
      <hemisphereLight
        ref={hemiLightRef}
        args={[PALETTE.bg, PALETTE.ink, 0.75]}
      />
      {/* 2) Key Directional Sunlight with Tight Frustum */}
      <directionalLight
        ref={dirLightRef}
        position={[8, 14, 10]}
        intensity={1.25}
        castShadow
        shadow-mapSize={quality.isMobile ? [1024, 1024] : [2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0001}
      />
      {/* 3) Cinematic Rim / Backlight for Crisp 3D Edge Separation */}
      <directionalLight
        ref={rimLightRef}
        position={[-7, 8, -6]}
        intensity={0.85}
        color="#E0F2FE"
      />

      {/* 3. Soft Contact Shadows Under Grounded Objects */}
      <ContactShadows
        position={[0.88, -1.65, 0]}
        opacity={0.65}
        scale={9}
        blur={2.0}
        far={4.5}
        frames={Infinity}
        color={PALETTE.ink}
      />

      {/* 4. Camera Rig with Damped Transforms & FOV */}
      <CameraRig />

      {/* Debug Mode: Rigged Human Skeleton & Shading Verification */}
      {isHumanDebug && <HumanDebugScene />}

      {/* 5. Realistic Flagship Smartphone Journey (Scenes 1 - 4) */}
      <Phone />

      {/* 6. Scene 5: Airy Volumetric Cloud & Glowing Order Parcel */}
      <CloudScene />

      {/* 7. Subsequent Narrative Scenes */}
      <PharmacyScene />
      <PackingScene />
      <RiderScene />
      <CityScene />
      <ReceiveScene />
      <LogoScene />

      {/* 8. Single Continuous Shared Scooter Across Scenes 8-10 */}
      <SharedScooter />

      {/* Soft mint distance fog to hide city perimeter and limit draw distance */}
      <fog attach="fog" args={[PALETTE.bg, 45, 175]} />

      {/* 8. Cinematic Post-Processing Pipeline (Desktop 4x MSAA, High-Precision Bloom & Vignette) */}
      {quality.enablePostProcessing && (
        <EffectComposer multisampling={quality.isMobile ? 0 : 4}>
          <Bloom
            luminanceThreshold={0.85}
            luminanceSmoothing={0.3}
            intensity={0.75}
            radius={0.6}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.16} darkness={0.5} />
        </EffectComposer>
      )}
    </>
  );
}