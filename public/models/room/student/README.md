# devlife room – R3F export v4.1

**Source:** `devlife_room_v4.blend` (unchanged) and `character_standing.blend`. Script: `scripts/group_export_v4_1.py`. Grouped scene: `devlife_room_v4_1_grouped.blend`.

## Units / axes
- Meters, scale 1 on every node.
- glb is **+Y up**; facing is **-Z forward**. Blender (x, y, z) maps to glTF (x, z, -y).

## Naming
- Asset key = English snake_case (`desk`, `chair_plastic`, `player` …).
- Each file's root node is the key; its meshes are `<key>_<part>`.

## Pivots
- Each item root sits at the **bottom-center of its bounding box**.
- In `items/<key>.glb` that pivot is at (0,0,0) with no rotation.

## Rotation (new in 4.1)
- `chair_plastic`, `player` and `player_standing` are stored in **canonical facing: the front looks toward -Z**.
- In the room, `chair_plastic` and `player` have rotation Y = **132°** (2.30383 rad). This rotation is stored on the node in `room_full.glb` and in `manifest.json` as `rotation_euler_gltf_rad` / `rotation_y_deg`.
- All other items have rotation 0.
- **Placement:**
  ```
  position = manifest.position_gltf_yup
  rotation = [0, rotation_euler_gltf_rad[1], 0]
  scale    = 1
  ```
  This matches v4 exactly.

## Wall-mounted items
`window`, `poster_vn` and `fairy_lights` do **not** touch the floor.
- Their pivot is the bottom-center of their own bounding box: the bottom edge of the frame, the poster or the light string.
- `position_gltf_yup` puts them back on the wall at the correct height. The wall inner faces are at x = -2.0 (left wall) and z = -2.0 (back wall; Blender y = +2.0).
- For anything you mount on a wall, keep the stored y (height) and the axis that is perpendicular to the wall.

## Character
- `player.glb` (sitting) and `player_standing.glb` are both at **1.4× character scale**, the same as the approved room render.
- Both are decimated to under 12k triangles.
- Their feet are at y = 0.

## Files
- `room_full.glb`: hierarchy `room_shell | furniture | decor | character → <key> → meshes`.
- `room_shell.glb`: floor, walls and tiles.
- `items/*.glb`: one file per item.
- `player.glb`, `player_standing.glb`.
- `manifest.json`: per item, key, file, position, rotation, triangle count and bbox size (axis-aligned in the item's canonical frame).
- `player_decimate_compare.png`, left to right: standing before, standing after, sitting before, sitting after.

## Materials
- glTF PBR: base color and roughness.
- Image textures: poster, screen, window sky. Bulbs have emissive color.
- No baked lighting, no lights, no cameras. Light the scene in R3F.
