// src/dev/penetrationCheck.ts
import * as THREE from 'three';

export interface PenetrationViolation {
  part: string;
  obstacle: string;
  depthCm: number;
}

export interface PenetrationReport {
  timestamp: string;
  maxDeepestOverlapCm: number;
  violations: PenetrationViolation[];
  allowedContacts: string[];
  passed: boolean;
}

/**
 * Evaluates anatomical clearance and non-contact penetration
 * of seated rider body parts against solid scooter shell meshes.
 */
export function runPenetrationCheck(scene: THREE.Scene): PenetrationReport {
  // 1. Locate Rider Bone segments
  const bones: Record<string, THREE.Bone> = {};
  scene.traverse((obj) => {
    if ((obj as THREE.Bone).isBone) {
      bones[obj.name] = obj as THREE.Bone;
    }
  });

  const getBoneSegmentBox = (b1Name: string, b2Name: string, radius = 0.08): THREE.Box3 | null => {
    const b1 = Object.values(bones).find((b) => b.name.includes(b1Name));
    const b2 = Object.values(bones).find((b) => b.name.includes(b2Name));
    if (!b1 || !b2) return null;
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    b1.getWorldPosition(p1);
    b2.getWorldPosition(p2);
    const box = new THREE.Box3();
    box.expandByPoint(new THREE.Vector3(p1.x - radius, p1.y - radius, p1.z - radius));
    box.expandByPoint(new THREE.Vector3(p1.x + radius, p1.y + radius, p1.z + radius));
    box.expandByPoint(new THREE.Vector3(p2.x - radius, p2.y - radius, p2.z - radius));
    box.expandByPoint(new THREE.Vector3(p2.x + radius, p2.y + radius, p2.z + radius));
    return box;
  };

  const riderParts: { name: string; box: THREE.Box3 | null }[] = [
    { name: 'Torso', box: getBoneSegmentBox('Hips', 'Spine2', 0.12) },
    { name: 'Left Thigh', box: getBoneSegmentBox('LeftUpLeg', 'LeftLeg', 0.07) },
    { name: 'Right Thigh', box: getBoneSegmentBox('RightUpLeg', 'RightLeg', 0.07) },
    { name: 'Left Shin', box: getBoneSegmentBox('LeftLeg', 'LeftFoot', 0.06) },
    { name: 'Right Shin', box: getBoneSegmentBox('RightLeg', 'RightFoot', 0.06) },
    { name: 'Left Arm', box: getBoneSegmentBox('LeftArm', 'LeftHand', 0.05) },
    { name: 'Right Arm', box: getBoneSegmentBox('RightArm', 'RightHand', 0.05) },
  ];

  // 2. Locate Scooter Body Anchor / Shell
  const scooter = scene.getObjectByName('world-shared-scooter');
  const scooterPos = new THREE.Vector3();
  if (scooter) scooter.getWorldPosition(scooterPos);

  // Shell obstacles in world space relative to scooter position
  const obstacles = [
    {
      name: 'Under-Seat Fairing',
      box: new THREE.Box3(
        new THREE.Vector3(scooterPos.x - 0.17, scooterPos.y + 0.40, scooterPos.z - 0.56),
        new THREE.Vector3(scooterPos.x + 0.17, scooterPos.y + 0.68, scooterPos.z - 0.26)
      ),
    },
    {
      name: 'Central Step-Through Spine',
      box: new THREE.Box3(
        new THREE.Vector3(scooterPos.x - 0.06, scooterPos.y + 0.35, scooterPos.z - 0.10),
        new THREE.Vector3(scooterPos.x + 0.06, scooterPos.y + 0.40, scooterPos.z + 0.24)
      ),
    },
    {
      name: 'Front Aero Cowling',
      box: new THREE.Box3(
        new THREE.Vector3(scooterPos.x - 0.18, scooterPos.y + 0.54, scooterPos.z + 0.44),
        new THREE.Vector3(scooterPos.x + 0.18, scooterPos.y + 0.98, scooterPos.z + 0.60)
      ),
    },
  ];

  const allowedContacts = [
    {
      name: 'Seat Pad',
      box: new THREE.Box3(
        new THREE.Vector3(scooterPos.x - 0.17, scooterPos.y + 0.66, scooterPos.z - 0.44),
        new THREE.Vector3(scooterPos.x + 0.17, scooterPos.y + 0.82, scooterPos.z - 0.04)
      ),
    },
    {
      name: 'Footboard',
      box: new THREE.Box3(
        new THREE.Vector3(scooterPos.x - 0.21, scooterPos.y + 0.35, scooterPos.z - 0.14),
        new THREE.Vector3(scooterPos.x + 0.21, scooterPos.y + 0.40, scooterPos.z + 0.36)
      ),
    },
    {
      name: 'Grips',
      box: new THREE.Box3(
        new THREE.Vector3(scooterPos.x - 0.40, scooterPos.y + 1.15, scooterPos.z + 0.24),
        new THREE.Vector3(scooterPos.x + 0.40, scooterPos.y + 1.32, scooterPos.z + 0.40)
      ),
    },
  ];

  const allowedList: string[] = [];
  const violations: PenetrationViolation[] = [];
  let maxDeepestOverlap = 0;

  for (const part of riderParts) {
    if (!part.box) continue;

    for (const contact of allowedContacts) {
      const inter = new THREE.Box3().copy(part.box).intersect(contact.box);
      if (!inter.isEmpty()) {
        const s = new THREE.Vector3();
        inter.getSize(s);
        const depth = Math.min(s.x, s.y, s.z);
        if (depth > 0.001) {
          allowedList.push(`${part.name} on ${contact.name} (${(depth * 100).toFixed(1)}cm)`);
        }
      }
    }

    for (const obs of obstacles) {
      const inter = new THREE.Box3().copy(part.box).intersect(obs.box);
      if (!inter.isEmpty()) {
        const s = new THREE.Vector3();
        inter.getSize(s);
        const depth = Math.min(s.x, s.y, s.z);
        if (depth > 0.001) {
          if (depth > maxDeepestOverlap) maxDeepestOverlap = depth;
          if (depth > 0.02) {
            violations.push({ part: part.name, obstacle: obs.name, depthCm: Number((depth * 100).toFixed(2)) });
          }
        }
      }
    }
  }

  const report: PenetrationReport = {
    timestamp: new Date().toISOString(),
    maxDeepestOverlapCm: Number((maxDeepestOverlap * 100).toFixed(2)),
    violations,
    allowedContacts: allowedList,
    passed: violations.length === 0,
  };

  if (typeof window !== 'undefined') {
    (window as any).__PHARMAFLY_PENETRATION_REPORT__ = report;
  }

  return report;
}
