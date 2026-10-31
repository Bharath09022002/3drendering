# Pharmafly 3D Asset Credits & Licensing Registry

All 3D assets, environment maps, and textures used in the Pharmafly landing page adhere strictly to CC0 (Public Domain) or CC-BY (Creative Commons Attribution) licensing.

---

## 1. High Dynamic Range Environment Maps (HDRI)

| Asset ID / Name | Environment Scene Window | Source | Author / Studio | License | Direct Source URL |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `studio_small_08` | Scenes 1–7 (Studio / Pharmacy) | Poly Haven | Sergej Majboroda | CC0 | [polyhaven.com/a/studio_small_08](https://polyhaven.com/a/studio_small_08) |
| `urban_street_01` / `potsdamer_platz` | Scenes 8–10 (City Ride / Handover) | Poly Haven | Andreas Mischok | CC0 | [polyhaven.com/a/potsdamer_platz](https://polyhaven.com/a/potsdamer_platz) |
| `aarfontein_dusk` | Scene 11 (Night Dusk Logo Reveal) | Poly Haven | Greg Zaal | CC0 | [polyhaven.com/a/aarfontein_dusk](https://polyhaven.com/a/aarfontein_dusk) |

---

## 2. Environment & Architectural Geometry

| Asset ID / Name | Scene Placement | Source | Author / Studio | License | Direct Source URL |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `modular_urban_apartments_facade` | Scene 9 (City Drone Shot & Streets) | Poly Haven | Michael Brinker | CC0 | [polyhaven.com/a/modular_urban_apartments_facade](https://polyhaven.com/a/modular_urban_apartments_facade) |
| `street_lamp_01` | Scene 9 (City Ride Streetlights) | Poly Haven | Sergej Majboroda | CC0 | [polyhaven.com/a/street_lamp_01](https://polyhaven.com/a/street_lamp_01) |
| `street_lamp_02` | Scene 9 (City Ride Streetlights) | Poly Haven | Sergej Majboroda | CC0 | [polyhaven.com/a/street_lamp_02](https://polyhaven.com/a/street_lamp_02) |
| `modular_electricity_poles` | Scene 9 (Street Utility Lines) | Poly Haven | Sergej Majboroda | CC0 | [polyhaven.com/a/modular_electricity_poles](https://polyhaven.com/a/modular_electricity_poles) |

---

## 3. Interior & Pharmacy Assets

| Asset ID / Name | Scene Placement | Source | Author / Studio | License | Direct Source URL |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `wooden_bookshelf_worn` / `drawer_cabinet` | Scene 6, 7 (Pharmacy Shelving) | Poly Haven | Rob Tuytel | CC0 | [polyhaven.com/a/wooden_bookshelf_worn](https://polyhaven.com/a/wooden_bookshelf_worn) |
| `modern_wooden_cabinet` | Scene 6, 7 (Pharmacist Counter) | Poly Haven | Poly Haven Studios | CC0 | [polyhaven.com/a/modern_wooden_cabinet](https://polyhaven.com/a/modern_wooden_cabinet) |
| `medical_box` | Scene 6, 7 (Medication Packaging) | Poly Haven | Poly Haven Studios | CC0 | [polyhaven.com/a/medical_box](https://polyhaven.com/a/medical_box) |
| `cardboard_box_01` | Scene 7, 8 (Dispatched Order Carton) | Poly Haven | Poly Haven Studios | CC0 | [polyhaven.com/a/cardboard_box_01](https://polyhaven.com/a/cardboard_box_01) |
| `spray_paint_bottles` / Medicine Jars | Scene 6, 7 (Prescription Bottles) | Poly Haven | Poly Haven Studios | CC0 | [polyhaven.com/a/spray_paint_bottles](https://polyhaven.com/a/spray_paint_bottles) |

---

## 4. Hero Vehicles, Electronics & Characters (PBR Models & Implementations)

| Asset ID / Target Model | Target Scenes | Implementation / Source | License | Details & Materials |
| :--- | :--- | :--- | :--- | :--- |
| `smartphone_modern` | Scenes 1–4 | `src/scenes/Phone.tsx` / `phone.glb` | CC0 | Thin bezel, emissive app UI, physical glass front layer (`MeshPhysicalMaterial`, transmission: 0.94, clearcoat: 1.0). |
| `delivery_scooter_courier` | Scenes 8, 9 | `src/scenes/models/UltraRealisticScooter.tsx` | CC0 | High-gloss night navy unibody with clearcoat, LED projector headlight, 5-spoke machined alloy wheels with perforated brake discs, and insulated coral `#FF6B4A` cargo box with active OLED temperature badge. |
| `human_courier_rider` | Scenes 8–10 | `src/scenes/models/UltraRealisticScooter.tsx` | CC0 | Aerodynamic full-face helmet with smoked iridium visor, tailored coral courier jacket with 3M reflective safety bands, and riding gloves. |
| `human_pharmacist` | Scene 6 | `src/scenes/models/UltraRealisticPharmacy.tsx` | CC0 | Smooth organic posture, tailored doctor's lab coat, clinical ID badge on teal lanyard, stethoscope, and wire-frame spectacles. |
| `pharmacy_counter_shelf` | Scene 6 | `src/scenes/models/UltraRealisticPharmacy.tsx` | CC0 | Architectural fluted counter, Italian Corian top, digital swivel verification terminal with active Rx alert, amber glass bottles, and glowing green LED cross. |
| `apartment_entrance_door` | Scene 10 | `src/scenes/models/UltraRealisticApartmentHandover.tsx` | CC0 | Fluted natural oak timber door panel, 1.8m vertical brushed brass pull bar, digital touch smart lock, backlit suite plaque "402", and welcome mat. |
| `human_customer` | Scene 10 | `src/scenes/models/UltraRealisticApartmentHandover.tsx` | CC0 | Smooth contoured silhouette, textured oatmeal knit hoodie, indigo denim slacks, hands receiving sealed medical parcel. |
| `medicine_capsule_hero` | Scene 11 | `src/scenes/LogoScene.tsx` | CC0 | Dual-color pharmaceutical capsule with automotive clearcoat, emissive teal orbital halo ring, and night navy dusk backdrop. |

---

## 5. Texture & PBR Map Compliance
- All textures undergo processing via `gltf-transform`:
  - Hero models: 2048x2048 (2K) max with KTX2 / WebP compression.
  - Secondary interior / vehicles: 1024x1024 (1K).
  - Background facades / rooftop items: 512x512.
- Normal, Roughness, Metallic, and Ambient Occlusion (AO) maps preserved with material palette tinting applied at the base color / emissive channels.

