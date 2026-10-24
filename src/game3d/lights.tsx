"use client";

import { ITEM_BY_KEY, STUDENT_MANIFEST } from "./manifest";

function at(key: string, offset: [number, number, number]): [number, number, number] | null {
  const item = ITEM_BY_KEY.get(key) ?? STUDENT_MANIFEST.stage0.items.find((i) => i.key === key);
  if (!item) return null;
  return [item.position[0] + offset[0], item.position[1] + offset[1], item.position[2] + offset[2]];
}

/**
 * Cozy clay-pastel lighting: warm hemisphere fill, one soft-shadow directional
 * sun, warm desk-lamp pool, cool screen spill (monitor when seated, laptop in
 * the stage0 floor pose), and a faint fairy-light glow along the string.
 * Positions derive from the merged manifest placements.
 */
export function Lights() {
  const lamp = at("lamp_desk", [0.12, 0.34, 0]);
  const monitor = at("monitor", [0.26, 0.3, 0]);
  const laptop = at("laptop", [0.16, 0.16, 0]);
  const fairy = ITEM_BY_KEY.get("fairy_lights");
  const fairyY = fairy ? fairy.position[1] : 1.8;

  return (
    <>
      <hemisphereLight args={["#fff6e8", "#d8c6b2", 0.55]} />
      <ambientLight color="#ffeef4" intensity={0.28} />
      <directionalLight
        position={[3.5, 6.5, 2.5]}
        intensity={1.9}
        color="#fff2df"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-3.5}
        shadow-camera-right={3.5}
        shadow-camera-top={3.5}
        shadow-camera-bottom={-3.5}
        shadow-camera-near={1}
        shadow-camera-far={15}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      {lamp ? (
        <pointLight position={lamp} color="#ffb46b" intensity={1.2} distance={2.6} decay={2} />
      ) : null}
      {monitor ? (
        <pointLight position={monitor} color="#9fc7ff" intensity={0.5} distance={1.8} decay={2} />
      ) : null}
      {laptop ? (
        <pointLight position={laptop} color="#9fc7ff" intensity={0.35} distance={1.2} decay={2} />
      ) : null}
      {(
        [
          [-1.85, fairyY + 0.05, -1.75],
          [1.9, fairyY + 0.05, -1.75],
          [-1.85, fairyY + 0.05, 1.55],
          [1.9, fairyY + 0.05, 1.55],
        ] as Array<[number, number, number]>
      ).map((position) => (
        <pointLight
          key={position.join(",")}
          position={position}
          color="#ffd9a0"
          intensity={0.16}
          distance={2.4}
          decay={2}
        />
      ))}
    </>
  );
}
