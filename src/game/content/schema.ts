import { z } from "zod";
import { STAGES, UNITS, WORLD } from "../config";

const vec = z.tuple([z.number().int(), z.number().int()]);

export const localizedSchema = z.object({
  en: z.string(),
  vi: z.string(),
});

export const itemSchema = z.object({
  id: z.string(),
  stage: z.enum(STAGES),
  category: z.string(),
  kind: z.enum(["floor", "surface", "wall", "decal"]),
  sprite: z.string(),
  shadow: z.string().optional(),
  name: localizedSchema,
  pivot: vec.optional(),
  shadowOffset: vec.optional(),
  zBias: z.number().int().optional(),
  sockets: z.record(z.string(), vec).optional(),
  seat: vec.optional(),
  seatPoint: vec.optional(),
  overlayFromY: z.number().int().optional(),
  floorSit: z
    .object({
      pose: z.string(),
      offset: vec,
      drawAfter: z.array(z.string()),
    })
    .optional(),
  notes: z.array(z.string()).optional(),
});

export const poseSchema = z.object({
  sprite: z.string(),
  hipFromBottom: z.number().int(),
});

/**
 * One room's half of a shared slot: just the default item and the 2D anchor.
 * The id/kind/accepts/parent half lives in rooms/slots.shared.ts and is
 * merged in by `buildRoomSlots` at load time.
 */
export const roomSlotEntrySchema = z.object({
  id: z.string(),
  default: z.string().nullable(),
  anchor: vec.optional(),
});

export const roomSchema = z.object({
  id: z.enum(STAGES),
  title: localizedSchema,
  background: z.string(),
  size: vec,
  bounds: z.object({
    backWall: z.tuple([
      z.number().int(),
      z.number().int(),
      z.number().int(),
      z.number().int(),
    ]),
    floorTopY: z.number().int(),
  }),
  focusX: z.number().int(),
  letterbox: z.string().optional(),
  slots: z.array(roomSlotEntrySchema),
});

export const catalogSchema = z.object({
  version: z.number().int(),
  units: z.literal(UNITS),
  socketOrder: z.array(z.string()),
  poses: z.record(z.string(), poseSchema),
  items: z.array(itemSchema),
});

export function assertRoomSize(room: z.infer<typeof roomSchema>) {
  if (room.size[0] !== WORLD.w || room.size[1] !== WORLD.h) {
    throw new Error(`Room ${room.id} size must be ${WORLD.w}x${WORLD.h}`);
  }
}
