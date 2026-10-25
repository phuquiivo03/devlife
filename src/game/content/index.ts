import type { Item, PoseDef, Room, StageId } from "../types";
import { assertRoomSize, catalogSchema, roomSchema } from "./schema";
import catalogJson from "./items.json";
import studentRoom from "./rooms/student.json";
import juniorRoom from "./rooms/junior.json";
import seniorRoom from "./rooms/senior.json";
import { buildRoomSlots } from "./rooms/slots.shared";

const catalogParsed = catalogSchema.parse(catalogJson);
const roomSources: Array<{ id: StageId; json: unknown }> = [
  { id: "student", json: studentRoom },
  { id: "junior", json: juniorRoom },
  { id: "senior", json: seniorRoom },
];
const roomsParsed = roomSources.map(({ id, json }) => {
  const parsed = roomSchema.parse(json);
  // Slots are shared across rooms; each room only supplies defaults/anchors.
  return { ...parsed, slots: buildRoomSlots(id, parsed.slots) } as Room;
});

for (const room of roomsParsed) {
  assertRoomSize(room);
}

const poses = catalogParsed.poses as Record<string, PoseDef>;
for (const item of catalogParsed.items) {
  const poseId = item.floorSit?.pose;
  if (poseId && !poses[poseId]) {
    throw new Error(`Unknown pose ${poseId} on ${item.id}`);
  }
}

const itemsById = new Map<string, Item>(
  catalogParsed.items.map((i) => [i.id, i as Item]),
);

const roomsById = new Map<StageId, Room>(
  roomsParsed.map((r) => [r.id, r as Room]),
);

export function getCatalog() {
  return {
    version: catalogParsed.version,
    units: catalogParsed.units,
    socketOrder: catalogParsed.socketOrder,
    poses,
    items: catalogParsed.items as Item[],
    itemsById,
  };
}

export function getRoom(id: StageId): Room {
  const room = roomsById.get(id);
  if (!room) throw new Error(`Unknown room ${id}`);
  return room;
}

export function getItemsForCategory(category: string): Item[] {
  return catalogParsed.items.filter((i) => i.category === category) as Item[];
}
