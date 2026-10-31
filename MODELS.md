# Pharmafly — 3D Asset & Model Specifications (Route B)

Per production guidelines, external models are restricted to **Phone** and **Delivery Bike** only; all world environments (city, pharmacy, road ribbon, shelves, clouds) are code-generated primitives flat-shaded to the project palette.

## Model Catalog

| Asset Name | Target Scenes | Max Polygons (Triangles) | Format & Compression | Material Slot Requirements | File Size Target |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`phone.glb`** | Scenes 1–5 (0.00 – 0.40) | < 8,000 tris | Binary GLB (Draco/Meshopt) | - `Screen`: UV mapped 1:2 quad for dynamic `CanvasTexture`<br>- `Chassis`: Metallic unibody (`#1F2937`)<br>- `Rim`: Polished chamfered alloy (`#374151`)<br>- `CameraModule`: Triple-lens plateau & optical glass | < 300 KB |
| **`bike.glb`** | Scenes 8 & 9 (0.56 – 0.84) | < 12,000 tris | Binary GLB (Draco/Meshopt) | - `BikeFrame`: Streamlined chassis (`#0FA37F`)<br>- `CargoBox`: Insulated delivery top box in Coral (`#FF6B4A`) with Pharmafly cross<br>- `Rider`: Torso in Coral (`#FF6B4A`), helmet in ink (`#0B1F1A`)<br>- `Wheels`: Front & Rear wheels centered on rotation axis | < 400 KB |

## Budget & Optimization Guidelines
- **Total Asset Size**: Under **2.0 MB** across all 3D assets (Current runtime size: **96.2 KB**).
- **Coordinate Space**: Y-up, centered at origin `(0, 0, 0)` with forward facing `-Z`.
- **Palette Conformance**: External materials are dynamically overridden at runtime using `PALETTE` tokens from `src/config/palette.ts`.

