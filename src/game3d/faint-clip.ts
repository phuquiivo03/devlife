/**
 * The fall clip's hips slide forward about half a metre. Played at the desk,
 * that root motion puts the body through the back wall. Keep the vertical
 * drop and the first-frame XZ so he collapses where he is standing.
 */
export function pinTrackXZ(values: ArrayLike<number> & { [index: number]: number }): void {
  if (values.length < 3) return;
  const x0 = values[0] ?? 0;
  const z0 = values[2] ?? 0;
  for (let i = 0; i < values.length; i += 3) {
    values[i] = x0;
    values[i + 2] = z0;
  }
}

export const FALL_HIPS_POSITION_TRACK = "mixamorig:Hips.position";
