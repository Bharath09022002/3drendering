# Pharmafly — 3D Asset & Third-Party Licenses

All external models, textures, or media used in this project adhere strictly to CC0 or CC-BY licenses. External GLBs are compressed with Draco / standard binary GLB.

| Asset | Author | License | Source / File | Usage in Pharmafly |
| :--- | :--- | :--- | :--- | :--- |
| **`phone.glb`** | Pharmafly 3D Engineering | CC0 / Dedicated Asset | `public/assets/glb/phone.glb` | Scenes 1–5 customer smartphone chassis, chamfered rim, triple camera module, UV screen |
| **`bike.glb`** | Pharmafly 3D Engineering | CC0 / Dedicated Asset | `public/assets/glb/bike.glb` | Scenes 8 & 9 delivery scooter, wheels, rider, coral insulated thermal box |
| Dynamic 2D HiDPI CanvasTexture (1024x2048) | Pharmafly Core Engineering | MIT / Internal | `src/scenes/PhoneScreenTexture.ts` | Scenes 1–5 crisp app screen, status bar, search bar, typing animation, prescription card, checkout sheet |
| Procedural Fallback Solids & City Primitives | Lead Engineer | MIT / Internal | `src/scenes/` | World environment (city, pharmacy, road ribbon, clouds, shelves, logo capsule) |

*Note: All external GLB assets undergo material overriding into the Pharmafly project palette (`src/config/palette.ts`).*
