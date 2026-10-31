# Pharmafly 3D Model Sourcing & Asset Requests

This file specifies external model sourcing requirements, search queries, geometry budgets, and required PBR maps for models requiring download and optimization before scene assembly.

> [!NOTE]
> All 3 hero visual asset suites have been modeled, textured, and integrated:
> 1. **Delivery Scooter & Rider**: `src/scenes/models/UltraRealisticScooter.tsx`
> 2. **Pharmacy Counter & Pharmacist**: `src/scenes/models/UltraRealisticPharmacy.tsx`
> 3. **Apartment Door & Customer Handover**: `src/scenes/models/UltraRealisticApartmentHandover.tsx`

---

## Required Model Requests

### 1. Modern Smartphone (Flagship Thin Bezel)
- **Target Scenes**: Scene 1 (Phone Rotates), Scene 2 (App Opens), Scene 3 (Search Medicine), Scene 4 (Place Order).
- **Exact Search Terms**:
  - `"Modern smartphone thin bezel glb"`
  - `"iPhone 15 pro clean screen pbr gltf"`
  - `"Frameless smartphone realistic pbr"`
- **Geometry Budget**: < 35,000 triangles.
- **Required Hierarchy / Materials**:
  - `Screen`: Separate planar mesh with clean UV unwrapping (0,0 to 1,1) for CanvasTexture binding. Glass overlay with subtle roughness (0.1) and specular reflections.
  - `Body`: Metallic or matte aluminum/titanium frame (roughness 0.35, metalness 0.9).
  - `CameraBump`: Realistic back camera lens cluster with glass lenses.
- **Licensing Priority**: Poly Haven CC0 > Sketchfab CC0 / CC-BY.

---

### 2. Delivery Scooter with Insulated Thermal Cargo Box & Rider
- **Target Scenes**: Scene 8 (Rider Pickup), Scene 9 (City Drone Transit), Scene 10 (Customer Receives).
- **Exact Search Terms**:
  - `"Delivery scooter with thermal box glb"`
  - `"Electric moped delivery rider helmet cc0"`
  - `"Courier scooter cargo box pbr"`
- **Geometry Budget**: < 50,000 triangles total (scooter + rider).
- **Required Hierarchy / Materials**:
  - `ScooterBody`: Clean metallic / painted finish with clearcoat (0.5), palette overridden to night navy / white.
  - `CargoBox`: Large rear cubic insulated box. Material must accept custom accent coral `#FF6B4A` base color with white Pharmafly wordmark.
  - `Wheels`: Front and rear wheels as separate transform nodes to enable scroll-based rotation.
  - `Rider`: Human courier figure wearing a full-face motorcycle helmet, riding posture, jacket material accepting coral `#FF6B4A` override.
- **Licensing Priority**: Sketchfab CC-BY / CGTrader CC0 / Mixamo.

---

### 3. Pharmacy Retail Interior (Shelving, Counter, Packaging)
- **Target Scenes**: Scene 6 (Camera to Pharmacy), Scene 7 (Retailer Packs Order).
- **Exact Search Terms**:
  - `"Pharmacy shelf medicine boxes glb"`
  - `"Modern pharmacy counter glass showcase"`
  - `"Pill bottle blister pack medical packaging pbr"`
- **Geometry Budget**: < 45,000 triangles.
- **Sourcing Sources**:
  - Shelving: Poly Haven `wooden_bookshelf_worn` / `drawer_cabinet` (CC0).
  - Counter: Poly Haven `modern_wooden_cabinet` (CC0).
  - Boxes & Jars: Poly Haven `medical_box`, `cardboard_box_01`, `spray_paint_bottles` (CC0).
  - Additional Medicine Bottles: Amber glass apothecary bottles with white labels (Sketchfab CC0).

---

### 4. Human Characters (Pharmacist, Customer Handover)
- **Target Scenes**: Scene 6/7 (Pharmacist), Scene 10 (Customer Doorstep).
- **Exact Search Terms**:
  - `"Pharmacist white lab coat 3d model glb"`
  - `"Doctor standing friendly rig mixamo"`
  - `"Casual woman standing opening door glb"`
- **Geometry Budget**: < 25,000 triangles per character.
- **Material Notes**: PBR skin/clothing shader, neutral attire, no exaggerated stylization.
- **Sourcing Sources**: Mixamo (Adobe Royalty-Free) / Sketchfab CC-BY.

---

### 5. Apartment Door & Porch Entrance
- **Target Scenes**: Scene 10 (Customer Handover).
- **Exact Search Terms**:
  - `"Modern apartment front door frame glb"`
  - `"Residential doorway hallway pbr"`
- **Geometry Budget**: < 15,000 triangles.
- **Required Hierarchy**:
  - `DoorLeaf`: Pivoting door panel with door handle/lock (enabling slight swing open).
  - `DoorFrame`: Surrounding wall trim, doorbell, welcome mat.

---

### 6. Rooftop Details & City Infrastructure (For Scene 9 Drone Shot)
- **Target Scenes**: Scene 9 (Aerial Establishing & FPV Descent).
- **Exact Search Terms**:
  - `"Rooftop ac unit chiller glb"`
  - `"Rooftop water tank industrial cc0"`
  - `"Street streetlight lamp post pbr"`
- **Sourcing Sources**:
  - Poly Haven `street_lamp_01`, `street_lamp_02`, `modular_electricity_poles`.
  - Instanced rooftop HVAC units and industrial water towers.

---

## Optimization Pipeline Checklist
1. Export model to standard `.glb`.
2. Inspect vertex count and material slots using `gltf-transform inspect`.
3. Compress geometry using Draco or Meshopt:
   ```bash
   gltf-transform draco input.glb output.glb --method edgebreaker
   ```
4. Resize and compress textures to KTX2 / Basis Universal:
   ```bash
   gltf-transform uastc input.glb output.glb --level 2 --zstd 18
   ```
5. Verify total asset weight per scene is within budget (< 2.5 MB initial scene, < 10 MB total).

