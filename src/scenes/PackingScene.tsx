// src/scenes/PackingScene.tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { scrollProgress, getLocalProgress, isInWindow, W, seg } from '../scroll/progress';
import { BlobShadow } from './models/BlobShadow';
import { Human, HumanRef } from './models/Human';

const START = W.retailerPacks.start;
const END = W.retailerPacks.end;

/**
 * Scene 7: Retailer Packs & Verifies.
 * High-definition pharmacy packing station featuring:
 * - Architectural fluted counter with Italian Corian top & recessed toe-kick
 * - Pharmacist actively verifying medication and packing the order
 * - Prescription verification terminal with digital dispatch UI
 * - Barcode scanner with glowing red sweep laser
 * - High-detail Pharmafly insulated tamper-evident delivery bag with shipping label & seal
 * - Realistic medicine box (Amoxicillin 500mg), blister foil strip & amber medicine bottle
 * - Background pharmacy apothecary shelving with clinical stock
 */
export function PackingScene() {
  const groupRef = useRef<THREE.Group>(null);
  const medicineBoxRef = useRef<THREE.Group>(null);
  const bagFlapRef = useRef<THREE.Group>(null);
  const scanLaserRef = useRef<THREE.Mesh>(null);
  const pharmacistRef = useRef<HumanRef>(null);
  const sealTapeRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const p = scrollProgress.current;
    const inWin = isInWindow(p, START, END, 0.005);
    groupRef.current.visible = inWin;

    if (!inWin) return;

    // Smooth scale cushion on entry/exit (0.97 -> 1.0)
    const entryP = Math.min(1, Math.max(0, (p - (START - 0.005)) / 0.01));
    const exitP = Math.min(1, Math.max(0, ((END + 0.005) - p) / 0.01));
    const cushion = Math.min(entryP, exitP);
    const s = 0.97 + 0.03 * cushion;
    groupRef.current.scale.set(s, s, s);

    const localP = getLocalProgress(p, START, END);

    // 1. Medicine carton drops smoothly into delivery bag (0.05 -> 0.45 via seg)
    if (medicineBoxRef.current) {
      const dropT = seg(localP, 0.05, 0.45);
      medicineBoxRef.current.position.y = 1.55 - dropT * 0.42;
      medicineBoxRef.current.position.z = 0.05 - dropT * 0.05;
      medicineBoxRef.current.rotation.y = dropT * 0.25;
      medicineBoxRef.current.rotation.x = dropT * 0.10;
    }

    // 2. Tamper-evident bag flap folds closed over the opening (0.40 -> 0.75 via seg)
    if (bagFlapRef.current) {
      const foldT = seg(localP, 0.40, 0.75);
      bagFlapRef.current.rotation.x = -foldT * Math.PI * 0.55;
    }

    // 3. Orange security seal tape adheres firmly across opening (0.65 -> 0.85 via seg)
    if (sealTapeRef.current) {
      const sealT = seg(localP, 0.65, 0.85);
      sealTapeRef.current.scale.x = Math.max(0.001, sealT);
      sealTapeRef.current.visible = sealT > 0.05;
    }

    // 4. Barcode scanner sweeps glowing red verification laser line (0.70 -> 1.00 via seg)
    if (scanLaserRef.current) {
      const scanT = seg(localP, 0.70, 1.00);
      scanLaserRef.current.position.x = -0.45 + scanT * 0.90;
      const opacity = Math.sin(scanT * Math.PI) * 0.95;
      (scanLaserRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
    }

    // 5. Clinical Pharmacist reaches down with hands over parcel, verifying checklist
    if (pharmacistRef.current) {
      const reachT = seg(localP, 0.0, 0.5);
      pharmacistRef.current.setPose({
        distanceWalked: 0,
        isWalking: false,
        reachAmount: 0.75 + Math.sin(reachT * Math.PI) * 0.20,
        headLook: -0.12,
      });
    }
  });

  return (
    <group ref={groupRef} name="scene-7-packing" position={[0.8, 0, 0]}>
      {/* ========================================================= */}
      {/* 0. CLINICAL PHARMACIST (Framed behind ergonomic counter) */}
      {/* ========================================================= */}
      <group position={[0.75, 0, -0.65]}>
        <BlobShadow position={[0, 0.003, 0]} scale={[0.85, 0.65]} opacity={0.65} />
        <Human ref={pharmacistRef} role="pharmacist" scale={1.0} />
      </group>

      {/* ========================================================= */}
      {/* 1. ARCHITECTURAL FLUTED PHARMACY PACKING COUNTER          */}
      {/* ========================================================= */}
      {/* Counter Base (Ergonomic 0.96m height, 0.85m depth) */}
      <group position={[0.8, 0, 0]}>
        {/* Recessed Stainless Toe-Kick Base */}
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[3.2, 0.12, 0.78]} />
          <meshStandardMaterial color="#1E293B" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Main Cabinetry Body (Clean mint-white finish) */}
        <RoundedBox args={[3.3, 0.84, 0.82]} radius={0.02} smoothness={4} position={[0, 0.54, 0]} receiveShadow>
          <meshStandardMaterial color="#F8FAFC" roughness={0.3} />
        </RoundedBox>

        {/* Fluted Vertical Ribs along Counter Front */}
        {Array.from({ length: 28 }).map((_, i) => {
          const x = -1.50 + i * 0.11;
          return (
            <mesh key={i} position={[x, 0.54, 0.415]}>
              <boxGeometry args={[0.045, 0.82, 0.02]} />
              <meshStandardMaterial color="#0B7F63" roughness={0.35} metalness={0.1} />
            </mesh>
          );
        })}

        {/* Premium Italian Corian Solid Surface Countertop (Beveled Lip) */}
        <RoundedBox args={[3.5, 0.06, 0.90]} radius={0.015} smoothness={4} position={[0, 0.98, 0]} receiveShadow>
          <meshStandardMaterial color="#263238" roughness={0.15} metalness={0.2} />
        </RoundedBox>

        {/* Under-counter Warm LED Accent Strip */}
        <mesh position={[0, 0.94, 0.44]}>
          <boxGeometry args={[3.4, 0.015, 0.015]} />
          <meshBasicMaterial color="#34D399" />
        </mesh>
      </group>

      {/* ========================================================= */}
      {/* 2. TOUCHSCREEN PRESCRIPTION VERIFICATION TERMINAL         */}
      {/* ========================================================= */}
      <group position={[1.85, 1.01, -0.15]} rotation={[0, -0.35, 0]}>
        {/* Heavy Die-Cast Aluminum Base Stand */}
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.12, 0.14, 0.02, 24]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Articulated Stand Arm */}
        <mesh position={[0, 0.18, 0]} rotation={[0.2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.36, 16]} />
          <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* 24-inch Terminal Housing */}
        <group position={[0, 0.36, 0.06]} rotation={[-0.25, 0, 0]}>
          <RoundedBox args={[0.72, 0.48, 0.03]} radius={0.01} smoothness={4} position={[0, 0, 0]}>
            <meshStandardMaterial color="#0F172A" roughness={0.2} metalness={0.8} />
          </RoundedBox>
          {/* Active Clinical Dispense Screen Display */}
          <mesh position={[0, 0, 0.017]}>
            <planeGeometry args={[0.68, 0.44]} />
            <meshBasicMaterial color="#064E3B" />
          </mesh>
          {/* Green Checkmark Icon on Terminal */}
          <mesh position={[-0.22, 0.12, 0.019]}>
            <circleGeometry args={[0.045, 24]} />
            <meshBasicMaterial color="#10B981" />
          </mesh>
          {/* Digital UI Status Bars */}
          <mesh position={[0.04, 0.12, 0.019]}>
            <planeGeometry args={[0.38, 0.035]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[0, 0.02, 0.019]}>
            <planeGeometry args={[0.58, 0.025]} />
            <meshBasicMaterial color="#A7F3D0" />
          </mesh>
          <mesh position={[-0.05, -0.06, 0.019]}>
            <planeGeometry args={[0.48, 0.025]} />
            <meshBasicMaterial color="#6EE7B7" />
          </mesh>
          {/* Barcode Graphic on Screen */}
          <mesh position={[0, -0.14, 0.019]}>
            <planeGeometry args={[0.44, 0.05]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        </group>
      </group>

      {/* ========================================================= */}
      {/* 3. BARCODE HANDHELD SCANNER & LASER VERIFICATION SWEEP    */}
      {/* ========================================================= */}
      <group position={[0.15, 1.01, 0.15]} rotation={[0, 0.45, 0]}>
        {/* Scanner Cradle Dock */}
        <RoundedBox args={[0.16, 0.08, 0.18]} radius={0.015} smoothness={4} position={[0, 0.04, 0]}>
          <meshStandardMaterial color="#1E293B" metalness={0.7} roughness={0.3} />
        </RoundedBox>
        {/* Ergonomic Scanner Gun */}
        <group position={[0, 0.14, 0]} rotation={[0.4, 0, 0]}>
          {/* Handle */}
          <mesh position={[0, -0.06, 0]}>
            <cylinderGeometry args={[0.022, 0.025, 0.14, 16]} />
            <meshStandardMaterial color="#0B7F63" roughness={0.6} />
          </mesh>
          {/* Scanner Head */}
          <RoundedBox args={[0.08, 0.07, 0.15]} radius={0.01} smoothness={4} position={[0, 0.03, 0.04]}>
            <meshStandardMaterial color="#0F172A" roughness={0.2} metalness={0.7} />
          </RoundedBox>
          {/* Optical Glass Lens */}
          <mesh position={[0, 0.03, 0.12]}>
            <planeGeometry args={[0.06, 0.04]} />
            <meshBasicMaterial color="#EF4444" />
          </mesh>
        </group>
      </group>

      {/* Active Laser Sweep Line across medication package */}
      <group position={[0.85, 1.32, 0.08]}>
        <mesh ref={scanLaserRef} position={[-0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.008, 0.008, 0.85, 16]} />
          <meshBasicMaterial color="#EF4444" transparent opacity={0} />
        </mesh>
      </group>

      {/* ========================================================= */}
      {/* 4. PHARMAFLY INSULATED TAMPER-EVIDENT COURIER BAG         */}
      {/* ========================================================= */}
      <group position={[0.85, 1.01, 0]}>
        {/* Soft Contact Ground Shadow under Bag */}
        <BlobShadow position={[0, 0.005, 0]} scale={[0.95, 0.65]} opacity={0.55} />

        {/* Heavyweight Gusseted Bag Body (Clinical Mint #0B7F63) */}
        <RoundedBox args={[0.88, 0.62, 0.52]} radius={0.025} smoothness={4} position={[0, 0.31, 0]} castShadow>
          <meshStandardMaterial color="#0B7F63" roughness={0.4} metalness={0.05} />
        </RoundedBox>

        {/* Reinforced Base Protection Gusset */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.89, 0.10, 0.53]} />
          <meshStandardMaterial color="#064E3B" roughness={0.6} />
        </mesh>

        {/* Printed White Pharmafly Logo Emblem on Bag Front */}
        <group position={[0, 0.32, 0.265]}>
          <mesh position={[-0.14, 0, 0]}>
            <circleGeometry args={[0.065, 24]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[0.08, 0, 0]}>
            <planeGeometry args={[0.26, 0.05]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        </group>

        {/* Die-Cut Reinforced Carrier Handles */}
        <group position={[0, 0.64, 0]}>
          <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.12, 0.014, 12, 24, Math.PI]} />
            <meshStandardMaterial color="#064E3B" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.12, 0.014, 12, 24, Math.PI]} />
            <meshStandardMaterial color="#064E3B" roughness={0.5} />
          </mesh>
        </group>

        {/* Thermal Printed Shipping Label with Customer Address & QR */}
        <group position={[0.22, 0.26, 0.266]}>
          {/* Label White Paper */}
          <mesh>
            <planeGeometry args={[0.28, 0.34]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
          </mesh>
          {/* Header Bar */}
          <mesh position={[0, 0.13, 0.002]}>
            <planeGeometry args={[0.24, 0.04]} />
            <meshBasicMaterial color="#0F172A" />
          </mesh>
          {/* Simulated Address Lines */}
          <mesh position={[-0.02, 0.06, 0.002]}>
            <planeGeometry args={[0.20, 0.018]} />
            <meshBasicMaterial color="#334155" />
          </mesh>
          <mesh position={[-0.04, 0.02, 0.002]}>
            <planeGeometry args={[0.16, 0.015]} />
            <meshBasicMaterial color="#64748B" />
          </mesh>
          {/* QR Code Matrix Box */}
          <mesh position={[0.06, -0.07, 0.002]}>
            <planeGeometry args={[0.10, 0.10]} />
            <meshBasicMaterial color="#0F172A" />
          </mesh>
          {/* Tracking Barcode */}
          <mesh position={[-0.05, -0.07, 0.002]}>
            <planeGeometry args={[0.10, 0.08]} />
            <meshBasicMaterial color="#0F172A" />
          </mesh>
        </group>

        {/* Bag Sealing Flap (Pivots smoothly over the mouth) */}
        <group ref={bagFlapRef} position={[0, 0.62, -0.26]}>
          <mesh position={[0, 0, 0.26]}>
            <boxGeometry args={[0.89, 0.025, 0.52]} />
            <meshStandardMaterial color="#064E3B" roughness={0.4} />
          </mesh>
        </group>

        {/* Orange Reflective Tamper-Evident Security Seal Tape */}
        <mesh
          ref={sealTapeRef}
          position={[0, 0.635, 0.14]}
          visible={false}
        >
          <boxGeometry args={[0.72, 0.015, 0.08]} />
          <meshStandardMaterial
            color="#FF5C36"
            roughness={0.2}
            emissive={new THREE.Color('#FF5C36')}
            emissiveIntensity={0.25}
          />
        </mesh>
      </group>

      {/* ========================================================= */}
      {/* 5. PRESCRIBED MEDICATION CARTON & BLISTER FOIL PACKS      */}
      {/* ========================================================= */}
      {/* Active Amoxicillin 500mg Carton (Drops smoothly into bag) */}
      <group ref={medicineBoxRef} position={[0.85, 1.55, 0.05]}>
        <RoundedBox args={[0.42, 0.26, 0.22]} radius={0.015} smoothness={4} position={[0, 0, 0]} castShadow>
          <meshStandardMaterial color="#FFFFFF" roughness={0.25} />
        </RoundedBox>
        {/* Teal Header Accent Stripe */}
        <mesh position={[0, 0.09, 0]}>
          <boxGeometry args={[0.425, 0.08, 0.225]} />
          <meshStandardMaterial color="#0B7F63" roughness={0.2} />
        </mesh>
        {/* Rx Emblem */}
        <mesh position={[-0.12, 0.09, 0.115]}>
          <planeGeometry args={[0.06, 0.06]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        {/* Amoxicillin 500mg Title Bar */}
        <mesh position={[0.04, 0.09, 0.115]}>
          <planeGeometry args={[0.22, 0.03]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        {/* Barcode on side */}
        <mesh position={[0.215, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.14, 0.08]} />
          <meshBasicMaterial color="#0F172A" />
        </mesh>
      </group>

      {/* Countertop Secondary Props: Blister Strip, Amber Syrup Bottle, Rx Script */}
      <group position={[0.25, 1.01, -0.15]}>
        {/* Aluminum Foil Blister Pack (10 Pills) */}
        <group position={[0, 0.005, 0.18]} rotation={[0, 0.25, 0]}>
          <mesh>
            <boxGeometry args={[0.32, 0.006, 0.18]} />
            <meshStandardMaterial color="#E2E8F0" metalness={0.92} roughness={0.12} />
          </mesh>
          {/* Pill Domes */}
          {[-0.10, -0.05, 0, 0.05, 0.10].map((px, i) => (
            <group key={i}>
              <mesh position={[px, 0.012, 0.04]}>
                <sphereGeometry args={[0.018, 16, 12]} />
                <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.1} />
              </mesh>
              <mesh position={[px, 0.012, -0.04]}>
                <sphereGeometry args={[0.018, 16, 12]} />
                <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.1} />
              </mesh>
            </group>
          ))}
        </group>

        {/* Amber Glass Medicine Bottle with Child-Resistant Cap */}
        <group position={[-0.28, 0, 0.08]}>
          {/* Amber Glass Cylindrical Body */}
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.065, 0.065, 0.24, 24]} />
            <meshStandardMaterial
              color="#78350F"
              roughness={0.1}
              metalness={0.1}
              transparent
              opacity={0.88}
            />
          </mesh>
          {/* Printed Label */}
          <mesh position={[0, 0.12, 0.066]}>
            <planeGeometry args={[0.09, 0.14]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.8} />
          </mesh>
          {/* White Ridged Cap */}
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.04, 24]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
          </mesh>
        </group>

        {/* Official Prescription Hardboard Clipboard */}
        <group position={[0.22, 0.005, -0.05]} rotation={[0, -0.15, 0]}>
          {/* Hardboard Wood Surface */}
          <RoundedBox args={[0.36, 0.01, 0.48]} radius={0.01} smoothness={4}>
            <meshStandardMaterial color="#B45309" roughness={0.7} />
          </RoundedBox>
          {/* Paper Form */}
          <mesh position={[0, 0.006, 0.02]}>
            <planeGeometry args={[0.30, 0.40]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
          </mesh>
          {/* Silver Spring Clip at Top */}
          <mesh position={[0, 0.015, -0.20]}>
            <boxGeometry args={[0.12, 0.015, 0.05]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.95} roughness={0.15} />
          </mesh>
        </group>
      </group>

      {/* ========================================================= */}
      {/* 6. BACKGROUND APOTHECARY SHELVING & CLINICAL WALL         */}
      {/* ========================================================= */}
      <group position={[0.8, 0, -1.8]}>
        {/* Soft Clinical Wall Surface */}
        <mesh position={[0, 2.4, 0]}>
          <planeGeometry args={[8.0, 5.0]} />
          <meshStandardMaterial color="#F1F5F9" roughness={0.8} />
        </mesh>

        {/* 3 Floating Glass/Aluminum Shelves with Inventory */}
        {[1.6, 2.2, 2.8].map((sy, sIdx) => (
          <group key={sIdx} position={[0, sy, 0.15]}>
            {/* Shelf Slab */}
            <mesh>
              <boxGeometry args={[3.8, 0.03, 0.35]} />
              <meshStandardMaterial color="#E2E8F0" metalness={0.5} roughness={0.2} />
            </mesh>
            {/* Stocked Medicine Cartons on Shelf */}
            {[-1.4, -1.0, -0.6, -0.2, 0.2, 0.6, 1.0, 1.4].map((bx, bIdx) => {
              const colors = ['#0B7F63', '#0284C7', '#7C3AED', '#EA580C', '#059669'];
              const col = colors[(sIdx + bIdx) % colors.length];
              const boxH = 0.14 + ((bIdx * 7) % 5) * 0.02;
              return (
                <group key={bIdx} position={[bx, boxH / 2 + 0.015, 0]}>
                  <mesh>
                    <boxGeometry args={[0.18, boxH, 0.14]} />
                    <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
                  </mesh>
                  {/* Color category stripe on box */}
                  <mesh position={[0, boxH / 2 - 0.02, 0.072]}>
                    <planeGeometry args={[0.16, 0.03]} />
                    <meshBasicMaterial color={col} />
                  </mesh>
                </group>
              );
            })}
          </group>
        ))}

        {/* Illuminated Pharmacy Green Cross Sign on Back Wall */}
        <group position={[-1.4, 3.4, 0.02]}>
          <mesh>
            <boxGeometry args={[0.42, 0.14, 0.02]} />
            <meshStandardMaterial
              color="#10B981"
              emissive={new THREE.Color('#10B981')}
              emissiveIntensity={0.8}
            />
          </mesh>
          <mesh>
            <boxGeometry args={[0.14, 0.42, 0.02]} />
            <meshStandardMaterial
              color="#10B981"
              emissive={new THREE.Color('#10B981')}
              emissiveIntensity={0.8}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}
