"use client";

import { useMemo } from "react";
import { useGameStore } from "@/game/state/store";
import { getRoom } from "@/game/content";
import { resolveRoomFurniture } from "./slot-models";
import { STUDENT_MANIFEST, itemByKey } from "./manifest";

function at(
  stage: string,
  key: string,
  offset: [number, number, number],
): [number, number, number] | null {
  // The laptop only exists in the student stage0 set; other rooms place it
  // through a slot, so itemByKey alone finds it there.
  const item =
    itemByKey(stage, key) ??
    (stage === "student" ? STUDENT_MANIFEST.stage0.items.find((i) => i.key === key) : undefined);
  if (!item) return null;
  return [item.position[0] + offset[0], item.position[1] + offset[1], item.position[2] + offset[2]];
}

/**
 * Cozy clay-pastel lighting: warm hemisphere fill, one soft-shadow directional
 * sun, warm desk-lamp pool, cool screen spill (monitor when seated, laptop in
 * the stage0 floor pose), and a faint fairy-light glow along the string.
 * Positions derive from the merged manifest placements. The lamp pool follows
 * the desk_lamp slot: lit only while the loadout actually places the lamp.
 */
export function Lights() {
  const stage = useGameStore((s) => s.stage);
  const loadout = useGameStore((s) => s.loadouts[stage]);
  const owned = useGameStore((s) => s.career.shop?.owned);

  const lampDrawn = useMemo(() => {
    const plan = resolveRoomFurniture(
      getRoom(stage).slots,
      loadout,
      new Set(owned ?? []),
      stage,
    );
    return plan.drawn.has("lamp_desk");
  }, [stage, loadout, owned]);

  const lamp = lampDrawn ? at(stage, "lamp_desk", [0.12, 0.34, 0]) : null;
  const monitor = at(stage, "monitor", [0.26, 0.3, 0]);
  const laptop = at(stage, "laptop", [0.16, 0.16, 0]);
  const fairy = itemByKey(stage, "fairy_lights");
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
