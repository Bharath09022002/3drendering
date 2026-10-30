// src/scenes/models/BlobShadow.tsx
import { useMemo } from 'react';
import * as THREE from 'three';
import { PALETTE } from '../../config/palette';

let sharedBlobTexture: THREE.CanvasTexture | null = null;

function getBlobTexture(): THREE.CanvasTexture {
  if (sharedBlobTexture) return sharedBlobTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(11, 31, 26, 0.75)');
    gradient.addColorStop(0.35, 'rgba(11, 31, 26, 0.45)');
    gradient.addColorStop(0.7, 'rgba(11, 31, 26, 0.15)');
    gradient.addColorStop(1, 'rgba(11, 31, 26, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }

  sharedBlobTexture = new THREE.CanvasTexture(canvas);
  sharedBlobTexture.generateMipmaps = true;
  sharedBlobTexture.minFilter = THREE.LinearMipmapLinearFilter;
  return sharedBlobTexture;
}

interface BlobShadowProps {
  position?: [number, number, number];
  scale?: [number, number] | number;
  opacity?: number;
}

export function BlobShadow({
  position = [0, 0.003, 0],
  scale = 1.0,
  opacity = 0.55
}: BlobShadowProps) {
  const texture = useMemo(() => getBlobTexture(), []);
  const [sx, sy] = typeof scale === 'number' ? [scale, scale] : scale;

  return (
    <mesh
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={1}
    >
      <planeGeometry args={[sx, sy]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        depthWrite={false}
        color={PALETTE.ink}
      />
    </mesh>
  );
}

