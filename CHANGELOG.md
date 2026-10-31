# Pharmafly 3D Experience — Changelog

## [Foldable Sequence & Full Handover Pipeline] - 2026-10-30

### Phase 1: Scroll Remap & Track Scaling
- **Dual-Track Progress Remapping**: Added `masterProgress` [0, 1] driving Lenis smooth scroll and remapped `legacyProgress(master)` freezing at `0.32` across the fold window $[0.256, 0.456]$ ($f = 0.20$).
- **Track Scaling**: Scaled master track by $1.25\times$ to $3000\text{vh}$ preserving exact legacy scene pixel scroll lengths.
- **Narrative Overlay Coordination**: Hidden standard copy headlines during foldProgress $(0.12, 0.90)$ with contextual "Meet Pharmafly" fade $(0.45 - 0.80)$.

### Phase 2: Story Layer & Offscreen FBO Camera Pass
- **Layer 1 Wrapper (`StoryLayer`)**: Isolated Scenes 5-11 and `SharedScooter` on Three.js Layer 1 with periodic traversal refresh.
- **High-Precision Secondary FBO Camera (`StoryWindow`)**: Configured 4x MSAA HalfFloat render target with negative render priority (-1) rendering Layer 1 independently from camera pose keyframes.
- **Old Phone Visibility Window**: Restricted candybar device visibility strictly to $m < 0.256 + 0.12 \times 0.20$.

### Phase 3: Book-Style Foldable Model & Unfold Physics
- **Galaxy Z Fold Precision Model**: Built central flex spine hinge at $X=0, Z=0.022$, fixed right wing, rotating left wing with exponential damping $k = 1 - \exp(-10 \cdot \min(\Delta t, 0.05))$.
- **Dual-Half Inner Screen Mapping**: Mapped FBO texture continuously across split UV halves with $Z$-offset eliminating z-fighting.
- **Cinematic Orbit Arc**: Dynamically orbited camera during unfold with viewport auto-framing and scaling.

### Phase 4: Viewport Screen Expansion & Single-Frame Handover
- **Detached Screen Morph Plane**: Dynamically detached inner screen plane at $f \in [0.45, 0.90]$, interpolating world pose to camera frustum distance $D = 1.6\text{ m}$.
- **1:1 Uncropped Frustum Mapping**: Scaled plane to exact viewport aspect ratio with uncropped 1:1 UV mapping; slid foldable body away without crossing screen.
- **Single-Frame Handover ($f = 0.90$)**: Main camera enabled Layer 1, FBO pass halted, achieving **0.02% MACD** against direct rendering (target < 2.0%).
- **Dynamic Post-Processing Bloom**: Seamlessly interpolated bloom intensity from 0 to 0.75 across $f \in [0.80, 1.00]$.

### Phase 5: Quality, Mobile Optimizations & Accessible Fallback
- **Mobile Preset**: FBO scale 0.50, MSAA 0, disabled post-processing, disabled real shadow maps, and lightweight geometry (< 4k triangles vs 15k limit).
- **GPU Shader Precompilation**: Added `gl.compile` on initial scene and secondary camera passes eliminating scroll hitching.
- **GPU Memory Stability**: Added explicit unmount disposal for FBOs, render targets, and custom geometries with zero leak across 5 scroll cycles.
- **Accessible Reduced-Motion Storyboard**: Added static device innovation card in `ReducedMotionFallback`.

## [Gate 2 & Visual Upgrades] - 2026-10-29

### 1. Seated Rider & Step-Through Scooter Chassis (Gate 2)
- **Ergonomic Scooter Anchors**: Defined exact `SCOOTER_ANCHORS` (`seatAnchor`, `footAnchorL/R`, `gripAnchorL/R`, `headLookAnchor`, `cargoAnchor`).
- **Human Proportions**: Enforced height scale rule: $1.72\text{ m} \times (\text{wheel outer diameter} / 0.45\text{ m})$.
- **Step-Through Chassis**: Reshaped fairings so nothing solid occupies the step-through volume between seat, footboard, and handlebar.
- **Biomechanical Seated Rig**: Mounted `Human` with hips directly at `seatAnchor`, 10° torso lean, shins resting on footboard, hands on grips.
- **Head-Bone Helmet**: Attached aerodynamic courier helmet directly to `bones.head` with dark glass visor and coral racing stripe.
- **Penetration Verification**: Automated bounding box collision audit confirmed **0.00 cm** non-contact penetration (0 overlaps > 2 cm).
- **Scene 9 Dynamic Roll**: Rider smoothly banks into turns ($\pm 0.12\text{ rad}$) with scroll-derived damping.

### 2. Dynamic FPV Drone View Entering City (Scene 9)
- **Over-the-Shoulder Drone Chase**: Added dynamic FPV cinematic camera tracking the courier bike diving into the city boulevard.
- **Camera Banking Roll**: Applied velocity-aligned roll ($camera.rotateZ$) during high-speed aerial dive into street level.

### 3. Foldable Smartphone ("Fold Phone") & UI Clarity (Scenes 1 - 3)
- **Book-Style Fold Phone Model**: Central brushed titanium hinge mechanism with titanium wings and triple sapphire camera cluster.
- **Scroll-Driven Mechanical Unfolding**: Symmetrical butterfly unfolding from compact cover phone (Scene 1) to expansive widescreen OLED tablet (Scene 2).
- **OLED Text Sharpness**: High-DPI 1536x3072 canvas with deep ink `#0F172A`, bold weights, high-contrast verified badges, and tone-mapping bypass for pure display clarity without washed-out highlights.

### 4. High-Definition Pharmacy Packing Station (Scene 7)
- **Architectural Fluted Counter**: Ergonomic 0.98m height counter with Italian Corian countertop, recessed stainless toe-kick, and 28 vertical flutes.
- **Clinical Pharmacist in Lab Coat**: Fully rigged pharmacist standing behind counter, reviewing order and reaching over parcel.
- **Prescription Verification Terminal**: 24-inch POS touchscreen on articulated aluminum swivel arm with verified status checkmark.
- **Handheld Barcode Scanner**: Ergonomic gun with dynamic glowing red verification laser line.
- **Pharmafly Insulated Courier Bag**: Tamper-evident delivery bag with thermal shipping label (QR + barcode), die-cut handles, and orange reflective security seal tape.
- **Medication Props**: 3D Amoxicillin 500mg carton dropping into bag, aluminum blister foil strip with 10 metallic pill domes, amber glass medicine bottle with child-resistant cap, and signed hardboard clipboard.
- **Apothecary Shelving**: Floating glass shelves with organized pharmaceutical inventory and illuminated green cross sign.

### 5. Anatomical Human Upgrades (Eliminated Robotic Appearance)
- **Removed Robot Dummy Discs**: Fully hid `Beta_Joints` mechanical mannequin joint connector rings, creating a smooth organic human body silhouette.
- **Bone-Weighted Vertex Skin & Wardrobe Shading**:
  - Hands & individual fingers shaded in natural warm skin tone (`#EAC096` / `#DF9E6C` / `#E2AD82`).
  - Natural facial skin tone with sculpted eyebrows, defined eye pupils, lips, and dark styled hair on scalp/back of head.
  - Tailored role clothing: open white medical lab coat with jade scrubs, tactical courier jacket with high-vis coral racing yoke, and customer knit sweater.
  - Distinct trousers and footwear with crisp white sneaker soles.
- **3D Anatomical Accessories**:
  - Pharmacist: 3D binaural stethoscope draped around neck and medical ID badge clipped to chest.
  - Courier Rider: Aerodynamic courier helmet with visor and crossbody messenger sling strap across chest.
  - Resident Customer: Sculpted modern hair volume and classic leather wristwatch on left forearm.

### 6. Scene 10 Curbside Dismount & Doorstep Handover Sequence
- **Curbside Parking**: Scooter stops curbside at `[37.3, 0, 4.0]`.
- **Driver Dismount & Retrieve Parcel**: Seated rider seamlessly transitions to standing courier at scooter curb; turns to cargo box and retrieves sealed Pharmafly delivery parcel.
- **Walk across Walkway**: Courier walks smoothly across walkway to customer's porch threshold with foot planting driven by distance walked.
- **Doorstep Handover**: Customer greets courier on porch welcome mat, courier extends arms to hand over parcel, and contactless verification ring pulses emerald green.
- **Step Inside**: Customer steps back into apartment doorway holding parcel securely while courier acknowledges delivery complete.
- **Single Courier Invariant**: Exactly ONE courier visible across all frames.
