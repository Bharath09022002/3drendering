// src/scenes/models/UltraRealisticApartmentHandover.tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '../../config/palette';
import { BlobShadow } from './BlobShadow';
import { Human, HumanRef } from './Human';
import { seg, scrollProgress, getLocalProgress, W } from '../../scroll/progress';
import { isWarmupActive, warmupStationProgress } from '../World';

export interface ApartmentHandoverProps {
  localP?: number;
}

/**
 * Ultra-Realistic Modern Apartment Entrance, Resident Customer, and Courier Handover.
 * Features:
 * - Driver dismounts from scooter curbside and retrieves parcel from cargo box
 * - Walks smoothly across walkway to customer with distance-driven foot planting
 * - Customer greets driver on porch threshold and receives parcel
 * - Contactless verification halo ring pulses emerald green on handover
 * - Customer steps back inside doorway with parcel
 * - Exactly ONE courier visible across all frames
 */
export function UltraRealisticApartmentHandover({ localP: propLocalP = 0 }: ApartmentHandoverProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const customerRef = useRef<HumanRef>(null);
  const courierRef = useRef<HumanRef>(null);
  const customerGroupRef = useRef<THREE.Group>(null);
  const courierGroupRef = useRef<THREE.Group>(null);
  const packageRef = useRef<THREE.Group>(null);
  const isCourierVisibleRef = useRef(false);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const p = isWarmupActive.current ? warmupStationProgress.current : scrollProgress.current;
    const localP = p >= W.customerReceives.start && p <= W.customerReceives.end
      ? getLocalProgress(p, W.customerReceives.start, W.customerReceives.end)
      : (isWarmupActive.current ? 0.5 : propLocalP);

    isCourierVisibleRef.current = isWarmupActive.current || localP >= 0.18;
    if (courierGroupRef.current) {
      courierGroupRef.current.visible = isCourierVisibleRef.current;
    }

    // Pulse the contactless verification checkmark and halo ring
    if (ringRef.current) {
      const isHandoverActive = localP >= 0.58 && localP <= 0.85;
      const baseScale = isHandoverActive ? 1.0 + Math.sin(t * 6) * 0.08 : 0.9;
      ringRef.current.scale.set(baseScale, baseScale, 1);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        const targetOpacity = isHandoverActive ? 0.85 + Math.sin(t * 6) * 0.15 : 0.25;
        mat.opacity = targetOpacity;
      }
    }

    // =========================================================================
    // COMPLETE 4-PHASE CINEMATIC APPROACH & HANDOVER SEQUENCE
    // Driver ALWAYS faces and makes direct eye contact with the customer
    // =========================================================================

    // Walkway approach location: [-0.85, 0, -0.20]
    // Porch handover location in front of customer: [-0.15, 0, -0.30]
    // Customer doorstep location: [0.55, 0, -0.30]

    if (localP < 0.30) {
      // -----------------------------------------------------------------------
      // Phase 1: Courier walks up walkway towards customer in three-quarter view
      // -----------------------------------------------------------------------
      const walkT = seg(localP, 0.0, 0.30);
      const courierX = THREE.MathUtils.lerp(-0.85, -0.15, walkT);
      const courierZ = THREE.MathUtils.lerp(-0.15, -0.30, walkT);
      const walkDist = walkT * 0.70;

      if (courierGroupRef.current) {
        courierGroupRef.current.position.set(courierX, 0, courierZ);
        // Three-quarter dynamic framing towards customer and camera (neither back to camera)
        courierGroupRef.current.rotation.y = 1.15;
      }
      courierRef.current?.setPose({
        distanceWalked: walkDist,
        isWalking: walkT < 0.95,
        reachAmount: 0.65, // Holding parcel securely with both hands forward
        headLook: 0.0, // Looking straight at customer
        seated: false,
      });

      // Customer on porch threshold waiting and greeting courier
      if (customerGroupRef.current) {
        customerGroupRef.current.position.set(0.55, 0, -0.30);
        customerGroupRef.current.rotation.y = -2.10; // Three-quarter view facing courier and camera
      }
      customerRef.current?.setPose({
        distanceWalked: 0,
        isWalking: false,
        reachAmount: 0.25,
        headLook: 0.0,
        seated: false,
      });

      if (packageRef.current) {
        packageRef.current.position.set(courierX + 0.28, 1.05, courierZ);
        packageRef.current.rotation.set(0, 1.15, 0);
      }
    } else if (localP < 0.75) {
      // -----------------------------------------------------------------------
      // Phase 2: Direct Face-to-Face Handover & Digital Verification Pulse
      // Both faces visible in three-quarter framing (zero backs to camera)
      // -----------------------------------------------------------------------
      const handoverT = seg(localP, 0.30, 0.75);

      if (courierGroupRef.current) {
        courierGroupRef.current.position.set(-0.15, 0, -0.30);
        courierGroupRef.current.rotation.y = 1.15;
      }
      courierRef.current?.setPose({
        distanceWalked: 0.70,
        isWalking: false,
        reachAmount: 1.0 - handoverT * 0.4, // Extends parcel forward to customer
        headLook: -0.05 + 0.12 * Math.sin(handoverT * Math.PI), // Eye contact with warm nod
        seated: false,
      });

      if (customerGroupRef.current) {
        customerGroupRef.current.position.set(0.55, 0, -0.30);
        customerGroupRef.current.rotation.y = -2.10;
      }
      customerRef.current?.setPose({
        distanceWalked: 0,
        isWalking: false,
        reachAmount: 0.35 + handoverT * 0.65, // Reaches out and receives parcel
        headLook: 0.05 + 0.12 * Math.sin(handoverT * Math.PI), // Eye contact smile
        seated: false,
      });

      // Parcel glides smoothly from courier's extended hands directly into customer's hands
      if (packageRef.current) {
        const pkgX = THREE.MathUtils.lerp(0.12, 0.30, handoverT);
        packageRef.current.position.set(pkgX, 1.05, -0.30);
        packageRef.current.rotation.set(0, 1.15, 0);
      }
    } else {
      // -----------------------------------------------------------------------
      // Phase 3: Customer holding verified medicine; courier gives friendly wave
      // -----------------------------------------------------------------------
      const backT = seg(localP, 0.75, 1.00);

      if (courierGroupRef.current) {
        courierGroupRef.current.position.set(-0.15, 0, -0.30);
        courierGroupRef.current.rotation.y = 1.15;
      }
      courierRef.current?.setPose({
        distanceWalked: 0.70,
        isWalking: false,
        reachAmount: 0.2,
        wave: backT * 0.8, // Friendly wave of goodbye
        headLook: 0.0,
        seated: false,
      });

      // Customer steps back slightly into doorway holding delivery safely
      const customerX = THREE.MathUtils.lerp(0.55, 0.65, backT);
      const customerZ = THREE.MathUtils.lerp(-0.30, -0.65, backT);
      if (customerGroupRef.current) {
        customerGroupRef.current.position.set(customerX, 0, customerZ);
        customerGroupRef.current.rotation.y = -2.10;
      }
      customerRef.current?.setPose({
        distanceWalked: -backT * 0.35,
        isWalking: backT > 0.05 && backT < 0.95,
        reachAmount: 0.85, // Holding parcel securely against chest
        headLook: 0.0,
        seated: false,
      });

      // Package safely in customer's hands moving inside
      if (packageRef.current) {
        packageRef.current.position.set(customerX - 0.25, 1.05, customerZ);
        packageRef.current.rotation.set(0, -2.10, 0);
      }
    }
  });

  return (
    <group name="ultra-realistic-apartment-handover-rig">
      {/* ========================================================= */}
      {/* 1. ARCHITECTURAL APARTMENT ENTRANCE (HUMAN SCALE 2.1m x 0.9m) */}
      {/* ========================================================= */}
      <group position={[0, 0, -1.2]}>
        {/* Exterior Facade Wall in Warm Limestone / Stucco */}
        <mesh position={[0, 1.7, -0.05]} receiveShadow>
          <boxGeometry args={[4.8, 3.4, 0.18]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.85} />
        </mesh>

        {/* Recessed Architectural Door Frame in Anodized Graphite */}
        <RoundedBox args={[1.08, 2.22, 0.16]} radius={0.02} smoothness={4} position={[0, 1.15, 0]}>
          <meshStandardMaterial color="#1E293B" roughness={0.3} metalness={0.4} />
        </RoundedBox>

        {/* Fluted Vertical Natural Oak Timber Door Panel */}
        <RoundedBox args={[0.92, 2.10, 0.06]} radius={0.015} smoothness={4} position={[0, 1.13, 0.03]}>
          <meshStandardMaterial color="#78350F" roughness={0.55} metalness={0.05} />
        </RoundedBox>

        {/* Fluted Vertical Timber Slats along Door Face */}
        {Array.from({ length: 9 }).map((_, i) => {
          const x = -0.38 + i * 0.095;
          return (
            <mesh key={i} position={[x, 1.13, 0.065]}>
              <boxGeometry args={[0.03, 2.06, 0.015]} />
              <meshStandardMaterial color="#92400E" roughness={0.5} />
            </mesh>
          );
        })}

        {/* Ergonomic Brushed Brass Pull Handle */}
        <group position={[-0.38, 1.10, 0.09]}>
          <mesh>
            <cylinderGeometry args={[0.014, 0.014, 0.90, 24]} />
            <meshStandardMaterial color="#F59E0B" metalness={0.94} roughness={0.16} />
          </mesh>
          {[-0.38, 0.38].map((my, idx) => (
            <mesh key={idx} position={[0, my, -0.03]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.06, 12]} />
              <meshStandardMaterial color="#F59E0B" metalness={0.94} roughness={0.16} />
            </mesh>
          ))}
        </group>

        {/* Smart Touchscreen Digital Lock Module */}
        <group position={[-0.32, 1.15, 0.07]}>
          <mesh>
            <boxGeometry args={[0.08, 0.22, 0.02]} />
            <meshStandardMaterial color="#0B1F1A" roughness={0.2} metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.03, 0.012]}>
            <planeGeometry args={[0.06, 0.12]} />
            <meshStandardMaterial color="#022C22" emissive={new THREE.Color('#0FA37F')} emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0, -0.06, 0.013]}>
            <circleGeometry args={[0.006, 12]} />
            <meshBasicMaterial color={PALETTE.primary} />
          </mesh>
        </group>

        {/* Modern Brushed Wall Mailbox */}
        <group position={[-0.78, 1.25, 0.06]}>
          <RoundedBox args={[0.26, 0.36, 0.08]} radius={0.015} smoothness={4}>
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
          </RoundedBox>
          <mesh position={[0, 0.08, 0.042]}>
            <boxGeometry args={[0.18, 0.012, 0.005]} />
            <meshBasicMaterial color="#0F172A" />
          </mesh>
        </group>

        {/* Contemporary Architectural Up-Down Wall Sconce Light */}
        <group position={[-0.78, 1.85, 0.08]}>
          <mesh>
            <cylinderGeometry args={[0.045, 0.045, 0.22, 16]} />
            <meshStandardMaterial color="#0F172A" metalness={0.8} roughness={0.25} />
          </mesh>
          {[-0.10, 0.10].map((ly, idx) => (
            <mesh key={idx} position={[0, ly, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.015, 16]} />
              <meshStandardMaterial color="#FEF3C7" emissive={new THREE.Color('#FDE68A')} emissiveIntensity={1.5} />
            </mesh>
          ))}
        </group>

        {/* Backlit Brushed Brass Apartment Suite Number Plaque "402" */}
        <group position={[0.76, 1.55, 0.05]}>
          <mesh>
            <boxGeometry args={[0.24, 0.16, 0.02]} />
            <meshStandardMaterial color="#D97706" metalness={0.92} roughness={0.18} />
          </mesh>
          <mesh position={[0, 0, 0.012]}>
            <planeGeometry args={[0.21, 0.13]} />
            <meshStandardMaterial color="#111827" roughness={0.4} />
          </mesh>
        </group>

        {/* Raised Porch Stone Step (Height 0.08m) */}
        <RoundedBox args={[1.60, 0.08, 0.95]} radius={0.015} smoothness={4} position={[0.2, 0.04, 0.42]} receiveShadow>
          <meshStandardMaterial color="#94A3B8" roughness={0.75} />
        </RoundedBox>

        {/* Coir Welcome Mat on Threshold */}
        <mesh position={[0.2, 0.085, 0.45]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[0.90, 0.55]} />
          <meshStandardMaterial color="#78350F" roughness={0.95} />
        </mesh>

        {/* Warm Architectural Entryway Illumination */}
        <pointLight position={[0.1, 1.9, 0.45]} intensity={2.6} distance={6} color="#FED7AA" />
        <pointLight position={[-0.78, 1.85, 0.25]} intensity={1.4} distance={3.5} color="#FDE68A" />
      </group>

      {/* ========================================================= */}
      {/* 2. RESIDENT CUSTOMER FIGURE (Human Rig with Natural Styling) */}
      {/* ========================================================= */}
      <group ref={customerGroupRef} position={[0.75, 0, -0.65]}>
        <BlobShadow position={[0, 0.003, 0]} scale={[0.8, 0.6]} opacity={0.65} />
        <Human
          ref={customerRef}
          role="customer"
          scale={1.0}
        />
      </group>

      {/* ========================================================= */}
      {/* 3. COURIER FIGURE WALKING & DELIVERING (Single-Rider Guard) */}
      {/* Exactly ONE rider: Visible once driver dismounts (localP >= 0.18) */}
      {/* ========================================================= */}
      <group ref={courierGroupRef} position={[-1.20, 0, 0.15]} visible={false}>
        <BlobShadow position={[0, 0.003, 0]} scale={[0.85, 0.65]} opacity={0.65} />
        <Human
          ref={courierRef}
          role="rider"
          hasHelmet={true}
          scale={1.0}
        />
      </group>

      {/* ========================================================= */}
      {/* 4. HIGH-DEFINITION PHARMAFLY DELIVERY PARCEL & HALO RING  */}
      {/* ========================================================= */}
      <group ref={packageRef} position={[-1.20, 1.14, -0.35]}>
        {/* Sealed Pharmafly Medical Delivery Parcel Body */}
        <RoundedBox args={[0.42, 0.30, 0.24]} radius={0.015} smoothness={4} position={[0, 0, 0]} castShadow>
          <meshStandardMaterial color="#0B7F63" roughness={0.35} metalness={0.05} />
        </RoundedBox>

        {/* White Tamper-Proof Security Tape Seal */}
        <mesh position={[0, 0.152, 0]}>
          <boxGeometry args={[0.43, 0.005, 0.10]} />
          <meshStandardMaterial color="#FF5C36" roughness={0.3} />
        </mesh>

        {/* Thermal Shipping Label with QR & Barcode */}
        <group position={[0, 0, 0.122]}>
          <mesh>
            <planeGeometry args={[0.22, 0.16]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.05, 0.002]}>
            <planeGeometry args={[0.18, 0.025]} />
            <meshBasicMaterial color="#0F172A" />
          </mesh>
          <mesh position={[-0.04, -0.02, 0.002]}>
            <planeGeometry args={[0.09, 0.06]} />
            <meshBasicMaterial color="#0F172A" />
          </mesh>
          <mesh position={[0.04, -0.02, 0.002]}>
            <planeGeometry args={[0.06, 0.06]} />
            <meshBasicMaterial color="#0F172A" />
          </mesh>
        </group>

        {/* Flat Ground-Projected Contactless Verification Ring */}
        <mesh ref={ringRef} position={[0, -1.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.35, 0.45, 32]} />
          <meshBasicMaterial color="#10B981" side={THREE.DoubleSide} transparent opacity={0.70} />
        </mesh>
      </group>
    </group>
  );
}
export default UltraRealisticApartmentHandover;
