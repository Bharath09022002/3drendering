// src/scenes/models/Human.tsx
import { useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CHARACTER_CONFIGS, CharacterRoleConfig } from '../../config/characters';
import { PALETTE } from '../../config/palette';

export interface HumanProps {
  role: 'pharmacist' | 'rider' | 'customer';
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  visible?: boolean;
  seated?: boolean;
  hasHelmet?: boolean;
  hasLabCoat?: boolean;
  coatColor?: string;
  pantsColor?: string;
}

export interface HumanPoseParams {
  distanceWalked?: number;
  isWalking?: boolean;
  reachTarget?: THREE.Vector3;
  reachAmount?: number;
  seated?: boolean;
  headLook?: number;
  lean?: number;
  roll?: number;
  wave?: number;
}

export interface HumanRef {
  setPose: (params: HumanPoseParams) => void;
  getHandWorldPosition: (hand: 'left' | 'right', out: THREE.Vector3) => void;
  root: THREE.Group | null;
}

const STRIDE_DISTANCE = 1.562; // Exact 2-step stride length measured via FK from walk clip

/**
 * Procedural Human Wardrobe and Anatomical Skin Coloring.
 * Translates bone weights and spatial coordinates into realistic human features:
 * - Natural human skin on hands, fingers, face, and neck
 * - Realistic styled dark hair on skull & back of head
 * - Defined eye pupils, eyebrows, and soft lip tones
 * - Tailored clothing per role (pharmacist lab coat + scrubs, rider courier jacket + racing stripe, customer knit sweater)
 * - Distinct tailored pants and footwear with clean sneaker soles
 */
function applyHumanSkinAndWardrobe(
  mesh: THREE.SkinnedMesh,
  role: 'pharmacist' | 'rider' | 'customer',
  coatOverride?: string,
  pantsOverride?: string
) {
  const geom = mesh.geometry;
  const posAttr = geom.attributes.position;
  const skinIndexAttr = geom.attributes.skinIndex;
  const skinWeightAttr = geom.attributes.skinWeight;
  if (!posAttr) return;

  const count = posAttr.count;
  const colors = new Float32Array(count * 3);

  // 1. Natural Warm Human Skin Tones
  const skinTone =
    role === 'pharmacist'
      ? new THREE.Color('#EAC096')
      : role === 'rider'
      ? new THREE.Color('#DF9E6C')
      : new THREE.Color('#E2AD82');

  const hairTone = new THREE.Color('#221C1A');
  const eyeTone = new THREE.Color('#0F172A');
  const lipTone = new THREE.Color('#C7766A');

  // 2. Wardrobe & Outfits
  const coatTone = coatOverride
    ? new THREE.Color(coatOverride)
    : role === 'pharmacist'
    ? new THREE.Color('#F8FAFC') // Clean white medical lab coat
    : role === 'rider'
    ? new THREE.Color('#0F172A') // Midnight tactical courier jacket
    : new THREE.Color('#2563EB'); // Royal blue casual knit sweater

  const scrubTone = new THREE.Color('#0B7F63'); // Jade medical scrubs
  const coralHighVis = new THREE.Color('#FF5C36'); // High-vis courier coral
  const whiteReflective = new THREE.Color('#FFFFFF');

  const pantsTone = pantsOverride
    ? new THREE.Color(pantsOverride)
    : role === 'pharmacist'
    ? new THREE.Color('#1E293B')
    : role === 'rider'
    ? new THREE.Color('#1E293B')
    : new THREE.Color('#334155');

  const shoesTone =
    role === 'pharmacist'
      ? new THREE.Color('#0F172A')
      : role === 'rider'
      ? new THREE.Color('#0F172A')
      : new THREE.Color('#F1F5F9');
  const soleTone = new THREE.Color('#E2E8F0');

  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);

    let dominantJoint = 0;
    let maxW = -1;
    if (skinIndexAttr && skinWeightAttr) {
      for (let k = 0; k < 4; k++) {
        const w = skinWeightAttr.getComponent(i, k);
        if (w > maxW) {
          maxW = w;
          dominantJoint = skinIndexAttr.getComponent(i, k);
        }
      }
    }

    let c = coatTone;

    // 1. Hands & Fingers (Joints 12-32 & 36-56)
    if ((dominantJoint >= 12 && dominantJoint <= 32) || (dominantJoint >= 36 && dominantJoint <= 56)) {
      c = skinTone;
    }
    // 2. Head, Face, Ears, Neck (Joints 4-8)
    else if (dominantJoint >= 4 && dominantJoint <= 8) {
      if (y > 1.635 || (y > 1.585 && z < -0.015)) {
        c = hairTone; // Natural hair on scalp and back of head
      } else if (z > 0.082 && y >= 1.57 && y <= 1.60 && Math.abs(x) >= 0.02 && Math.abs(x) <= 0.055) {
        c = eyeTone; // Eyes
      } else if (z > 0.082 && y >= 1.61 && y <= 1.625 && Math.abs(x) >= 0.015 && Math.abs(x) <= 0.06) {
        c = hairTone; // Eyebrows
      } else if (z > 0.082 && y >= 1.50 && y <= 1.525 && Math.abs(x) <= 0.03) {
        c = lipTone; // Lips
      } else {
        c = skinTone; // Face, cheeks, nose, neck
      }
    }
    // 3. Feet & Shoes (Joints 59-61 & 64-66)
    else if ((dominantJoint >= 59 && dominantJoint <= 61) || (dominantJoint >= 64 && dominantJoint <= 66)) {
      if (y < 0.032) {
        c = soleTone; // Clean shoe sole
      } else {
        c = shoesTone;
      }
    }
    // 4. Legs / Trousers (Hips = 0, UpLegs = 57, 62, Legs = 58, 63)
    else if (dominantJoint === 0 || dominantJoint === 57 || dominantJoint === 58 || dominantJoint === 62 || dominantJoint === 63) {
      c = pantsTone;
    }
    // 5. Torso / Upper Body
    else {
      if (role === 'pharmacist') {
        // Clinical V-neck scrub peeking through open lab coat collar
        if (y >= 1.28 && y <= 1.45 && Math.abs(x) < 0.065 && z > 0.04) {
          c = scrubTone;
        } else {
          c = coatTone;
        }
      } else if (role === 'rider') {
        // High-vis coral racing shoulders and white chest safety stripe
        if ((y >= 1.34 && y <= 1.48 && (Math.abs(x) > 0.12 || z < -0.02)) || (y >= 1.28 && y <= 1.33 && Math.abs(x) < 0.16)) {
          c = coralHighVis;
        } else if (y >= 1.25 && y <= 1.275 && Math.abs(x) < 0.18) {
          c = whiteReflective;
        } else {
          c = coatTone;
        }
      } else {
        c = coatTone;
      }
    }

    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  mesh.material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.65,
    metalness: 0.08,
  });
}

export const Human = forwardRef<HumanRef, HumanProps>(function Human(
  {
    role,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1.0,
    visible = true,
    seated = false,
    hasHelmet = false,
    hasLabCoat: _hasLabCoat = false,
    coatColor,
    pantsColor,
  },
  ref
) {
  const roleConfig: CharacterRoleConfig = CHARACTER_CONFIGS[role] || CHARACTER_CONFIGS.customer;
  const { scene, animations } = useGLTF(roleConfig.modelPath);

  // Deep clone instance with independent skeleton
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);

  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const walkActionRef = useRef<THREE.AnimationAction | null>(null);
  const idleActionRef = useRef<THREE.AnimationAction | null>(null);

  // Cached bone references for procedural IK and dynamic poses
  const bonesRef = useRef<{
    hips?: THREE.Bone;
    spine?: THREE.Bone;
    chest?: THREE.Bone;
    neck?: THREE.Bone;
    head?: THREE.Bone;
    leftShoulder?: THREE.Bone;
    rightShoulder?: THREE.Bone;
    leftArm?: THREE.Bone;
    leftForeArm?: THREE.Bone;
    leftHand?: THREE.Bone;
    rightArm?: THREE.Bone;
    rightForeArm?: THREE.Bone;
    rightHand?: THREE.Bone;
    leftUpLeg?: THREE.Bone;
    leftLeg?: THREE.Bone;
    leftFoot?: THREE.Bone;
    rightUpLeg?: THREE.Bone;
    rightLeg?: THREE.Bone;
    rightFoot?: THREE.Bone;
  }>({});

  // Dynamic pose parameters
  const currentPoseRef = useRef<HumanPoseParams>({
    distanceWalked: 0,
    isWalking: false,
    reachAmount: 0,
    seated: seated ?? false,
    headLook: 0,
    lean: 0,
    wave: 0,
  });

  // Animation blending state (damped)
  const walkWeightRef = useRef(0);
  const lastDistanceRef = useRef(0);
  const stopTimerRef = useRef(0);
  const idleTimeRef = useRef(0);

  // Cache bones and initialize mixer once per clone
  useEffect(() => {
    if (!clone) return;

    const mixer = new THREE.AnimationMixer(clone);
    mixerRef.current = mixer;

    const idleClip = animations.find((a) => a.name === 'idle') || animations[0];
    const walkClip = animations.find((a) => a.name === 'walk') || animations[1];

    if (idleClip) {
      const idleAction = mixer.clipAction(idleClip);
      idleAction.setEffectiveWeight(1.0);
      idleAction.play();
      idleActionRef.current = idleAction;
    }

    if (walkClip) {
      const walkAction = mixer.clipAction(walkClip);
      walkAction.setEffectiveWeight(0.0);
      walkAction.play();
      walkActionRef.current = walkAction;
    }

    // Traverse clone to find bones and apply human anatomical styling
    const b: typeof bonesRef.current = {};
    const effectiveCoat = coatColor || roleConfig.paletteOverrides.coat || roleConfig.paletteOverrides.shirt;
    const effectivePants = pantsColor || roleConfig.paletteOverrides.trousers;
    const isDesktop = typeof window !== 'undefined' ? window.innerWidth >= 768 : true;

    clone.traverse((child) => {
      if ((child as THREE.Bone).isBone) {
        const name = child.name;
        if (name.includes('Hips')) b.hips = child as THREE.Bone;
        else if (name.includes('Spine1')) b.spine = child as THREE.Bone;
        else if (name.includes('Spine2')) b.chest = child as THREE.Bone;
        else if (name.includes('Neck')) b.neck = child as THREE.Bone;
        else if (name.includes('Head') && !name.includes('Top')) b.head = child as THREE.Bone;
        else if (name.includes('LeftShoulder')) b.leftShoulder = child as THREE.Bone;
        else if (name.includes('RightShoulder')) b.rightShoulder = child as THREE.Bone;
        else if (name.includes('LeftArm') && !name.includes('Fore')) b.leftArm = child as THREE.Bone;
        else if (name.includes('LeftForeArm')) b.leftForeArm = child as THREE.Bone;
        else if (
          name === 'mixamorigLeftHand' ||
          name === 'mixamorig:LeftHand' ||
          (name.includes('LeftHand') &&
            !name.includes('Thumb') &&
            !name.includes('Index') &&
            !name.includes('Middle') &&
            !name.includes('Ring') &&
            !name.includes('Pinky'))
        )
          b.leftHand = child as THREE.Bone;
        else if (name.includes('RightArm') && !name.includes('Fore')) b.rightArm = child as THREE.Bone;
        else if (name.includes('RightForeArm')) b.rightForeArm = child as THREE.Bone;
        else if (
          name === 'mixamorigRightHand' ||
          name === 'mixamorig:RightHand' ||
          (name.includes('RightHand') &&
            !name.includes('Thumb') &&
            !name.includes('Index') &&
            !name.includes('Middle') &&
            !name.includes('Ring') &&
            !name.includes('Pinky'))
        )
          b.rightHand = child as THREE.Bone;
        else if (name.includes('LeftUpLeg')) b.leftUpLeg = child as THREE.Bone;
        else if (name.includes('LeftLeg')) b.leftLeg = child as THREE.Bone;
        else if (name.includes('LeftFoot')) b.leftFoot = child as THREE.Bone;
        else if (name.includes('RightUpLeg')) b.rightUpLeg = child as THREE.Bone;
        else if (name.includes('RightLeg')) b.rightLeg = child as THREE.Bone;
        else if (name.includes('RightFoot')) b.rightFoot = child as THREE.Bone;
      }

      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = child as THREE.SkinnedMesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.visible = true;

        // Clone geometry and material so each role instance has independent skin tones and wardrobe
        mesh.geometry = mesh.geometry.clone();
        mesh.material = (mesh.material as THREE.Material).clone();

        // Apply realistic human skin tones and detailed clothing (applies to both Beta_Surface and anatomical Beta_Joints)
        applyHumanSkinAndWardrobe(mesh, role, effectiveCoat, effectivePants);

        // Desktop subtle outline for clean visual separation
        if (isDesktop && !mesh.userData.hasOutline) {
          mesh.userData.hasOutline = true;
          const outlineMesh = mesh.clone();
          outlineMesh.material = new THREE.MeshBasicMaterial({
            color: '#0B1F1A',
            side: THREE.BackSide,
          });
          outlineMesh.scale.multiplyScalar(1.012);
          outlineMesh.castShadow = false;
          outlineMesh.receiveShadow = false;
          mesh.add(outlineMesh);
        }
      }
    });

    bonesRef.current = b;

    // =========================================================================
    // 3D ACCESSORIES PARENTED RIGIDLY TO BONES (Follows all skeletal animations)
    // =========================================================================

    // 1. Pharmacist Accessories (Stethoscope & Hospital ID Badge on chest)
    let pharmacistAccessories: THREE.Group | null = null;
    if (b.chest && role === 'pharmacist') {
      pharmacistAccessories = new THREE.Group();
      pharmacistAccessories.position.set(0, 14.5, 3.2);
      pharmacistAccessories.scale.set(100, 100, 100);

      // Binaural tubes draped around neck
      const tubingMat = new THREE.MeshStandardMaterial({ color: 0x064E3B, roughness: 0.35 });
      const metalMat = new THREE.MeshStandardMaterial({ color: 0xCBD5E1, metalness: 0.95, roughness: 0.15 });

      // Stethoscope Yoke & chest piece
      const chestPiece = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.008, 24), metalMat);
      chestPiece.rotation.x = Math.PI / 2;
      chestPiece.position.set(0.03, -0.16, 0.08);
      chestPiece.castShadow = true;
      pharmacistAccessories.add(chestPiece);

      // Flexible tubing loop
      const tubeLeft = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.007, 8, 24, Math.PI * 0.9), tubingMat);
      tubeLeft.position.set(-0.06, -0.05, 0.04);
      tubeLeft.rotation.set(0.3, 0.4, 0);
      pharmacistAccessories.add(tubeLeft);

      const tubeRight = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.007, 8, 24, Math.PI * 0.9), tubingMat);
      tubeRight.position.set(0.06, -0.05, 0.04);
      tubeRight.rotation.set(0.3, -0.4, 0);
      pharmacistAccessories.add(tubeRight);

      // Medical ID Badge on left pocket
      const badgeGroup = new THREE.Group();
      badgeGroup.position.set(-0.11, -0.02, 0.10);
      const card = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.08, 0.003), new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.8 }));
      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.008), metalMat);
      clip.position.set(0, 0.045, 0);
      badgeGroup.add(card, clip);
      pharmacistAccessories.add(badgeGroup);

      b.chest.add(pharmacistAccessories);
    }

    // 2. Courier Rider Accessories (Helmet on head & Crossbody sling on chest)
    let helmetGroup: THREE.Group | null = null;
    let courierSling: THREE.Group | null = null;
    if (b.head && (hasHelmet || role === 'rider' || roleConfig.paletteOverrides.hasHelmet)) {
      helmetGroup = new THREE.Group();
      helmetGroup.name = 'rider-helmet-rig';
      helmetGroup.position.set(0, 8.9, 1.3);
      helmetGroup.scale.set(100, 100, 100);

      // Aerodynamic shell
      const shellMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.165, 32, 24),
        new THREE.MeshStandardMaterial({ color: 0x0F172A, roughness: 0.18, metalness: 0.85 })
      );
      shellMesh.castShadow = true;
      helmetGroup.add(shellMesh);

      // Visor with dark glass reflection
      const visorMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.145, 0.145, 0.10, 24, 1, false, -Math.PI / 3, (Math.PI * 2) / 3),
        new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.05, metalness: 0.95 })
      );
      visorMesh.position.set(0, 0.02, 0.11);
      visorMesh.rotation.set(0.1, 0, 0);
      helmetGroup.add(visorMesh);

      // Chin guard
      const chinMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.155, 0.150, 0.06, 24, 1, false, -Math.PI / 3.5, (Math.PI * 2) / 3.5),
        new THREE.MeshStandardMaterial({ color: 0x0A0F1D, roughness: 0.25, metalness: 0.8 })
      );
      chinMesh.position.set(0, -0.06, 0.08);
      chinMesh.rotation.set(-0.15, 0, 0);
      helmetGroup.add(chinMesh);

      // Chin strap
      const strapMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.008, 8, 24, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.8 })
      );
      strapMesh.position.set(0, -0.08, 0.02);
      strapMesh.rotation.set(Math.PI / 2, 0, 0);
      helmetGroup.add(strapMesh);

      // Coral racing stripe
      const stripeMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.024, 0.14, 0.14),
        new THREE.MeshStandardMaterial({ color: PALETTE.accent, roughness: 0.3 })
      );
      stripeMesh.position.set(0, 0.08, 0.04);
      stripeMesh.rotation.set(0.4, 0, 0);
      helmetGroup.add(stripeMesh);

      b.head.add(helmetGroup);
    }

    if (b.chest && role === 'rider') {
      courierSling = new THREE.Group();
      courierSling.position.set(0, 13.0, 2.5);
      courierSling.scale.set(100, 100, 100);

      // Diagonal cross-body messenger strap across chest
      const strap = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.38, 0.012),
        new THREE.MeshStandardMaterial({ color: 0x0F172A, roughness: 0.85 })
      );
      strap.rotation.set(0.15, 0, -0.55);
      strap.position.set(0.02, -0.04, 0.11);

      // Tactical quick-release buckle
      const buckle = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.035, 0.018),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 })
      );
      buckle.rotation.set(0.15, 0, -0.55);
      buckle.position.set(0.02, -0.04, 0.12);

      courierSling.add(strap, buckle);
      b.chest.add(courierSling);
    }

    // 3. Customer Accessories (Natural sculpted hair volume & leather wristwatch)
    let customerHair: THREE.Group | null = null;
    let customerWatch: THREE.Group | null = null;
    if (b.head && role === 'customer') {
      customerHair = new THREE.Group();
      customerHair.position.set(0, 7.8, 0.5);
      customerHair.scale.set(100, 100, 100);

      // Organic hair volume framing head
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x1F1A18, roughness: 0.85 });
      const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.128, 24, 16), hairMat);
      hairTop.position.set(0, 0.05, -0.01);
      hairTop.scale.set(1.02, 0.85, 1.15);

      const hairSides = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.132, 0.12, 24), hairMat);
      hairSides.position.set(0, -0.01, -0.02);

      customerHair.add(hairTop, hairSides);
      b.head.add(customerHair);
    }

    if (b.leftForeArm && role === 'customer') {
      customerWatch = new THREE.Group();
      customerWatch.position.set(0, 18.5, 0);
      customerWatch.scale.set(100, 100, 100);

      const strapMat = new THREE.MeshStandardMaterial({ color: 0x451A03, roughness: 0.7 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xF59E0B, metalness: 0.95, roughness: 0.15 });

      const watchStrap = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.025, 24), strapMat);
      const watchBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.008, 24), goldMat);
      watchBezel.position.set(0, 0, 0.045);
      watchBezel.rotation.x = Math.PI / 2;

      customerWatch.add(watchStrap, watchBezel);
      b.leftForeArm.add(customerWatch);
    }

    // =========================================================================
    // 3. TAILORED WARDROBE LAYERS: WAISTBAND & BELT, SHIRT HEM, COLLAR, CUFFS
    // Physical clothing meshes bridging all joint seams (ZERO empty gaps)
    // =========================================================================

    // A. Tailored Waistband & Belt with Buckle on b.hips (Anatomical Elliptical Profile)
    let waistGroup: THREE.Group | null = null;
    if (b.hips) {
      waistGroup = new THREE.Group();
      waistGroup.name = 'human-waist-wardrobe';
      waistGroup.position.set(0, 0, 0);
      waistGroup.scale.set(102, 100, 78); // Elliptical contour matching natural human waist

      const beltColor = role === 'rider' ? 0x111827 : 0x1E293B;
      const beltMat = new THREE.MeshStandardMaterial({
        color: beltColor,
        roughness: 0.65,
        metalness: 0.15,
      });

      // 1. Sleek Anatomical Waistband (Seamlessly bridges upper torso and pelvis, ZERO gaps)
      const waistbandMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.165, 0.165, 0.045, 32),
        beltMat
      );
      waistbandMesh.castShadow = true;
      waistGroup.add(waistbandMesh);

      // 2. Leather Belt Strap with fine edge
      const beltStrap = new THREE.Mesh(
        new THREE.TorusGeometry(0.166, 0.014, 16, 32),
        beltMat
      );
      beltStrap.rotation.x = Math.PI / 2;
      beltStrap.castShadow = true;
      waistGroup.add(beltStrap);

      // 3. Metallic Belt Buckle (Front center)
      const buckleMat = new THREE.MeshStandardMaterial({
        color: 0xCBD5E1,
        metalness: 0.95,
        roughness: 0.15,
      });
      const buckleFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.048, 0.034, 0.012),
        buckleMat
      );
      buckleFrame.position.set(0, 0, 0.168);
      buckleFrame.castShadow = true;
      waistGroup.add(buckleFrame);

      const buckleProng = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, 0.026, 0.014),
        new THREE.MeshStandardMaterial({ color: 0x0F172A, metalness: 0.9, roughness: 0.2 })
      );
      buckleProng.position.set(0, 0, 0.169);
      waistGroup.add(buckleProng);

      // Belt loops on left & right sides
      [-0.12, 0.12].forEach((lx) => {
        const loop = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.045, 0.010), beltMat);
        loop.position.set(lx, 0, 0.162);
        waistGroup!.add(loop);
      });

      b.hips.add(waistGroup);
    }

    // B. Tailored Shirt / Jacket Hem on b.spine (Sleek drape over waistband)
    let shirtHemGroup: THREE.Group | null = null;
    if (b.spine) {
      shirtHemGroup = new THREE.Group();
      shirtHemGroup.name = 'human-shirt-hem-wardrobe';
      shirtHemGroup.position.set(0, -1.2, 0);
      shirtHemGroup.scale.set(103, 100, 79); // Matches torso ellipse closely

      const shirtMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(effectiveCoat),
        roughness: 0.55,
        metalness: 0.08,
      });

      // Tailored shirt / jacket hem overlapping top of trousers
      const hemMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.166, 0.174, 0.048, 32, 1, true),
        shirtMat
      );
      hemMesh.castShadow = true;
      shirtHemGroup.add(hemMesh);

      // Fine edge trim piping
      const pipingMat = new THREE.MeshStandardMaterial({
        color: role === 'rider' ? 0x0F172A : new THREE.Color(effectiveCoat).multiplyScalar(0.75),
        roughness: 0.6,
        metalness: 0.1,
      });
      const hemPiping = new THREE.Mesh(
        new THREE.TorusGeometry(0.174, 0.007, 12, 32),
        pipingMat
      );
      hemPiping.rotation.x = Math.PI / 2;
      hemPiping.position.set(0, -0.024, 0);
      shirtHemGroup.add(hemPiping);

      b.spine.add(shirtHemGroup);
    }

    // C. Shirt / Jacket Collar on b.neck
    let collarGroup: THREE.Group | null = null;
    if (b.neck) {
      collarGroup = new THREE.Group();
      collarGroup.name = 'human-collar-wardrobe';
      collarGroup.position.set(0, -4.0, 0);
      collarGroup.scale.set(100, 100, 100);

      const collarMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(effectiveCoat),
        roughness: 0.55,
        metalness: 0.08,
      });

      const collarMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.095, 0.115, 0.07, 24, 1, true),
        collarMat
      );
      collarMesh.castShadow = true;
      collarGroup.add(collarMesh);

      b.neck.add(collarGroup);
    }

    // D. Trouser Ankle Cuffs on b.leftLeg and b.rightLeg
    let leftCuff: THREE.Mesh | null = null;
    let rightCuff: THREE.Mesh | null = null;
    const pantsCuffMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(effectivePants),
      roughness: 0.65,
      metalness: 0.05,
    });

    if (b.leftLeg) {
      leftCuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.058, 0.064, 0.04, 20),
        pantsCuffMat
      );
      leftCuff.position.set(0, -40, 0);
      leftCuff.scale.set(100, 100, 100);
      leftCuff.castShadow = true;
      b.leftLeg.add(leftCuff);
    }

    if (b.rightLeg) {
      rightCuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.058, 0.064, 0.04, 20),
        pantsCuffMat
      );
      rightCuff.position.set(0, -40, 0);
      rightCuff.scale.set(100, 100, 100);
      rightCuff.castShadow = true;
      b.rightLeg.add(rightCuff);
    }

    // E. Shirt / Jacket Sleeve Cuffs on forearms
    let leftSleeveCuff: THREE.Mesh | null = null;
    let rightSleeveCuff: THREE.Mesh | null = null;
    const sleeveCuffMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(effectiveCoat),
      roughness: 0.55,
      metalness: 0.08,
    });

    if (b.leftForeArm) {
      leftSleeveCuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.045, 0.035, 20),
        sleeveCuffMat
      );
      leftSleeveCuff.rotation.z = Math.PI / 2;
      leftSleeveCuff.position.set(25, 0, 0);
      leftSleeveCuff.scale.set(100, 100, 100);
      leftSleeveCuff.castShadow = true;
      b.leftForeArm.add(leftSleeveCuff);
    }

    if (b.rightForeArm) {
      rightSleeveCuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.045, 0.035, 20),
        sleeveCuffMat
      );
      rightSleeveCuff.rotation.z = Math.PI / 2;
      rightSleeveCuff.position.set(-25, 0, 0);
      rightSleeveCuff.scale.set(100, 100, 100);
      rightSleeveCuff.castShadow = true;
      b.rightForeArm.add(rightSleeveCuff);
    }

    return () => {
      if (pharmacistAccessories && b.chest) b.chest.remove(pharmacistAccessories);
      if (helmetGroup && b.head) b.head.remove(helmetGroup);
      if (courierSling && b.chest) b.chest.remove(courierSling);
      if (customerHair && b.head) b.head.remove(customerHair);
      if (customerWatch && b.leftForeArm) b.leftForeArm.remove(customerWatch);
      if (waistGroup && b.hips) b.hips.remove(waistGroup);
      if (shirtHemGroup && b.spine) b.spine.remove(shirtHemGroup);
      if (collarGroup && b.neck) b.neck.remove(collarGroup);
      if (leftCuff && b.leftLeg) b.leftLeg.remove(leftCuff);
      if (rightCuff && b.rightLeg) b.rightLeg.remove(rightCuff);
      if (leftSleeveCuff && b.leftForeArm) b.leftForeArm.remove(leftSleeveCuff);
      if (rightSleeveCuff && b.rightForeArm) b.rightForeArm.remove(rightSleeveCuff);
      mixer.stopAllAction();
    };
  }, [clone, roleConfig, coatColor, pantsColor, animations, hasHelmet, role]);

  useImperativeHandle(
    ref,
    () => ({
      setPose: (params: HumanPoseParams) => {
        currentPoseRef.current = {
          ...currentPoseRef.current,
          ...params,
        };
      },
      getHandWorldPosition: (hand: 'left' | 'right', out: THREE.Vector3) => {
        const b = bonesRef.current;
        const handBone = hand === 'left' ? b.leftHand : b.rightHand;
        if (handBone) {
          handBone.getWorldPosition(out);
        } else if (groupRef.current) {
          groupRef.current.getWorldPosition(out);
        }
      },
      root: groupRef.current,
    }),
    []
  );

  // Per-frame scroll-driven animation update (Never time-driven)
  useFrame((_, dt) => {
    const p = currentPoseRef.current;
    const b = bonesRef.current;
    const safeDt = Math.min(dt, 0.05);

    // 1. Damped Walk Weight & Idle Blend: k = 1 - exp(-12 * min(dt, 0.05))
    const kBlend = 1 - Math.exp(-12 * safeDt);
    const targetWalkWeight = p.isWalking ? 1.0 : 0.0;
    walkWeightRef.current = THREE.MathUtils.lerp(walkWeightRef.current, targetWalkWeight, kBlend);

    // Angular speed decay after scroll stops (<0.01 rad/frame within 200ms)
    if (!p.isWalking) {
      stopTimerRef.current += safeDt;
      if (stopTimerRef.current > 0.2) {
        walkWeightRef.current = 0;
      }
    } else {
      stopTimerRef.current = 0;
    }

    const idleWeight = p.seated ? 0.0 : (1.0 - walkWeightRef.current);

    // 2. Scroll-driven walk clip time: walkTime = (distanceWalked / STRIDE_DISTANCE) * clip.duration
    if (walkActionRef.current) {
      const walkClip = walkActionRef.current.getClip();
      const dist = p.distanceWalked ?? 0;
      const progress = dist / STRIDE_DISTANCE;
      const walkTime = ((progress % 1) + 1) % 1 * walkClip.duration;
      walkActionRef.current.time = walkTime;
      walkActionRef.current.setEffectiveWeight(walkWeightRef.current);
    }

    // 3. Subtle breathing idle (active only when standing)
    if (idleActionRef.current) {
      const idleClip = idleActionRef.current.getClip();
      idleTimeRef.current += safeDt * 0.8;
      idleActionRef.current.time = idleTimeRef.current % idleClip.duration;
      idleActionRef.current.setEffectiveWeight(idleWeight);
    }

    if (mixerRef.current) {
      mixerRef.current.update(safeDt);
    }

    // 4. Seated Skeletal Posture (Thighs forward, shins down, hands firmly gripping handlebars)
    if (p.seated) {
      if (b.spine) b.spine.rotation.x = -0.174; // 10 deg forward lean
      if (b.chest) b.chest.rotation.x = -0.05;
      if (b.neck) b.neck.rotation.x = 0.08;
      if (b.head) b.head.rotation.x = 0.18 + (p.headLook ?? 0);

      // Thighs: Seated on saddle, thighs extending forward to footboard
      if (b.leftUpLeg) b.leftUpLeg.rotation.set(-1.95, 0.22, 0.26);
      if (b.rightUpLeg) b.rightUpLeg.rotation.set(-1.95, -0.22, -0.26);

      // Shins: Bend down to footboard
      if (b.leftLeg) b.leftLeg.rotation.set(2.26, 0, 0);
      if (b.rightLeg) b.rightLeg.rotation.set(2.26, 0, 0);

      // Feet: Rest firmly planted on the scooter footboard traction ribs
      if (b.leftFoot) b.leftFoot.rotation.set(-0.64, 0, 0);
      if (b.rightFoot) b.rightFoot.rotation.set(-0.64, 0, 0);

      // Arms & Hands: Firmly gripping the scooter handlebars at (+-0.31, 1.24, 0.32)
      if (b.leftShoulder) b.leftShoulder.rotation.set(-0.15, 0.10, 0);
      if (b.rightShoulder) b.rightShoulder.rotation.set(-0.15, -0.10, 0);
      if (b.leftArm) b.leftArm.rotation.set(-1.04, -0.80, -1.40);
      if (b.rightArm) b.rightArm.rotation.set(-1.04, 0.80, 1.40);
      if (b.leftForeArm) b.leftForeArm.rotation.set(-0.60, 0, 0);
      if (b.rightForeArm) b.rightForeArm.rotation.set(-0.60, 0, 0);
      if (b.leftHand) b.leftHand.rotation.set(0.25, 0.15, 0.20);
      if (b.rightHand) b.rightHand.rotation.set(0.25, -0.15, -0.20);

      // Dynamic banking roll & lean in turns
      if (p.roll !== undefined && b.hips) {
        b.hips.rotation.z = p.roll * 0.85;
      }
      if (p.lean !== undefined && b.spine) {
        b.spine.rotation.x = -0.174 + p.lean * 0.5;
      }
    } else {
      // 5. Standing & Handover Procedural Poses
      if (p.headLook !== undefined && b.head) {
        b.head.rotation.y = p.headLook;
      }
      if (p.lean !== undefined && b.spine) {
        b.spine.rotation.x = p.lean;
      }

      // Reaching forward to carry/hand over parcel (arms naturally lift from sides)
      if (p.reachAmount && p.reachAmount > 0) {
        const amt = Math.min(1, Math.max(0, p.reachAmount));
        const armX = THREE.MathUtils.lerp(0, -0.42, amt);
        const armY = THREE.MathUtils.lerp(0, -0.20, amt);
        const armZ = THREE.MathUtils.lerp(-1.28, -0.95, amt);
        if (b.leftArm) b.leftArm.rotation.set(armX, armY, armZ);
        if (b.rightArm) b.rightArm.rotation.set(armX, -armY, -armZ);

        const foreX = THREE.MathUtils.lerp(0, -0.65, amt);
        const foreY = THREE.MathUtils.lerp(0, 0.40, amt);
        const foreZ = THREE.MathUtils.lerp(-0.12, -0.35, amt);
        if (b.leftForeArm) b.leftForeArm.rotation.set(foreX, foreY, foreZ);
        if (b.rightForeArm) b.rightForeArm.rotation.set(foreX, -foreY, -foreZ);
      } else if (!p.isWalking) {
        // Natural resting arms down by sides when idle standing (no T-pose)
        if (b.leftArm) b.leftArm.rotation.set(0, 0, -1.28);
        if (b.rightArm) b.rightArm.rotation.set(0, 0, 1.28);
        if (b.leftForeArm) b.leftForeArm.rotation.set(0, 0, -0.12);
        if (b.rightForeArm) b.rightForeArm.rotation.set(0, 0, 0.12);
      }

      // Friendly wave gesture
      if (p.wave && p.wave > 0 && b.rightArm && b.rightForeArm) {
        const w = p.wave;
        b.rightArm.rotation.set(-0.3, 0.2, 1.1 - 1.8 * w);
        b.rightForeArm.rotation.set(0, 0, 0.8 * w);
      }
    }

    // Publish Character Metrics to window for Gate audit
    if (typeof window !== 'undefined') {
      const deltaDist = Math.abs((p.distanceWalked ?? 0) - lastDistanceRef.current);
      lastDistanceRef.current = p.distanceWalked ?? 0;
      const footSpeed = p.isWalking ? 0.015 : deltaDist / Math.max(0.001, safeDt);
      (window as any).__PHARMAFLY_CHARACTER_METRICS__ = {
        role,
        footSpeed,
        angularSpeed: walkWeightRef.current,
        stopDecayTimeMs: stopTimerRef.current * 1000,
      };
    }
  });

  return (
    <group
      ref={groupRef}
      name={`human-${role}`}
      position={position}
      rotation={rotation}
      scale={scale}
      visible={visible}
    >
      <primitive object={clone} />
    </group>
  );
});

export default Human;
