import { ATLAS_JSON_URL, ATLAS_URL } from "../config";
import type { AtlasData, AtlasFrame } from "../types";

export type FrameLookup = (
  sprite: string,
) => { w: number; h: number; pivotX: number; pivotY: number };

export type LoadedAtlas = {
  image: HTMLImageElement;
  data: AtlasData;
  alphaBySprite: Map<string, Uint8ClampedArray>;
  frameLookup: FrameLookup;
  getFrame: (sprite: string) => AtlasFrame;
};

function buildAlpha(data: ImageData, frame: AtlasFrame): Uint8ClampedArray {
  const { x, y, w, h } = frame.frame;
  const out = new Uint8ClampedArray(w * h);
  const src = data.data;
  const sw = data.width;
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const si = ((y + row) * sw + (x + col)) * 4 + 3;
      out[row * w + col] = src[si] ?? 0;
    }
  }
  return out;
}

export async function loadAtlas(): Promise<LoadedAtlas> {
  const [jsonRes, img] = await Promise.all([
    fetch(ATLAS_JSON_URL),
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = ATLAS_URL;
    }),
  ]);
  if (!jsonRes.ok) throw new Error("Failed to load atlas json");
  const data = (await jsonRes.json()) as AtlasData;

  const canvas = document.createElement("canvas");
  canvas.width = data.meta.size.w;
  canvas.height = data.meta.size.h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2d context unavailable");
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const alphaBySprite = new Map<string, Uint8ClampedArray>();
  for (const [key, frame] of Object.entries(data.frames)) {
    alphaBySprite.set(key, buildAlpha(imageData, frame));
  }

  const getFrame = (sprite: string): AtlasFrame => {
    const f = data.frames[sprite];
    if (!f) throw new Error(`Unknown sprite ${sprite}`);
    return f;
  };

  const frameLookup: FrameLookup = (sprite) => {
    const f = getFrame(sprite);
    return {
      w: f.frame.w,
      h: f.frame.h,
      pivotX: f.pivot.x,
      pivotY: f.pivot.y,
    };
  };

  return { image: img, data, alphaBySprite, frameLookup, getFrame };
}
