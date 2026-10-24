/**
 * Pixel emote overlay rules for the room canvas (LifeRoomFx).
 *
 * Precedence: cough (Sức khỏe < 30) > cloud (Tinh thần < 15) >
 * sweat (Năng lượng < 15). The 3D room (?3d=1, the same flag GameShell
 * reads) drops the emote overlay — it is placed for the 2D canvas — while
 * the life bubble keeps rendering in both modes.
 */
export function lifeEmote(
  stats: { health: number; mood: number; energy: number },
  is3d: boolean,
): "emote_cough.png" | "emote_cloud.png" | "emote_sweat.png" | null {
  if (is3d) return null;
  if (stats.health < 30) return "emote_cough.png";
  if (stats.mood < 15) return "emote_cloud.png";
  if (stats.energy < 15) return "emote_sweat.png";
  return null;
}
