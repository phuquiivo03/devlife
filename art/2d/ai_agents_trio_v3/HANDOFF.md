# Devlife AI mascot trio — v3 / generated 2D illustration

Ready for PM / síp review. Exactly THREE original portraits replacing the earlier Bạn Code concept. All three illustrations were created using `cursor.GenerateImage`; no Blender, 3D scene, .blend or GLB was used to create v3. Earlier v2 masters were supplied strictly as character/palette references. v2 is untouched.

## Names / stable IDs / palettes

| ID | Name | Personality / silhouette | Target palette from verified v2 references |
|---|---|---|---|
| `claude_inspired` | **Cờlốt** | Thoughtful bookworm: open book, enormous spectacles, curious mismatched brows, crooked smile and shiny attentive pupils. | Terracotta `#D97757`, ivory `#FAF9F5`, ink `#141413`, light gray `#E8E6DC` |
| `cursor_inspired` | **Củsỏ** | Overeager pointer: diagonal arrow, big bright eyes, raised brows, delighted open grin, orange cheek marks and tail. | Warm charcoal `#26251E`, off-white `#F7F7F4`, orange `#F54E00`, near-black `#14120B` |
| `copilot_inspired` | **Câupilot** | Easygoing cloud pilot: broad scalloped cloud, huge green goggles, one open eye, cheeky wink and jaunty grin. | GitHub green `#0FBF3E`, mint `#BFFFD1`, gray `#F2F5F3`, ink `#101411`, deep green `#0A241B` |

Style is polished outlined 2D cartoon illustration with soft illustrated tonal shapes and exaggerated expressions, not a 3D render or pixel art. Colour hexes are target palette anchors in the generation prompts; generated shading/highlights are interpreted colour variants, not a guarantee of exact flat hex pixels everywhere.

### Reference URLs (reused from palette.md verified for v2)
- Official Anthropic palette: https://raw.githubusercontent.com/anthropics/skills/main/skills/brand-guidelines/SKILL.md
- Official repository page: https://github.com/anthropics/skills/blob/main/skills/brand-guidelines/SKILL.md
- Official Claude site: https://claude.com/
- Official Cursor brand page: https://cursor.com/brand
- Official Cursor site: https://cursor.com/
- Official brand-page stylesheet providing exact Cursor palette tokens: https://cursor.com/marketing-static/_next/static/immutable/chunks/3g8c5788oj-t7.css
- Official current GitHub palette: https://brand.github.com/foundations/color
- Official current Copilot identity guidance: https://brand.github.com/brand-identity/copilot

Câupilot uses the verified current GitHub parent-brand green palette, NOT the older purple palette found in some third-party search results. The current official Copilot page says its old mascot head was retired; this original cloud is not a reproduction of that robot/helmet mascot.

**These are original fan-inspired Devlife game portraits, NOT official brand mascots, NOT an official partnership, and NOT endorsed by Anthropic, Anysphere/Cursor, GitHub or Microsoft. No logo, wordmark, brand text or existing mascot artwork is copied.** This is a provenance statement, not a legal clearance opinion.

## File paths (relative to this folder)
For each stable ID (`claude_inspired`, `cursor_inspired`, `copilot_inspired`):
- `<ID>/<ID>_generated_original.jpg` — unchanged original returned by GenerateImage. The service returned JPEG even though the requested filename ended in PNG; retained truthfully as JPEG.
- `<ID>/<ID>_512.png`, `<ID>/<ID>_256.png`, `<ID>/<ID>_64.png` — final transparent PNG RGBA.
- `<ID>/<ID>_master_1024.png` — clean normalized high-resolution PNG RGBA.
- `<ID>/<ID>_cutout_master.png` — clean alpha cutout at original generated size, before normalization.
- `<ID>/<ID>_alpha_mask.png` — editable grayscale removal mask.

Review:
- `contact_sheet.png` — exactly three portraits side by side with proposed names.
- `preview_sheet.png` — contact art plus small-size light/dark overview.
- `previews/trio_light_native.png`, `previews/trio_dark_native.png` — actual-sized icons. Columns left to right are 24px avatar, 48px picker, 64px shop use.
- `previews/trio_light_audit_2x.png`, `previews/trio_dark_audit_2x.png` — nearest-neighbour enlarged inspection sheets, not runtime art.
- `previews/<ID>_light_24.png`, `_light_48.png`, `_light_64.png`, `_dark_24.png`, `_dark_48.png`, `_dark_64.png` — per-ID/per-size flat-background previews; each has an additional 8px inspection margin on each side.
- `previews/text_audit_4x.png` — Vietnamese name-label zoom audit.
- `qa.json` — all nine exports' dimensions, RGBA mode, alpha bounds, transparent-border and visible-magenta contamination checks.
- `ai_agents_trio_v3.zip` — complete folder except archive itself.

## Alpha processing / review / limitations
The generator supplied a near-solid magenta chroma background with slight JPEG variation, not transparency. Original JPEGs are preserved. Processing segmented chroma, retained the largest mascot component, filled its opaque interior, removed a narrow contaminated edge strip, reconstructed antialias colour from clean interior contours, and resized using premultiplied alpha. The final exports have no background shadows or rectangular matte.

All nine runtime exports are RGBA at the required exact sizes, with fully transparent borders and zero detected visible magenta-dominant pixels. Viewed all three final 512px PNGs, contact sheet, native light sheet, enlarged dark small-size sheet and Vietnamese label zoom. No visible pink fringe, halo or clipped silhouette observed. Names use existing Galmuri11 via `pixtext.py` only in review material; there is no lettering in runtime portraits.

Silhouette and main traits remain distinguishable at 24px. Fine eyebrow/shine/bookmark details and exact smile shape simplify there; 48/64px communicate facial expression more fully. Củsỏ has a narrower silhouette than the other two; its off-white face and orange tail remain legible against dark UI. No further image-generation iteration was needed after inspecting the first generated set and cleaned size tests.

No numbers, gameplay stats, prices, text or logos are baked into portrait assets. No room body or physical robot. No game code edited, no commit/push, no external messages/uploads. Only 2D raster deliverables; no .blend/.GLB sources or renderer project included. No in-game integration test performed; PM approval pending.

## Generation records — exact prompts
All three calls used `aspect_ratio: 1:1`. References were local v2 high-resolution masters. Their 3D look was explicitly rejected in the prompts.

### claude_inspired — Cờlốt
Requested filename: `claude_inspired_v3_raw.png`
Reference: `/workspace/devlife-art/ai_agents_trio_v2/claude_inspired/claude_inspired_master_1024.png`

> Create ONE polished 2D illustrated game mascot portrait: an ORIGINAL anthropomorphic open-book bookworm named Mot Mo (do not write its name). Use the reference ONLY for the open book, oversized spectacles and warm palette, NOT its 3D render aesthetic. New art direction: exceptionally charming premium hand-drawn editorial cartoon illustration, smooth bold organic shapes, restrained soft gouache-like shading, thick expressive ink contours, NOT 3D, NOT a clay render, NOT Blender, NOT pixel art. A squat open book with gently curling ivory pages and terracotta covers, hugely oversized round near-black spectacles, asymmetrical inquisitive eyebrows, large bright pupils looking upward, a small mischievous crooked smile; funny thoughtful nerd personality. Exaggerate the glasses and simple expression so it reads at 24px. Head/icon only: no human body, no arms or legs, no scene. Front view with a very subtle playful tilt, bold compact silhouette, fill 78 percent of square canvas, generous safe margins. Palette strictly warm terracotta #D97757, ivory #FAF9F5, ink #141413, light gray #E8E6DC, with only shades derived from these colours. No actual Claude logo, asterisk, trademarks, wordmarks, writing, page lettering, tiny ornamental details, stats or numbers. Isolate the entire mascot on perfectly flat solid chroma magenta #FF00FF background. No gradient, no paper texture, no floor, no ground shadow, no glow, no magenta anywhere in the mascot, no pink reflected light. Clean hard silhouette for professional background removal. Single finished illustration only.

### cursor_inspired — Củsỏ
Requested filename: `cursor_inspired_v3_raw.png`
Reference: `/workspace/devlife-art/ai_agents_trio_v2/cursor_inspired/cursor_inspired_master_1024.png`

> Create ONE polished 2D illustrated game mascot portrait: an ORIGINAL eager arrow-pointer character named Vut Vit (do not write its name). Reference establishes pointer silhouette and colours ONLY: reject the reference's 3D aesthetic. New art direction: exceptionally charming premium hand-drawn editorial cartoon illustration, smooth bold organic shapes, restrained soft gouache-like shading, thick expressive ink contours, NOT 3D, NOT clay render, NOT Blender, NOT pixel art. A chunky ivory mouse-pointer arrow leaning jauntily up-left, near-black outline, two huge gleaming expressive eyes, one eye slightly bigger, eyebrows raised in comically eager anticipation, small wide delighted grin, vivid orange cheek marks and an orange tail accent. Funny overexcited helper personality, not scared. The whole character IS the pointer, with no human face pasted on and no robot or body. Exaggerated compact design must read clearly at 24px; minimize details and make eyes visible. Head/icon only, no hands feet or scene. Front view, playful dynamic tilt, fill 78 percent square canvas with generous safe margins. Palette strictly warm charcoal #26251E, off-white #F7F7F4, vivid orange #F54E00, near-black #14120B, only shading derived from these. No Cursor cube or app logo, brand text, writing, tiny decorative details, stats, prices or numbers. Entire mascot isolated on perfectly flat chroma magenta #FF00FF background. No gradient, no paper texture, no floor, no ground shadow, no glow, no magenta in the mascot and no pink reflected light. Clean hard silhouette for easy professional background removal. Single finished illustration only.

### copilot_inspired — Câupilot
Requested filename: `copilot_inspired_v3_raw.png`
Reference: `/workspace/devlife-art/ai_agents_trio_v2/copilot_inspired/copilot_inspired_master_1024.png`

> Create ONE polished 2D illustrated game mascot portrait: an ORIGINAL friendly software-cloud pilot named Kinh Bay (do not write its name). Reference provides a scalloped cloud silhouette, huge goggles and green colours ONLY, NOT its 3D aesthetic. New art direction: exceptionally charming premium hand-drawn editorial cartoon illustration, smooth bold organic shapes, restrained soft gouache-like shading, thick expressive ink contours, NOT 3D, NOT clay render, NOT Blender, NOT pixel art. A compact fluffy ivory cloud portrait with a few large graceful cloud scallops, outrageously oversized round green aviator goggles, one bright large eye looking at the viewer and the other eye cheekily winking, an off-centre confident grin. Lively funny easygoing pilot personality. This is a floating SOFTWARE icon, not a physical robot: no helmet, metal faceplate, antenna, ears, body or limbs. Goggles have mint lenses and near-black/deep-green thick rims. Exaggerated simple expression and distinctive broad cloud silhouette must read at 24px. Head/icon only; front view with subtle jaunty tilt, filling 78 percent square canvas, safe margins. Palette strictly GitHub Green #0FBF3E, mint #BFFFD1, pale gray #F2F5F3, near-black #101411, deep green #0A241B, only derived shading. Do NOT copy GitHub Copilot's old robot/mascot head, Octocat, Invertocat or any logo. No text, numbers, badges, stats or prices. Isolate the entire mascot on perfectly flat chroma magenta #FF00FF background. No gradient, no paper texture, no floor, no ground shadow, no glow, no magenta in the mascot or pink reflected light. Clean hard silhouette for professional background removal. Single finished illustration only.
