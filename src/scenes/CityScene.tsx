// src/scenes/CityScene.tsx
import { useMemo, useRef, useLayoutEffect, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollProgress, getLocalProgress, isInWindow, W } from '../scroll/progress';
import { isWarmupActive } from './World';
import { PALETTE } from '../config/palette';
import { getQuality } from '../config/quality';

const START = W.bikeThroughCity.start;
const END = W.bikeThroughCity.end;

/**
 * 2-turn dynamic urban transit spline (Seamless Curbside Departure -> Avenue -> Parkway -> Apartment Arrival)
 */
export const CITY_ROAD_CURVE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(4.2, 0, 0.5),    // Curbside departure (matches Scene 8 curbside launch)
  new THREE.Vector3(10.0, 0, 1.8),
  new THREE.Vector3(18.0, 0, -2.5),  // Turn 1
  new THREE.Vector3(26.0, 0, -5.0),
  new THREE.Vector3(32.0, 0, -1.5),  // Turn 2
  new THREE.Vector3(38.5, 0, 3.8)    // Destination: Apartment Entrance
]);
CITY_ROAD_CURVE.arcLengthDivisions = 2000;
CITY_ROAD_CURVE.updateArcLengths();

export const bikeTravel = { current: 0 };

/**
 * Generates a flat ribbon BufferGeometry sampled along a curve with strictly vertical (0,1,0) normals.
 * Eliminates all z-fighting and squashed tube distortions.
 */
function createRibbonGeometry(
  curve: THREE.Curve<THREE.Vector3>,
  segments = 256,
  width = 2.6,
  yOffset = 0.005,
  lateralOffset = 0
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const halfWidth = width / 2;
  const tempP = new THREE.Vector3();
  const tempT = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    curve.getPointAt(u, tempP);
    curve.getTangentAt(u, tempT);

    // Lateral normal on ground plane (perpendicular to tangent and strictly vertical up=(0,1,0))
    normal.set(-tempT.z, 0, tempT.x).normalize();

    const centerDist = lateralOffset;
    // Left vertex
    positions.push(
      tempP.x + normal.x * (centerDist - halfWidth),
      tempP.y + yOffset,
      tempP.z + normal.z * (centerDist - halfWidth)
    );
    normals.push(0, 1, 0);
    uvs.push(0, u);

    // Right vertex
    positions.push(
      tempP.x + normal.x * (centerDist + halfWidth),
      tempP.y + yOffset,
      tempP.z + normal.z * (centerDist + halfWidth)
    );
    normals.push(0, 1, 0);
    uvs.push(1, u);

    if (i < segments) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  return geom;
}

function createDashedLineTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(4, 0, 24, 70);
    ctx.fillStyle = '#334155';
    ctx.fillRect(4, 70, 24, 58);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 48);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  return tex;
}

function createBuildingWindowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, 256, 512);

    const cols = 4;
    const rows = 12;
    const padX = 14;
    const padY = 12;
    const winW = (256 - padX * (cols + 1)) / cols;
    const winH = (512 - padY * (rows + 1)) / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = padX + c * (winW + padX);
        const y = padY + r * (winH + padY);

        const lit = (r * 3 + c * 5) % 4 === 0;
        ctx.fillStyle = lit ? '#E0F2FE' : '#CBD5E1';
        ctx.fillRect(x, y, winW, winH);

        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, winW, winH);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 6);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  return tex;
}

function createAOBuildingGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BoxGeometry(1, 1, 1);
  const pos = geom.attributes.position;
  const colors: number[] = [];

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const factor = y < 0 ? 0.65 : 1.0;
    colors.push(factor, factor, factor);
  }

  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geom;
}

export function CityScene() {
  const groupRef = useRef<THREE.Group>(null);
  const routeLineRef = useRef<THREE.Mesh>(null);
  const buildingsRef = useRef<THREE.InstancedMesh>(null);
  const rooftopACRef = useRef<THREE.InstancedMesh>(null);
  const waterTanksRef = useRef<THREE.InstancedMesh>(null);
  const solarPanelsRef = useRef<THREE.InstancedMesh>(null);
  const streetlightsRef = useRef<THREE.InstancedMesh>(null);
  const trafficRef = useRef<THREE.InstancedMesh>(null);
  const quality = getQuality();

  // 1. High-precision flat ribbon geometries (Zero Z-fighting)
  const roadGeometry = useMemo(() => {
    return createRibbonGeometry(CITY_ROAD_CURVE, 256, 2.6, 0.005, 0);
  }, []);

  const leftSidewalkGeometry = useMemo(() => {
    return createRibbonGeometry(CITY_ROAD_CURVE, 256, 0.45, 0.007, -1.525);
  }, []);

  const rightSidewalkGeometry = useMemo(() => {
    return createRibbonGeometry(CITY_ROAD_CURVE, 256, 0.45, 0.007, 1.525);
  }, []);

  const dashedLineGeometry = useMemo(() => {
    return createRibbonGeometry(CITY_ROAD_CURVE, 256, 0.08, 0.009, 0);
  }, []);

  const dashedLineTexture = useMemo(() => createDashedLineTexture(), []);
  const buildingGeometry = useMemo(() => createAOBuildingGeometry(), []);
  const buildingTexture = useMemo(() => createBuildingWindowTexture(), []);

  const routeLineGeometry = useMemo(() => {
    return createRibbonGeometry(CITY_ROAD_CURVE, 256, 0.22, 0.025, 0);
  }, []);

  useEffect(() => {
    return () => {
      roadGeometry.dispose();
      leftSidewalkGeometry.dispose();
      rightSidewalkGeometry.dispose();
      dashedLineGeometry.dispose();
      dashedLineTexture.dispose();
      buildingGeometry.dispose();
      buildingTexture.dispose();
      routeLineGeometry.dispose();
    };
  }, [
    roadGeometry,
    leftSidewalkGeometry,
    rightSidewalkGeometry,
    dashedLineGeometry,
    dashedLineTexture,
    buildingGeometry,
    buildingTexture,
    routeLineGeometry
  ]);

  // 2. Pre-generate Instanced City Transforms & Rooftop Accessories
  const cityData = useMemo(() => {
    const buildingCount = quality.isMobile ? Math.floor(quality.buildingCount * 0.6) : quality.buildingCount;
    const buildings: { pos: THREE.Vector3; scale: THREE.Vector3; rotY: number; color: THREE.Color }[] = [];
    const acUnits: { pos: THREE.Vector3; scale: THREE.Vector3; rotY: number }[] = [];
    const waterTanks: { pos: THREE.Vector3; scale: THREE.Vector3; rotY: number }[] = [];
    const solarPanels: { pos: THREE.Vector3; scale: THREE.Vector3; rotY: number }[] = [];
    const streetlights: { pos: THREE.Vector3; rotY: number }[] = [];

    const colorPalette = [
      new THREE.Color('#E2E8F0'), // Light concrete
      new THREE.Color('#CBD5E1'), // Subtle grey
      new THREE.Color('#F1F5F9'), // Modern off-white
      new THREE.Color('#94A3B8'), // Slate accent
      new THREE.Color(PALETTE.mint) // Pharmafly mint highlight
    ];

    for (let i = 0; i < buildingCount; i++) {
      const t = i / buildingCount;
      const pt = CITY_ROAD_CURVE.getPoint(t);
      const tangent = CITY_ROAD_CURVE.getTangent(t);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const side = (i % 2 === 0 ? 1 : -1);
      const lateralDist = 3.6 + ((i * 137.5) % 18.0);
      const pos = pt.clone().add(normal.clone().multiplyScalar(side * lateralDist));

      const height = 4.5 + ((i * 37) % 16);
      const width = 2.4 + ((i * 23) % 2.5);
      const depth = 2.4 + ((i * 19) % 2.5);
      pos.y = height / 2;

      const rotY = Math.atan2(tangent.x, tangent.z);
      const color = colorPalette[i % colorPalette.length];

      buildings.push({
        pos,
        scale: new THREE.Vector3(width, height, depth),
        rotY,
        color
      });

      // Rooftop Details (Mandatory for Aerial Drone View)
      const roofY = height;
      if (i % 2 === 0) {
        // Rooftop AC Chiller Unit
        acUnits.push({
          pos: new THREE.Vector3(pos.x + 0.3, roofY + 0.25, pos.z - 0.2),
          scale: new THREE.Vector3(0.65, 0.45, 0.5),
          rotY
        });
      }
      if (i % 3 === 0) {
        // Cylindrical Rooftop Water Cooling Tank
        waterTanks.push({
          pos: new THREE.Vector3(pos.x - 0.4, roofY + 0.45, pos.z + 0.3),
          scale: new THREE.Vector3(0.5, 0.8, 0.5),
          rotY
        });
      }
      if (i % 4 === 0) {
        // Rooftop Solar Panel Grid
        solarPanels.push({
          pos: new THREE.Vector3(pos.x + 0.1, roofY + 0.12, pos.z + 0.2),
          scale: new THREE.Vector3(1.1, 0.08, 0.8),
          rotY: rotY + 0.2
        });
      }

      // Streetlights along road corridor
      if (i % 5 === 0) {
        const lightPos = pt.clone().add(normal.clone().multiplyScalar(side * 1.9));
        streetlights.push({ pos: lightPos, rotY });
      }
    }

    return { buildings, acUnits, waterTanks, solarPanels, streetlights };
  }, [quality.buildingCount, quality.isMobile]);

  // Set instanced matrices once
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();

    // 1. Buildings
    if (buildingsRef.current) {
      cityData.buildings.forEach((b, idx) => {
        dummy.position.copy(b.pos);
        dummy.scale.copy(b.scale);
        dummy.rotation.set(0, b.rotY, 0);
        dummy.updateMatrix();
        buildingsRef.current?.setMatrixAt(idx, dummy.matrix);
        buildingsRef.current?.setColorAt(idx, b.color);
      });
      buildingsRef.current.instanceMatrix.needsUpdate = true;
      if (buildingsRef.current.instanceColor) buildingsRef.current.instanceColor.needsUpdate = true;
    }

    // 2. Rooftop AC Units
    if (rooftopACRef.current) {
      cityData.acUnits.forEach((ac, idx) => {
        dummy.position.copy(ac.pos);
        dummy.scale.copy(ac.scale);
        dummy.rotation.set(0, ac.rotY, 0);
        dummy.updateMatrix();
        rooftopACRef.current?.setMatrixAt(idx, dummy.matrix);
      });
      rooftopACRef.current.instanceMatrix.needsUpdate = true;
    }

    // 3. Rooftop Water Tanks
    if (waterTanksRef.current) {
      cityData.waterTanks.forEach((wt, idx) => {
        dummy.position.copy(wt.pos);
        dummy.scale.copy(wt.scale);
        dummy.rotation.set(0, wt.rotY, 0);
        dummy.updateMatrix();
        waterTanksRef.current?.setMatrixAt(idx, dummy.matrix);
      });
      waterTanksRef.current.instanceMatrix.needsUpdate = true;
    }

    // 4. Solar Panels
    if (solarPanelsRef.current) {
      cityData.solarPanels.forEach((sp, idx) => {
        dummy.position.copy(sp.pos);
        dummy.scale.copy(sp.scale);
        dummy.rotation.set(-0.25, sp.rotY, 0);
        dummy.updateMatrix();
        solarPanelsRef.current?.setMatrixAt(idx, dummy.matrix);
      });
      solarPanelsRef.current.instanceMatrix.needsUpdate = true;
    }

    // 5. Streetlights
    if (streetlightsRef.current) {
      cityData.streetlights.forEach((sl, idx) => {
        dummy.position.copy(sl.pos);
        dummy.scale.set(0.12, 2.2, 0.12);
        dummy.rotation.set(0, sl.rotY, 0);
        dummy.updateMatrix();
        streetlightsRef.current?.setMatrixAt(idx, dummy.matrix);
      });
      streetlightsRef.current.instanceMatrix.needsUpdate = true;
    }

    // 6. Ambient Traffic Cars (8 instanced vehicles)
    if (trafficRef.current) {
      const carColors = ['#475569', '#334155', '#64748B', '#0F172A'];
      for (let c = 0; c < 8; c++) {
        dummy.position.set(-18 + c * 7, 0.22, 10 + (c % 2 === 0 ? 3 : -3));
        dummy.scale.set(1.8, 0.65, 0.9);
        dummy.rotation.set(0, (c % 2 === 0 ? 0 : Math.PI), 0);
        dummy.updateMatrix();
        trafficRef.current.setMatrixAt(c, dummy.matrix);
        trafficRef.current.setColorAt(c, new THREE.Color(carColors[c % carColors.length]));
      }
      trafficRef.current.instanceMatrix.needsUpdate = true;
      if (trafficRef.current.instanceColor) trafficRef.current.instanceColor.needsUpdate = true;
    }
  }, [cityData]);

  useFrame(() => {
    if (!groupRef.current) return;
    const p = scrollProgress.current;
    const inWin = isWarmupActive.current || isInWindow(p, START, END, 0.005);
    groupRef.current.visible = inWin;

    if (!inWin) return;

    // Short scale ease-in (0.97 -> 1.0 over 0.01 of progress)
    const entryP = Math.min(1, Math.max(0, (p - (START - 0.005)) / 0.01));
    const exitP = Math.min(1, Math.max(0, ((END + 0.005) - p) / 0.01));
    const cushion = Math.min(entryP, exitP);
    const s = 0.97 + 0.03 * cushion;
    groupRef.current.scale.set(s, s, s);

    const localP = getLocalProgress(p, START, END);
    bikeTravel.current = localP * CITY_ROAD_CURVE.getLength();

    // Glowing route line emission pulsing during Part A & B
    if (routeLineRef.current) {
      const mat = routeLineRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissiveIntensity = 1.4 + Math.sin(localP * Math.PI * 8) * 0.4;
      }
    }
  });

  return (
    <group ref={groupRef} name="scene-9-city">
      {/* 1. Ground Plane (Clean Urban Asphalt / Turf Base) */}
      <mesh position={[21, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[90, 60]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.9} />
      </mesh>

      {/* 2. Main Road Flat Ribbon Geometry (Zero Z-fighting) */}
      <mesh geometry={roadGeometry} receiveShadow>
        <meshStandardMaterial color="#334155" roughness={0.7} />
      </mesh>

      {/* Sidewalk Ribbons flanking road */}
      <mesh geometry={leftSidewalkGeometry} receiveShadow>
        <meshStandardMaterial color="#CBD5E1" roughness={0.8} />
      </mesh>
      <mesh geometry={rightSidewalkGeometry} receiveShadow>
        <meshStandardMaterial color="#CBD5E1" roughness={0.8} />
      </mesh>

      {/* Dashed Center Roadway Line */}
      <mesh geometry={dashedLineGeometry}>
        <meshBasicMaterial map={dashedLineTexture} />
      </mesh>

      {/* 3. Glowing Teal Route Line (#0FA37F Emissive) Flat Ribbon Geometry */}
      <mesh ref={routeLineRef} geometry={routeLineGeometry}>
        <meshStandardMaterial
          color={PALETTE.primaryFill}
          emissive={new THREE.Color(PALETTE.primaryFill)}
          emissiveIntensity={1.8}
          roughness={0.1}
        />
      </mesh>

      {/* 4. Instanced City Buildings (Modular Architectural Facades with AO Gradient & Window Grid) */}
      <instancedMesh
        ref={buildingsRef}
        args={[buildingGeometry, undefined, cityData.buildings.length]}
      >
        <meshStandardMaterial
          map={buildingTexture}
          roughness={0.55}
          metalness={0.08}
          vertexColors
        />
      </instancedMesh>

      {/* 5. Instanced Rooftop AC Chiller Units */}
      <instancedMesh
        ref={rooftopACRef}
        args={[undefined, undefined, cityData.acUnits.length]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#64748B" roughness={0.4} metalness={0.6} />
      </instancedMesh>

      {/* 6. Instanced Rooftop Industrial Water Tanks */}
      <instancedMesh
        ref={waterTanksRef}
        args={[undefined, undefined, cityData.waterTanks.length]}
      >
        <cylinderGeometry args={[0.5, 0.5, 1, 16]} />
        <meshStandardMaterial color="#94A3B8" roughness={0.3} metalness={0.7} />
      </instancedMesh>

      {/* 7. Instanced Rooftop Solar Panels */}
      <instancedMesh
        ref={solarPanelsRef}
        args={[undefined, undefined, cityData.solarPanels.length]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#0A1A2F" roughness={0.15} metalness={0.8} />
      </instancedMesh>

      {/* 8. Instanced Streetlights */}
      <instancedMesh
        ref={streetlightsRef}
        args={[undefined, undefined, cityData.streetlights.length]}
      >
        <cylinderGeometry args={[0.3, 0.4, 1, 8]} />
        <meshStandardMaterial color="#1E293B" roughness={0.6} metalness={0.8} />
      </instancedMesh>

      {/* 9. Instanced Ambient Traffic Vehicles (Desktop Only, dropped on mobile) */}
      {!quality.isMobile && (
        <instancedMesh
          ref={trafficRef}
          args={[undefined, undefined, 8]}
        >
          <boxGeometry args={[1.8, 0.65, 0.9]} />
          <meshStandardMaterial roughness={0.3} metalness={0.5} />
        </instancedMesh>
      )}
    </group>
  );
}