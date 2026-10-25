"use client";

import { useGameStore } from "@/game/state/store";
import { getRoomManifest } from "./manifest";
import { ItemModel } from "./ItemModel";

/** Floor / walls / wall tiles for the current room. The student shell is
 * three meshes (the floor only receives shadows so the directional light
 * keeps the room bright); the junior/senior shells are one merged GLB with
 * the window baked in. */
export function RoomShell() {
  const stage = useGameStore((s) => s.stage);
  return (
    <>
      {getRoomManifest(stage).items
        .filter((item) => item.category === "room_shell")
        .map((item) => (
          <ItemModel
            key={item.key}
            item={item}
            shadows={item.key === "floor_base" ? "receive" : "both"}
          />
        ))}
    </>
  );
}
