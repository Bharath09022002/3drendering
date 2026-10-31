// src/scenes/World.tsx
import { Suspense, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, N8AO, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { CameraRig } from '../camera/CameraRig';
import { getCameraTransform } from '../camera/keyframes';
import { Phone } from './Phone';
import { StoryLayer } from './fold/StoryLayer';
import { StoryWindow } from './fold/StoryWindow';
import { Foldable } from './fold/Foldable';

export const isWarmupActive = { current: true };
export const warmupStationProgress = { current: 0.0 };
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
import { scrollProgress, masterProgress, foldProgress, FOLD_START, W } from '../scroll/progress';

function DynamicBloom() {
  const bloomRef = useRef<any>(null);
  useFrame(() => {
    const f = foldProgress.current;
    let target = 0.35;
    if (f >= 0.0 && f < 0.80) {
      target = 0.0;
    } else if (f >= 0.80 && f <= 1.00) {
      target = 0.35 * ((f - 0.80) / 0.20);
    } else {
      target = 0.35;
    }
    if (bloomRef.current) {
      bloomRef.current.intensity = target;
    }
  });

  return (
    <Bloom
      ref={bloomRef}
      luminanceThreshold={0.90}
      luminanceSmoothing={0.15}
      intensity={0.35}
      radius={0.4}
      mipmapBlur
    />
  );
}

export function World() {
  const quality = getQuality();
  const { gl, scene, camera } = useThree();
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight>(null);
  const rimLightRef = useRef<THREE.DirectionalLight>(null);
  const oldPhoneGroupRef = useRef<THREE.Group>(null);
  const penetrationTimer = useRef(0);

  useEffect(() => {
    // Precompile scene shaders on initial mount to eliminate shader hitches during scroll.
    // Temporarily expose all hidden objects, disable frustum culling, and enable all layers
    // so Three.js WebGLRenderer projects and compiles every mesh and material across all scenes upfront.
    const hiddenObjects: THREE.Object3D[] = [];
    const culledStates = new Map<THREE.Mesh, boolean>();

    scene.traverse((obj) => {
      if (!obj.visible) {
        hiddenObjects.push(obj);
        obj.visible = true;
      }
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        culledStates.set(mesh, mesh.frustumCulled);
        mesh.frustumCulled = false;
      }
    });

    const originalLayers = camera.layers.mask;
    camera.layers.mask = 0xffffffff;

    const originalCamPos = camera.position.clone();
    const originalCamRot = camera.quaternion.clone();

    // Multi-station upfront shader precompilation:
    // 1. Scene 1-5 Origin Station (x = 0)
    gl.compile(scene, camera);

    // 2. Scene 8-9 City & Transit Station (x = 18, y = 3, z = 6 looking at x = 20, y = 0, z = -2)
    camera.position.set(18, 3, 6);
    camera.lookAt(20, 0, -2);
    camera.updateMatrixWorld();
    gl.compile(scene, camera);

    // 3. Scene 10 Apartment Entrance Station (x = 38.5, y = 1.8, z = 7.5 looking at x = 38.5, y = 1.2, z = 4)
    camera.position.set(38.5, 1.8, 7.5);
    camera.lookAt(38.5, 1.2, 4);
    camera.updateMatrixWorld();
    gl.compile(scene, camera);

    // Upfront Shadow Camera compile: widen frustum temporarily to [-60, +60] so all scenes are precompiled
    if (dirLightRef.current && dirLightRef.current.shadow?.camera) {
      const shadowCam = dirLightRef.current.shadow.camera;
      const origLeft = shadowCam.left;
      const origRight = shadowCam.right;
      shadowCam.left = -60;
      shadowCam.right = 60;
      shadowCam.updateProjectionMatrix();

      gl.compile(scene, shadowCam);

      shadowCam.left = origLeft;
      shadowCam.right = origRight;
      shadowCam.updateProjectionMatrix();
    }

    camera.position.copy(originalCamPos);
    camera.quaternion.copy(originalCamRot);
    camera.updateMatrixWorld();
    camera.layers.mask = originalLayers;
    hiddenObjects.forEach((obj) => {
      obj.visible = false;
    });
    // Note: mesh.frustumCulled stays false for initial warmup frames so EffectComposer (N8AO, Bloom, shadows)
    // compiles shaders for all scenes before user scroll begins, then gets restored in useFrame.

    // Apply max anisotropy (min 16, max supported) and mipmaps to all textures
    const maxAniso = Math.min(16, gl.capabilities.getMaxAnisotropy());
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => {
          if (mat) {
            ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'].forEach((key) => {
              const tex = (mat as any)[key] as THREE.Texture | undefined;
              if (tex && tex.isTexture) {
                tex.anisotropy = maxAniso;
                tex.generateMipmaps = true;
                tex.needsUpdate = true;
              }
            });
          }
        });
      }
    });

    if (typeof window !== 'undefined') {
      (window as any).__ULTRA_PIPELINE__ = {
        tier: quality.tierName,
        dpr: gl.getPixelRatio(),
        multisampling: quality.multisampling,
        shadowMapSize: quality.shadowMapSize,
        anisotropy: maxAniso,
        enableAO: quality.enableAO,
        envIntensity: (scene as any).environmentIntensity ?? 1.0,
      };
    }
  }, [gl, scene, camera, quality]);

  useEffect(() => {
    // Lights that affect the story get both Layer 0 and Layer 1
    if (hemiLightRef.current) hemiLightRef.current.layers.enable(1);
    if (dirLightRef.current) {
      dirLightRef.current.layers.enable(1);
      dirLightRef.current.target.layers.enable(1);
    }
    if (rimLightRef.current) rimLightRef.current.layers.enable(1);
  }, []);

  const prevProgramCount = useRef(0);

  useFrame(({ gl, scene }, dt) => {
    if ((gl.info as any).programs && (gl.info as any).programs.length !== prevProgramCount.current) {
      const progs = (gl.info as any).programs;
      console.log(`[NEW SHADER COMPILED]: total=${progs.length}`);
      const last = progs[progs.length - 1];
      if (last) console.log('SHADER DETAILS:', last.name || last.id, (last as any).prefix?.split('\n').filter((l: string) => l.startsWith('#define')).join(', '));
      prevProgramCount.current = progs.length;
    }
    if (!isWarmupActive.current && dt > 0.033) {
      console.warn(`[FRAME SPIKE in useFrame]: dt=${(dt * 1000).toFixed(1)}ms p=${scrollProgress.current.toFixed(3)}`);
    }
    if (typeof window !== 'undefined') {
      (window as any).__THREE_DRAW_CALLS__ = gl.info.render.calls;
      (window as any).__THREE_TRIANGLES__ = gl.info.render.triangles;
      (window as any).__RENDERER_INFO__ = gl.info;

      const pipeline = (window as any).__ULTRA_PIPELINE__;
      if (pipeline) {
        pipeline.tier = quality.tierName;
        pipeline.dpr = gl.getPixelRatio();
        pipeline.shadowMapSize = quality.shadowMapSize;
        pipeline.multisampling = quality.multisampling;
        pipeline.envIntensity = (scene as any).environmentIntensity ?? 1.0;
      }

      // Expose penetration checker for gate validation on demand without bogging down active scroll
      if (window.location.search.includes('debug=1') && !(window as any).__RUN_PENETRATION_CHECK__) {
        (window as any).__RUN_PENETRATION_CHECK__ = () => runPenetrationCheck(scene);
      }
    }

    // Warmup frame countdown: visits key stations across scenes so EffectComposer
    // (N8AO, Bloom, SMAA) and shadow passes compile all scene shaders and buffers upfront
    const WARMUP_STATIONS = [0.0, 0.54, 0.70, 0.88, 0.95];
    if (isWarmupActive.current) {
      const idx = penetrationTimer.current;
      if (idx < WARMUP_STATIONS.length) {
        warmupStationProgress.current = WARMUP_STATIONS[idx];
        penetrationTimer.current += 1;
      } else {
        isWarmupActive.current = false;
        warmupStationProgress.current = 0.0;
        // Restore standard frustum culling across all meshes for maximum scroll performance
        scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            (obj as THREE.Mesh).frustumCulled = true;
          }
        });
      }
    }
    const p = scrollProgress.current;
    const m = masterProgress.current;

    // Single Continuous Phone: Phone.tsx handles Scenes 1-4 until order is placed (m < FOLD_START).
    // At m >= FOLD_START, Foldable.tsx seamlessly continues the exact same phone into the expansion sequence.
    if (oldPhoneGroupRef.current) {
      oldPhoneGroupRef.current.visible = m < FOLD_START;
    }

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
    const activeP = isWarmupActive.current ? warmupStationProgress.current : p;
    getCameraTransform(activeP, tempCamPos, tempCamLook);
    if (dirLightRef.current) {
      dirLightRef.current.target.position.copy(tempCamLook);
      dirLightRef.current.position.set(tempCamLook.x + 8, tempCamLook.y + 14, tempCamLook.z + 10);
      dirLightRef.current.target.updateMatrixWorld();
    }

    // Dynamic environment HDR reflection intensity per scene
    let targetEnv = 1.0;
    if (p >= W.logoReveal.start) {
      const t = Math.min(1, (p - W.logoReveal.start) / (W.logoReveal.end - W.logoReveal.start));
      targetEnv = THREE.MathUtils.lerp(1.0, 0.35, t);
    } else if (p >= W.bikeThroughCity.start) {
      targetEnv = 1.15;
    } else if (p >= W.packingParcel.start) {
      targetEnv = 1.0;
    } else {
      targetEnv = 0.85;
    }

    // Damped smoothing
    const k = 1 - Math.exp(-8 * Math.min(dt, 0.05));
    if (dirLightRef.current) dirLightRef.current.intensity = THREE.MathUtils.lerp(dirLightRef.current.intensity, targetDir, k);
    if (hemiLightRef.current) hemiLightRef.current.intensity = THREE.MathUtils.lerp(hemiLightRef.current.intensity, targetHemi, k);
    if (rimLightRef.current) rimLightRef.current.intensity = THREE.MathUtils.lerp(rimLightRef.current.intensity, targetRim, k);
    if ((scene as any).environmentIntensity !== undefined) {
      (scene as any).environmentIntensity = THREE.MathUtils.lerp((scene as any).environmentIntensity ?? 1.0, targetEnv, k);
    }
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
        castShadow={quality.shadows}
        shadow-mapSize={[quality.shadowMapSize, quality.shadowMapSize]}
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
      <group ref={oldPhoneGroupRef}>
        <Phone />
      </group>

      {/* New Foldable Device for Unfold Sequence (Scenes 4 -> 5 Handover) */}
      <Foldable />

      {/* Story Window Offscreen FBO Camera Pass */}
      <StoryWindow />

      {/* Story World on Layer 1 (Scenes 5 - 11 + SharedScooter) */}
      <StoryLayer>
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
      </StoryLayer>

      {/* Soft mint distance fog to hide city perimeter and limit draw distance */}
      <fog attach="fog" args={[PALETTE.bg, 45, 175]} />

      {/* 8. Ultra Definition Post-Processing Pipeline (4x MSAA, N8AO, Subtle Bloom, SMAA) */}
      {quality.enablePostProcessing && (
        <EffectComposer multisampling={quality.multisampling}>
          <N8AO
            aoRadius={0.6}
            distanceFalloff={2.0}
            intensity={quality.enableAO ? 1.8 : 0}
            quality="medium"
            halfRes={true}
            color="#020617"
          />
          <DynamicBloom />
          <SMAA />
        </EffectComposer>
      )}
    </>
  );
}