"use client";

import { STUDENT_MANIFEST } from "./manifest";
import { ItemModel } from "./ItemModel";

/** Floor / walls / wall tiles. The floor only receives shadows so the
 * directional light keeps the room bright; furniture does the casting. */
export function RoomShell() {
  return (
    <>
      {STUDENT_MANIFEST.items
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
