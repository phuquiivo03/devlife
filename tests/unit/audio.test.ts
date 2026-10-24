import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SIM_CATALOG } from "../../src/game/career/content";
import { resolveShippedIcon } from "../../src/lib/pixel-assets";
import {
  bgmBedForPhase,
  bgmIdForPhase,
  cueForHit,
  cueKeysForGameEvent,
  planTimeAudio,
  resolveCueKey,
  shouldCrossfadeBgm,
  typingLoopKey,
  type CueKey,
} from "../../src/game/audio/cues";
import { createAudioEngine, type AudioBufferLike, type AudioContextLike, type AudioEngineOptions, type AudioNodeLike, type BufferSourceLike, type GainNodeLike, type SfxElementLike } from "../../src/game/audio/engine";
import {
  bgmUrl,
  busGain,
  cueUrls,
  loopLeadSeconds,
  parseManifest,
  type AudioCue,
} from "../../src/game/audio/manifest";
import {
  bgmLeadSeconds,
  parseSpriteMap,
  preferredAudioFormat,
  type SpriteMap,
} from "../../src/game/audio/sprite";
import {
  AUDIO_SETTINGS_VERSION,
  AUDIO_STORAGE_KEY,
  DEFAULT_AUDIO_LEVELS,
  LEGACY_AUDIO_STORAGE_KEY,
  loadAudioSettings,
  parseAudioSettings,
  serializeAudioSettings,
} from "../../src/game/audio/settings";
import {
  createAudioContextFrom,
  decodeAudioBuffer,
  enablePlaybackSession,
  resetLoggedAudio,
} from "../../src/game/audio/webaudio";
import type { PhaseId } from "../../src/game/time/config";
import type { TimeEvent } from "../../src/game/time/types";

class FakeNode implements AudioNodeLike {
  dest: AudioNodeLike | null = null;
  connect(dest: AudioNodeLike): void {
    this.dest = dest;
  }
  disconnect(): void {
    this.dest = null;
  }
}

class FakeGain extends FakeNode implements GainNodeLike {
  gain = { value: 1 };
}

class FakeSource extends FakeNode implements BufferSourceLike {
  buffer: AudioBufferLike | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  onended: (() => void) | null = null;
  started: { when: number; offset: number; duration?: number } | null = null;
  stopped = false;

  start(when = 0, offset = 0, duration?: number): void {
    this.started = { when, offset, duration };
  }

  stop(): void {
    this.stopped = true;
  }
}

class FakeContext implements AudioContextLike {
  state = "suspended";
  sampleRate = 32000;
  currentTime = 0;
  baseLatency = 0.005;
  destination = new FakeNode();
  sources: FakeSource[] = [];
  gains: FakeGain[] = [];
  resumes = 0;
  onstatechange: (() => void) | null = null;

  resume(): Promise<void> {
    this.resumes += 1;
    this.state = "running";
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.state = "closed";
    return Promise.resolve();
  }

  decodeAudioData(): Promise<AudioBufferLike> {
    return Promise.resolve({
      duration: 30,
      length: 30 * this.sampleRate,
      numberOfChannels: 1,
      sampleRate: this.sampleRate,
    });
  }

  createBuffer(channels: number, length: number, sampleRate: number): AudioBufferLike {
    return { duration: length / sampleRate, length, numberOfChannels: channels, sampleRate };
  }

  createBufferSource(): FakeSource {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }

  createGain(): FakeGain {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
}

const PACK: AudioCue[] = [
  {
    id: "bgm_student_day",
    file: "ogg/bgm/bgm_student_day.ogg",
    mp3: "mp3/bgm/bgm_student_day.mp3",
    type: "bgm",
    loop: true,
    volume: 0.8,
    category: "bgm",
  },
  {
    id: "bgm_student_night",
    file: "ogg/bgm/bgm_student_night.ogg",
    mp3: "mp3/bgm/bgm_student_night.mp3",
    type: "bgm",
    loop: true,
    volume: 0.8,
    category: "bgm",
  },
  {
    id: "bgm_morning",
    file: "ogg/bgm/bgm_morning.ogg",
    mp3: "mp3/bgm/bgm_morning.mp3",
    type: "bgm",
    loop: true,
    volume: 0.8,
    category: "bgm",
  },
  {
    id: "bgm_afternoon",
    file: "ogg/bgm/bgm_afternoon.ogg",
    mp3: "mp3/bgm/bgm_afternoon.mp3",
    type: "bgm",
    loop: true,
    volume: 0.8,
    category: "bgm",
  },
  {
    id: "bgm_evening",
    file: "ogg/bgm/bgm_evening.ogg",
    mp3: "mp3/bgm/bgm_evening.mp3",
    type: "bgm",
    loop: true,
    volume: 0.8,
    category: "bgm",
  },
  {
    id: "bgm_night",
    file: "ogg/bgm/bgm_night.ogg",
    mp3: "mp3/bgm/bgm_night.mp3",
    type: "bgm",
    loop: true,
    volume: 0.8,
    category: "bgm",
  },
  {
    id: "sfx_ui_click",
    file: "ogg/sfx/sfx_ui_click.ogg",
    mp3: "mp3/sfx/sfx_ui_click.mp3",
    type: "sfx",
    loop: false,
    volume: 1,
    category: "ui",
  },
  { id: "sfx_phase_noon", file: "ogg/sfx/sfx_phase_noon.ogg", type: "sfx", loop: false, volume: 0.7, category: "time" },
  { id: "sfx_phase_evening", file: "ogg/sfx/sfx_phase_evening.ogg", type: "sfx", loop: false, volume: 0.7, category: "time" },
  { id: "sfx_phase_night", file: "ogg/sfx/sfx_phase_night.ogg", type: "sfx", loop: false, volume: 0.7, category: "time" },
  { id: "sfx_sleep", file: "ogg/sfx/sfx_sleep.ogg", type: "sfx", loop: false, volume: 1, category: "time" },
];

const MP3_DELAY_SAMPLES = 1105;
const SPRITE_RATE = 32000;
const MP3_LEAD = 0.04;

function slice(offset: number, duration: number) {
  return {
    ogg: { offset, duration },
    mp3: { offset: offset + MP3_DELAY_SAMPLES / SPRITE_RATE, duration },
  };
}

const CLICK = slice(0, 0.045);
const NOON = slice(1.2, 0.2);
const EVENING = slice(2.4, 0.2);
const NIGHT = slice(3.6, 0.2);
const SLEEP = slice(4.8, 0.5);

const OFFSETS: SpriteMap = {
  sampleRate: SPRITE_RATE,
  channels: 1,
  ogg: {
    file: "sprite/sfx.ogg",
    delaySamples: 0,
    cues: {
      sfx_ui_click: CLICK.ogg,
      sfx_phase_noon: NOON.ogg,
      sfx_phase_evening: EVENING.ogg,
      sfx_phase_night: NIGHT.ogg,
      sfx_sleep: SLEEP.ogg,
    },
  },
  mp3: {
    file: "sprite/sfx.mp3",
    delaySamples: MP3_DELAY_SAMPLES,
    cues: {
      sfx_ui_click: CLICK.mp3,
      sfx_phase_noon: NOON.mp3,
      sfx_phase_evening: EVENING.mp3,
      sfx_phase_night: NIGHT.mp3,
      sfx_sleep: SLEEP.mp3,
    },
  },
  bgm: {
    bgm_student_day: { mp3LeadSeconds: MP3_LEAD },
    bgm_student_night: { mp3LeadSeconds: MP3_LEAD },
    bgm_morning: { mp3LeadSeconds: MP3_LEAD },
    bgm_afternoon: { mp3LeadSeconds: MP3_LEAD },
    bgm_evening: { mp3LeadSeconds: MP3_LEAD },
    bgm_night: { mp3LeadSeconds: MP3_LEAD },
  },
};

class FakeElement implements SfxElementLike {
  src = "";
  loop = false;
  volume = 1;
  preload = "";
  playsInline = false;
  currentTime = 0;
  plays = 0;
  private listeners: Record<string, Array<() => void>> = {};

  play(): Promise<void> {
    this.plays += 1;
    return Promise.resolve();
  }

  pause(): void {}

  addEventListener(type: "error" | "loadedmetadata" | "playing" | "seeked", listener: () => void): void {
    (this.listeners[type] ??= []).push(listener);
  }

  emit(type: "error" | "loadedmetadata" | "playing" | "seeked"): void {
    for (const listener of this.listeners[type] ?? []) listener();
  }
}

function harness(format: "ogg" | "mp3" = "ogg", extra: Partial<AudioEngineOptions> = {}) {
  const ctx = new FakeContext();
  const calls: string[] = [];
  const jobs: Array<() => Promise<void>> = [];
  const latencies: Array<{ ms: number; id: string }> = [];
  let clock = 0;
  const engine = createAudioEngine({
    createContext: () => ctx,
    format,
    fadeMs: 0,
    now: () => clock,
    onLatency: (ms, id) => latencies.push({ ms, id }),
    scheduleIdle: (work) => {
      jobs.push(() => Promise.resolve(work()));
    },
    fetch: async (input) => {
      calls.push(input);
      if (input.endsWith("/audio/manifest.json")) {
        return { ok: true, json: async () => PACK, arrayBuffer: async () => new ArrayBuffer(0) };
      }
      if (input.endsWith("/audio/sprite/offsets.json")) {
        return { ok: true, json: async () => OFFSETS, arrayBuffer: async () => new ArrayBuffer(0) };
      }
      if (input.startsWith("/audio/")) {
        return { ok: true, json: async () => null, arrayBuffer: async () => new ArrayBuffer(8) };
      }
      return { ok: false, json: async () => null, arrayBuffer: async () => new ArrayBuffer(0) };
    },
    ...extra,
  });
  return {
    ctx,
    engine,
    calls,
    latencies,
    setClock(value: number) {
      clock = value;
    },
    async flush() {
      const job = jobs.shift();
      if (job) await job();
    },
  };
}

function masterGain(ctx: FakeContext): FakeGain {
  const master = ctx.gains.find((gain) => gain.dest === ctx.destination);
  if (!master) throw new Error("missing master gain");
  return master;
}

function sfxStarts(ctx: FakeContext): FakeSource[] {
  return ctx.sources.filter((source) => source.buffer !== null && source.buffer.length !== 1 && !source.loop);
}

function phaseChange(phase: PhaseId, previous: PhaseId): TimeEvent {
  return { type: "phaseChanged", phase, previous, day: 1, totalMinutes: 0 };
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key]! : null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
    removeItem(key: string) {
      delete data[key];
    },
  };
}

describe("audio manifest", () => {
  it("parses an array or a cues object and drops bad rows", () => {
    expect(parseManifest([{ id: "ui_click", file: "ui_click", type: "sfx", loop: false, volume: 2 }])).toEqual([
      { id: "ui_click", file: "ui_click", type: "sfx", category: "ui", loop: false, volume: 1 },
    ]);
    expect(
      parseManifest({
        assets: [{ id: "bgm_student_day", type: "bgm", file: "ogg/bgm/bgm_student_day.ogg", mp3: "mp3/bgm/bgm_student_day.mp3", loop: true, volume: 0.5 }],
      })[0],
    ).toMatchObject({
      id: "bgm_student_day",
      type: "bgm",
      mp3: "mp3/bgm/bgm_student_day.mp3",
      loop: true,
    });
    expect(parseManifest({ nope: true })).toEqual([]);
    expect(parseManifest(null)).toEqual([]);
  });

  it("keeps an mp3 loop lead and ignores it for ogg", () => {
    const cue = parseManifest([
      {
        id: "sfx_typing_loop",
        file: "ogg/sfx/sfx_typing_loop.ogg",
        mp3: "mp3/sfx/sfx_typing_loop.mp3",
        type: "sfx",
        loop: true,
        volume: 0.38,
        mp3LeadSeconds: 0.025057,
      },
    ])[0];
    expect(cue?.volume).toBe(0.38);
    expect(cue?.loop).toBe(true);
    expect(loopLeadSeconds("ogg", cue?.mp3LeadSeconds)).toBe(0);
    expect(loopLeadSeconds("mp3", cue?.mp3LeadSeconds)).toBeCloseTo(0.025057, 6);
    expect(typingLoopKey(null)).toBe("typingLoop");
    expect(typingLoopKey("careful")).toBe("typingLoop");
    expect(typingLoopKey("rushed")).toBe("typingLoopFast");
  });

  it("keeps BGM on ogg and offers mp3 only as an SFX fallback", () => {
    const day = PACK[0]!;
    const night = PACK[1]!;
    const click = PACK.find((cue) => cue.id === "sfx_ui_click")!;
    expect(cueUrls(day)).toEqual(["/audio/ogg/bgm/bgm_student_day.ogg"]);
    expect(cueUrls(night)).toEqual(["/audio/ogg/bgm/bgm_student_night.ogg"]);
    expect(cueUrls(click)).toEqual([
      "/audio/ogg/sfx/sfx_ui_click.ogg",
      "/audio/mp3/sfx/sfx_ui_click.mp3",
    ]);
    expect(cueUrls(day).some((url) => url.endsWith(".mp3"))).toBe(false);
    expect(bgmUrl(day, "ogg")).toBe("/audio/ogg/bgm/bgm_student_day.ogg");
    expect(bgmUrl(day, "mp3")).toBe("/audio/mp3/bgm/bgm_student_day.mp3");
    expect(bgmLeadSeconds(OFFSETS, "ogg", "bgm_student_day")).toBe(0);
    expect(bgmLeadSeconds(OFFSETS, "mp3", "bgm_student_day")).toBe(MP3_LEAD);
    expect(preferredAudioFormat(() => "probably")).toBe("ogg");
    expect(preferredAudioFormat(() => "maybe")).toBe("ogg");
    expect(preferredAudioFormat(() => "")).toBe("mp3");
    expect(parseSpriteMap(null)).toBeNull();
  });

  it("defaults to sound on and unmutes a v1 save once", () => {
    expect(busGain(0.5, 0.5, false)).toBe(0.25);
    expect(busGain(1, 1, true)).toBe(0);
    expect(DEFAULT_AUDIO_LEVELS.muted).toBe(false);
    expect(DEFAULT_AUDIO_LEVELS.music).toBeGreaterThan(0);
    expect(DEFAULT_AUDIO_LEVELS.sfx).toBeGreaterThan(0);
    expect(DEFAULT_AUDIO_LEVELS).toEqual({ music: 0.5, sfx: 0.8, muted: false });
    expect(parseAudioSettings("nope", DEFAULT_AUDIO_LEVELS)).toEqual(DEFAULT_AUDIO_LEVELS);
    expect(parseAudioSettings(JSON.stringify({ v: 99, music: 0 }), DEFAULT_AUDIO_LEVELS)).toEqual(
      DEFAULT_AUDIO_LEVELS,
    );

    const legacyMuted = parseAudioSettings(
      JSON.stringify({ v: 1, music: 0.5, sfx: 0.8, muted: true }),
      DEFAULT_AUDIO_LEVELS,
    );
    expect(legacyMuted).toEqual({ music: 0.5, sfx: 0.8, muted: false });
    expect(
      parseAudioSettings(JSON.stringify({ v: 1, music: 0, sfx: 0, muted: true }), DEFAULT_AUDIO_LEVELS),
    ).toEqual(DEFAULT_AUDIO_LEVELS);
    expect(
      parseAudioSettings(JSON.stringify({ v: 1, music: 0.3, sfx: 0, muted: true }), DEFAULT_AUDIO_LEVELS),
    ).toEqual({ music: 0.3, sfx: 0.8, muted: false });

    const kept = parseAudioSettings(
      JSON.stringify({ v: AUDIO_SETTINGS_VERSION, music: 0, sfx: 0.4, muted: true }),
      DEFAULT_AUDIO_LEVELS,
    );
    expect(kept).toEqual({ music: 0, sfx: 0.4, muted: true });

    const stored = parseAudioSettings(
      serializeAudioSettings({ music: 0.3, sfx: 1.4, muted: true }),
      DEFAULT_AUDIO_LEVELS,
    );
    expect(stored).toEqual({ music: 0.3, sfx: 1, muted: true });
    expect(JSON.parse(serializeAudioSettings(stored)).v).toBe(2);
    expect(AUDIO_STORAGE_KEY).toBe("devlife:audio:v2");
    expect(LEGACY_AUDIO_STORAGE_KEY).toBe("devlife:audio:v1");

    const storage = memoryStorage({
      [LEGACY_AUDIO_STORAGE_KEY]: JSON.stringify({ v: 1, music: 0.5, sfx: 0.8, muted: true }),
    });
    expect(loadAudioSettings(storage)).toEqual({ music: 0.5, sfx: 0.8, muted: false });
    expect(storage.data[LEGACY_AUDIO_STORAGE_KEY]).toBeUndefined();
    expect(JSON.parse(storage.data[AUDIO_STORAGE_KEY]!).muted).toBe(false);
    storage.data[AUDIO_STORAGE_KEY] = serializeAudioSettings({ music: 0.2, sfx: 0.4, muted: true });
    expect(loadAudioSettings(storage)).toEqual({ music: 0.2, sfx: 0.4, muted: true });
    expect(loadAudioSettings(memoryStorage())).toEqual(DEFAULT_AUDIO_LEVELS);
  });
});

describe("sound icons", () => {
  const names = ["sound_on", "sound_off", "volume_low", "volume_high"] as const;

  it("scales the 44px native icons to 22px and does not look for an x4 file", () => {
    const files = names.map((name) => `icon_${name}.png`);
    for (const name of names) {
      expect(resolveShippedIcon(name, 22, files)).toEqual({
        src: `/ui/icons/icon_${name}.png`,
        displayPx: 22,
      });
    }
  });

  it("ships each sound icon as a 44×44 png", () => {
    for (const name of names) {
      const file = path.join(process.cwd(), "public/ui/icons", `icon_${name}.png`);
      const bytes = fs.readFileSync(file);
      expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(bytes.readUInt32BE(16)).toBe(44);
      expect(bytes.readUInt32BE(20)).toBe(44);
      expect(
        fs.existsSync(path.join(process.cwd(), "public/ui/icons", `icon_${name}_x4.png`)),
      ).toBe(false);
    }
  });
});

describe("audio cues", () => {
  const brackets = SIM_CATALOG.config.rank_brackets;

  it("gives each phase its own lo-fi loop and crossfades on every phase change", () => {
    expect(bgmBedForPhase("morning")).toBe("morning");
    expect(bgmIdForPhase("morning")).toBe("bgm_morning");
    expect(bgmIdForPhase("noon")).toBe("bgm_afternoon");
    expect(bgmIdForPhase("evening")).toBe("bgm_evening");
    expect(bgmIdForPhase("night")).toBe("bgm_night");
    expect(shouldCrossfadeBgm("morning", "noon")).toBe(true);
    expect(shouldCrossfadeBgm("noon", "noon")).toBe(false);
  });

  it("plays one time-skip sting for a multi-hour jump, not for sleep or a single hour", () => {
    const oneHour = planTimeAudio([
      { type: "hourChanged", day: 1, hour: 9, totalMinutes: 9 * 60 },
    ]);
    expect(oneHour.timeSkip).toBe(false);

    const skip = planTimeAudio([
      { type: "hourChanged", day: 1, hour: 10, totalMinutes: 10 * 60 },
      { type: "hourChanged", day: 1, hour: 11, totalMinutes: 11 * 60 },
      phaseChange("noon", "morning"),
    ]);
    expect(skip.timeSkip).toBe(true);
    expect(skip.bgmPhase).toBe("noon");
    expect(shouldCrossfadeBgm(skip.bgmPrevious!, skip.bgmPhase!)).toBe(true);

    const sleep = planTimeAudio([
      { type: "hourChanged", day: 2, hour: 6, totalMinutes: 30 * 60 },
      phaseChange("morning", "night"),
      { type: "dayStarted", day: 2, totalMinutes: 30 * 60 },
      { type: "sleep", fromTotalMinutes: 22 * 60, toTotalMinutes: 30 * 60, day: 2 },
    ]);
    expect(sleep.sleep).toBe(true);
    expect(sleep.timeSkip).toBe(false);
    expect(sleep.dayStarted).toBe(false);
    expect(sleep.phaseChimes).toEqual(["morning"]);
    expect(shouldCrossfadeBgm("night", "morning")).toBe(true);
  });

  it("maps money direction and rank changes, and skips ids the manifest does not have", () => {
    expect(cueKeysForGameEvent({ type: "moneyChanged", delta: 100, money: 100 }, brackets)).toEqual([
      "moneyIn",
    ]);
    expect(cueKeysForGameEvent({ type: "moneyChanged", delta: -50, money: 50 }, brackets)).toEqual([
      "moneyOut",
    ]);
    expect(cueKeysForGameEvent({ type: "moneyChanged", delta: 0, money: 50 }, brackets)).toEqual([]);
    expect(
      cueKeysForGameEvent({ type: "skillLevelUp", skillId: "frontend", level: 2, rankId: "intern" }, brackets),
    ).toEqual(["levelUp"]);
    expect(
      cueKeysForGameEvent({ type: "skillLevelUp", skillId: "frontend", level: 3, rankId: "junior" }, brackets),
    ).toEqual(["rankUp", "levelUp"]);
    expect(resolveCueKey(["sfx_ui_click"], "hover")).toBeNull();
    expect(resolveCueKey(["sfx_ui_click", "sfx_ui_hover"], "hover")).toBe("sfx_ui_hover");
    expect(
      cueKeysForGameEvent({ type: "energyChanged", delta: -15, energy: 18 }, brackets),
    ).toEqual(["energyLow"]);
    expect(
      cueKeysForGameEvent({ type: "energyChanged", delta: -5, energy: 10 }, brackets),
    ).toEqual([]);
    expect(
      cueKeysForGameEvent({ type: "energyChanged", delta: 30, energy: 100 }, brackets),
    ).toEqual(["energyRestored"]);
  });

  it("plays a locked cue for aria-disabled controls and a tab cue for tabs", () => {
    expect(
      cueForHit({ sfx: null, ariaDisabled: true, role: null, tag: "button", disabled: false }, "down"),
    ).toBe("locked");
    expect(
      cueForHit({ sfx: null, ariaDisabled: false, role: "tab", tag: "button", disabled: false }, "down"),
    ).toBe("tab");
    expect(
      cueForHit({ sfx: "none", ariaDisabled: false, role: null, tag: "button", disabled: false }, "down"),
    ).toBeNull();
    expect(
      cueForHit({ sfx: null, ariaDisabled: false, role: null, tag: "button", disabled: false }, "over"),
    ).toBe("hover");
  });
});

describe("audio engine", () => {
  it("decodes one sprite at startup and does not fetch BGM until idle after unlock", async () => {
    const audio = harness();
    await audio.engine.preloadSfx();
    expect(audio.calls).toEqual([
      "/audio/manifest.json",
      "/audio/sprite/offsets.json",
      "/audio/sprite/sfx.ogg",
    ]);
    expect(audio.ctx.sources).toHaveLength(0);

    audio.engine.setSettings({ music: 1, sfx: 1, muted: false });
    audio.engine.notePhase("morning");
    audio.engine.unlock();
    expect(audio.ctx.resumes).toBe(1);
    const silence = audio.ctx.sources.find((source) => source.buffer?.length === 1);
    expect(silence?.dest).toBe(audio.ctx.destination);
    expect(silence?.started).toEqual({ when: 0, offset: 0, duration: undefined });
    expect(audio.engine.bedUrl()).toBeNull();
    expect(audio.calls.some((url) => url.includes("bgm"))).toBe(false);

    await audio.flush();
    expect(audio.engine.bedUrl()).toBe("/audio/ogg/bgm/bgm_morning.ogg");
    const bed = audio.ctx.sources.find((source) => source.loop);
    expect(bed?.loopStart).toBe(0);
    expect(bed?.started?.offset).toBe(0);
    expect(bed?.loopEnd).toBe(30);
    const fade = bed?.dest as FakeGain;
    expect(fade.gain.value).toBe(0.8);
    expect((fade.dest as FakeGain).gain.value).toBe(1);
    expect(audio.calls.some((url) => url.endsWith(".mp3"))).toBe(false);
  });

  it("plays a sprite slice on pointerdown and crossfades to each phase's own bed", async () => {
    const audio = harness();
    await audio.engine.preloadSfx();
    audio.engine.setSettings({ music: 1, sfx: 0.5, muted: false });
    audio.engine.notePhase("morning");
    audio.engine.unlock();
    await audio.flush();
    audio.setClock(80);
    audio.engine.playKey("click", 50);
    expect(audio.latencies).toEqual([{ ms: 30, id: "sfx_ui_click" }]);
    const click = sfxStarts(audio.ctx).at(-1)!;
    expect(click.started).toEqual({ when: 0, offset: CLICK.ogg.offset, duration: CLICK.ogg.duration });
    const trim = click.dest as FakeGain;
    expect(trim.gain.value).toBe(1);
    const uiBus = trim.dest as FakeGain;
    expect(uiBus.gain.value).toBe(0.5);
    expect(uiBus.dest).toBe(masterGain(audio.ctx));

    const loops = () => audio.ctx.sources.filter((source) => source.loop);
    expect(loops()).toHaveLength(1);
    const morningBed = loops()[0]!;
    audio.engine.applyTimePlan(planTimeAudio([phaseChange("noon", "morning")]));
    await audio.flush();
    expect(audio.engine.bedUrl()).toBe("/audio/ogg/bgm/bgm_afternoon.ogg");
    expect(morningBed.stopped).toBe(true);
    const noon = sfxStarts(audio.ctx).at(-1)!;
    expect(noon.started?.offset).toBe(NOON.ogg.offset);
    expect((noon.dest as FakeGain).dest).not.toBe(uiBus);

    const day = loops().find((source) => !source.stopped)!;
    audio.engine.applyTimePlan(planTimeAudio([phaseChange("evening", "noon")]));
    await audio.flush();
    expect(audio.engine.bedUrl()).toBe("/audio/ogg/bgm/bgm_evening.ogg");
    expect(day.stopped).toBe(true);
    expect(audio.calls.some((url) => url.endsWith(".mp3"))).toBe(false);
  });

  it("uses the mp3 sprite offset, including encoder delay, and skips the mp3 bed lead", async () => {
    const audio = harness("mp3");
    await audio.engine.preloadSfx();
    expect(audio.calls).toContain("/audio/sprite/sfx.mp3");
    audio.engine.notePhase("morning");
    audio.engine.unlock();
    audio.engine.playKey("click", 0);
    const click = sfxStarts(audio.ctx).at(-1)!;
    expect(click.started?.offset).toBeCloseTo(CLICK.mp3.offset, 6);
    expect(click.started?.offset).toBeCloseTo(CLICK.ogg.offset + MP3_DELAY_SAMPLES / SPRITE_RATE, 6);
    await audio.flush();
    expect(audio.engine.bedUrl()).toBe("/audio/mp3/bgm/bgm_morning.mp3");
    const bed = audio.ctx.sources.find((source) => source.loop);
    expect(bed?.loopStart).toBeCloseTo(MP3_LEAD, 6);
    expect(bed?.started?.offset).toBeCloseTo(MP3_LEAD, 6);
  });

  it("does not start playback before the first gesture and stays quiet for a missing cue", async () => {
    const audio = harness();
    await audio.engine.preloadSfx();
    audio.engine.playKey("click");
    audio.engine.applyTimePlan(planTimeAudio([phaseChange("night", "evening")]));
    expect(audio.ctx.sources).toHaveLength(0);
    expect(audio.engine.bedUrl()).toBeNull();
    expect(audio.calls.some((url) => url.includes("bgm"))).toBe(false);
    audio.engine.unlock();
    expect(audio.engine.bedUrl()).toBeNull();
    const before = audio.ctx.sources.length;
    audio.engine.playKey("hover");
    expect(audio.ctx.sources).toHaveLength(before);
    await audio.flush();
    expect(audio.engine.bedUrl()).toBe("/audio/ogg/bgm/bgm_night.ogg");
  });

  it("keeps mute and the sfx slider on the gain nodes", async () => {
    const audio = harness();
    await audio.engine.preloadSfx();
    audio.engine.setSettings({ music: 1, sfx: 0.25, muted: true });
    audio.engine.notePhase("morning");
    audio.engine.unlock();
    await audio.flush();
    expect(masterGain(audio.ctx).gain.value).toBe(0);
    audio.engine.playKey("click");
    const trim = sfxStarts(audio.ctx).at(-1)!.dest as FakeGain;
    expect((trim.dest as FakeGain).gain.value).toBe(0.25);
    audio.engine.setSettings({ music: 0.5, sfx: 0.9, muted: false });
    expect(masterGain(audio.ctx).gain.value).toBe(1);
    expect((trim.dest as FakeGain).gain.value).toBe(0.9);
    const bed = audio.ctx.sources.find((source) => source.loop);
    expect((bed?.dest as FakeGain).dest).toMatchObject({ gain: { value: 0.5 } });
  });

  it("does not stack a second silent buffer once the context is running", async () => {
    const audio = harness();
    await audio.engine.preloadSfx();
    audio.engine.unlock();
    const silence = audio.ctx.sources.filter((source) => source.buffer?.length === 1);
    expect(silence).toHaveLength(1);
    expect(audio.ctx.resumes).toBe(1);
    audio.engine.unlock();
    expect(audio.ctx.sources.filter((source) => source.buffer?.length === 1)).toHaveLength(1);
    expect(audio.ctx.resumes).toBe(1);
  });

  it("resumes an interrupted context on unlock and on state change", async () => {
    const audio = harness();
    audio.ctx.resume = () => {
      audio.ctx.resumes += 1;
      audio.ctx.state = "interrupted";
      return Promise.resolve();
    };
    audio.engine.unlock();
    expect(audio.ctx.resumes).toBe(1);
    audio.engine.unlock();
    expect(audio.ctx.resumes).toBe(2);
    audio.ctx.state = "interrupted";
    audio.ctx.onstatechange?.();
    expect(audio.ctx.resumes).toBe(3);
  });

  it("uses the media session when it is available and a silent element otherwise", () => {
    let created = 0;
    let plays = 0;
    const withSession = harness("ogg", {
      enableSession: () => true,
      createKeepAlive: () => {
        created += 1;
        return {
          play() {
            plays += 1;
          },
          stop() {},
        };
      },
    });
    withSession.engine.unlock();
    expect(created).toBe(0);

    const channel = harness("ogg", {
      enableSession: () => false,
      createKeepAlive: () => {
        created += 1;
        return {
          play() {
            plays += 1;
          },
          stop() {},
        };
      },
    });
    channel.engine.unlock();
    channel.engine.resume();
    expect(created).toBe(1);
    expect(plays).toBe(2);
  });

  it("falls back from an ogg sprite to the mp3 sprite", async () => {
    resetLoggedAudio();
    let decodes = 0;
    const audio = harness("ogg", {
      decodeAudioData: async () => {
        decodes += 1;
        if (decodes === 1) throw new Error("ogg sprite");
        return {
          duration: 30,
          length: 30 * 32000,
          numberOfChannels: 1,
          sampleRate: 32000,
        };
      },
    });
    await audio.engine.preloadSfx();
    expect(audio.calls).toContain("/audio/sprite/sfx.ogg");
    expect(audio.calls).toContain("/audio/sprite/sfx.mp3");
    audio.engine.notePhase("morning");
    audio.engine.unlock();
    audio.engine.playKey("click", 0);
    const click = sfxStarts(audio.ctx).at(-1)!;
    expect(click.started?.offset).toBeCloseTo(CLICK.mp3.offset, 6);
    await audio.flush();
    expect(audio.engine.bedUrl()).toBe("/audio/mp3/bgm/bgm_morning.mp3");
  });

  it("falls back to per-file audio when every sprite decode fails", async () => {
    resetLoggedAudio();
    const warnings: string[] = [];
    const original = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map(String).join(" "));
    };
    const elements: FakeElement[] = [];
    try {
      const audio = harness("ogg", {
        decodeAudioData: async () => {
          throw new Error("decode");
        },
        createSfxElement: () => {
          const element = new FakeElement();
          elements.push(element);
          return element;
        },
        enableSession: () => true,
      });
      await audio.engine.preloadSfx();
      audio.engine.setSettings({ music: 1, sfx: 0.5, muted: false });
      audio.engine.notePhase("morning");
      audio.engine.unlock();
      audio.engine.playKey("click");
      const sfx = elements.find((element) => !element.loop);
      expect(sfx?.src).toBe("/audio/ogg/sfx/sfx_ui_click.ogg");
      expect(sfx?.volume).toBe(0.5);
      sfx?.emit("error");
      expect(sfx?.src).toBe("/audio/mp3/sfx/sfx_ui_click.mp3");
      audio.engine.playKey("click");
      const spriteWarnings = warnings.filter((line) => line.includes("SFX sprite"));
      expect(spriteWarnings).toHaveLength(3);
      expect(warnings.filter((line) => line.includes("[devlife-audio]"))).toEqual(spriteWarnings);
      await audio.flush();
      const bed = elements.find((element) => element.loop);
      expect(bed?.src).toBe("/audio/ogg/bgm/bgm_morning.ogg");
      expect(warnings.some((line) => line.includes("BGM decode failed"))).toBe(true);
      const logged = warnings.length;
      audio.engine.playKey("click");
      expect(warnings).toHaveLength(logged);
    } finally {
      console.warn = original;
    }
  });

  it("loops a file buffer on the sfx bus, switches, and stops", async () => {
    const audio = harness();
    await audio.engine.preloadSfx();
    audio.engine.setSettings({ music: 1, sfx: 0.5, muted: false });
    audio.engine.unlock();
    const loops = () => audio.ctx.sources.filter((source) => source.loop && source.loopEnd > 0 && source.loopEnd < 100);
    const before = audio.ctx.sources.length;
    await audio.engine.startLoop("typingLoop");
    expect(audio.ctx.sources).toHaveLength(before);

    audio.engine.setManifest([
      ...PACK,
      {
        id: "sfx_typing_loop",
        file: "ogg/sfx/sfx_typing_loop.ogg",
        mp3: "mp3/sfx/sfx_typing_loop.mp3",
        type: "sfx",
        loop: true,
        volume: 0.38,
        category: "ui",
        mp3LeadSeconds: 0.025057,
      },
      {
        id: "sfx_typing_loop_fast",
        file: "ogg/sfx/sfx_typing_loop_fast.ogg",
        mp3: "mp3/sfx/sfx_typing_loop_fast.mp3",
        type: "sfx",
        loop: true,
        volume: 0.38,
        category: "ui",
        mp3LeadSeconds: 0.025057,
      },
    ]);
    await audio.engine.startLoop("typingLoop");
    expect(audio.calls).toContain("/audio/ogg/sfx/sfx_typing_loop.ogg");
    expect(audio.calls.some((url) => url.includes("sprite"))).toBe(true);
    const typing = loops().at(-1)!;
    expect(typing.loop).toBe(true);
    expect(typing.loopStart).toBe(0);
    expect(typing.loopEnd).toBe(30);
    expect(typing.started).toEqual({ when: 0, offset: 0, duration: undefined });
    const trim = typing.dest as FakeGain;
    expect(trim.gain.value).toBe(0.38);
    expect((trim.dest as FakeGain).gain.value).toBe(0.5);
    expect((trim.dest as FakeGain).dest).toBe(masterGain(audio.ctx));

    await audio.engine.startLoop("typingLoop");
    expect(loops().filter((source) => !source.stopped)).toHaveLength(1);
    expect(typing.stopped).toBe(false);

    audio.engine.setSettings({ music: 1, sfx: 0.25, muted: true });
    expect(masterGain(audio.ctx).gain.value).toBe(0);
    expect((trim.dest as FakeGain).gain.value).toBe(0.25);

    await audio.engine.startLoop("typingLoopFast");
    expect(typing.stopped).toBe(true);
    expect(audio.calls).toContain("/audio/ogg/sfx/sfx_typing_loop_fast.ogg");
    const fast = loops().find((source) => !source.stopped)!;
    expect(fast.loopStart).toBe(0);
    expect((fast.dest as FakeGain).gain.value).toBe(0.38);

    audio.engine.stopLoop();
    expect(fast.stopped).toBe(true);

    audio.engine.setManifest(PACK);
    await audio.engine.startLoop("typingLoop");
    expect(loops().filter((source) => !source.stopped)).toHaveLength(0);
  });

  it("skips the mp3 encoder lead when looping the file fallback", async () => {
    const audio = harness("mp3");
    await audio.engine.preloadSfx();
    audio.engine.unlock();
    audio.engine.setManifest([
      ...PACK,
      {
        id: "sfx_typing_loop",
        file: "ogg/sfx/sfx_typing_loop.ogg",
        mp3: "mp3/sfx/sfx_typing_loop.mp3",
        type: "sfx",
        loop: true,
        volume: 0.38,
        category: "ui",
        mp3LeadSeconds: 0.025057,
      },
    ]);
    await audio.engine.startLoop("typingLoop");
    expect(audio.calls).toContain("/audio/mp3/sfx/sfx_typing_loop.mp3");
    const typing = audio.ctx.sources.filter((source) => source.loop).at(-1)!;
    expect(typing.loopStart).toBeCloseTo(0.025057, 6);
    expect(typing.loopEnd).toBe(30);
    expect(typing.started?.offset).toBeCloseTo(0.025057, 6);
  });

  it("loops a per-file element when there is no audio context and follows mute", async () => {
    const elements: FakeElement[] = [];
    const audio = harness("ogg", {
      createContext: () => null,
      createSfxElement: () => {
        const el = new FakeElement();
        elements.push(el);
        return el;
      },
    });
    await audio.engine.preloadSfx();
    audio.engine.setManifest([
      ...PACK,
      {
        id: "sfx_typing_loop",
        file: "ogg/sfx/sfx_typing_loop.ogg",
        mp3: "mp3/sfx/sfx_typing_loop.mp3",
        type: "sfx",
        loop: true,
        volume: 0.38,
        category: "ui",
        mp3LeadSeconds: 0.025057,
      },
    ]);
    audio.engine.setSettings({ music: 0, sfx: 0.5, muted: false });
    audio.engine.unlock();
    await audio.engine.startLoop("typingLoop");
    const typing = elements.find((el) => el.src.includes("sfx_typing_loop.ogg"));
    expect(typing?.loop).toBe(true);
    expect(typing?.volume).toBeCloseTo(0.19);
    audio.engine.setSettings({ music: 0, sfx: 0.5, muted: true });
    expect(typing?.volume).toBe(0);
    audio.engine.stopLoop();
    expect(typing?.loop).toBe(false);
  });
});

describe("ios web audio helpers", () => {
  it("decodes from the callback form and from a promise", async () => {
    const buffer: AudioBufferLike = { duration: 1, length: 8, numberOfChannels: 1, sampleRate: 8 };
    const callbackOnly = await decodeAudioBuffer(
      {
        decodeAudioData(_data, success) {
          success?.(buffer);
          return undefined;
        },
      },
      new ArrayBuffer(4),
    );
    expect(callbackOnly).toBe(buffer);
    const promised = await decodeAudioBuffer(
      {
        decodeAudioData() {
          return Promise.resolve(buffer);
        },
      },
      new ArrayBuffer(4),
    );
    expect(promised).toBe(buffer);
    const promiseWins = await decodeAudioBuffer(
      {
        decodeAudioData(_data, _success, failure) {
          failure?.(null as unknown as Error);
          return Promise.resolve(buffer);
        },
      },
      new ArrayBuffer(4),
    );
    expect(promiseWins).toBe(buffer);
  });

  it("sets the playback session only when the browser exposes one", () => {
    const session = { type: "auto" };
    expect(enablePlaybackSession({ audioSession: session })).toBe(true);
    expect(session.type).toBe("playback");
    expect(enablePlaybackSession(undefined)).toBe(false);
    expect(enablePlaybackSession({})).toBe(false);
  });

  it("constructs a context without latencyHint when that option throws", () => {
    let calls = 0;
    class Older {
      constructor(options?: { latencyHint?: string }) {
        calls += 1;
        if (options) throw new Error("no options");
      }
    }
    expect(createAudioContextFrom(Older as unknown as new (options?: { latencyHint?: string }) => AudioContextLike)).toBeInstanceOf(
      Older,
    );
    expect(calls).toBe(2);
    class Broken {
      constructor() {
        throw new Error("no context");
      }
    }
    expect(createAudioContextFrom(Broken as unknown as new () => AudioContextLike)).toBeNull();
    expect(createAudioContextFrom(undefined)).toBeNull();
  });
});

const manifestPath = path.join(process.cwd(), "public/audio/manifest.json");
const hasManifest = fs.existsSync(manifestPath);

describe.skipIf(!hasManifest)("shipped audio pack", () => {
  it("includes both student beds and resolves mapped cues", () => {
    const cues = parseManifest(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
    const ids = cues.map((cue) => cue.id);
    const day = cues.find((cue) => cue.id === "bgm_student_day");
    const night = cues.find((cue) => cue.id === "bgm_student_night");
    expect(day?.type).toBe("bgm");
    expect(night?.type).toBe("bgm");
    expect(cueUrls(day!)).toEqual(["/audio/ogg/bgm/bgm_student_day.ogg"]);
    expect(cueUrls(night!)).toEqual(["/audio/ogg/bgm/bgm_student_night.ogg"]);
    const sfx = cues.filter((cue) => cue.type === "sfx");
    const looped = sfx.filter((cue) => cue.loop);
    const oneShots = sfx.filter((cue) => !cue.loop);
    expect(oneShots).toHaveLength(38);
    expect(looped.map((cue) => cue.id).sort()).toEqual(["sfx_typing_loop", "sfx_typing_loop_fast"]);
    expect(looped.every((cue) => cue.volume === 0.38)).toBe(true);
    expect(looped.every((cue) => cue.mp3LeadSeconds === 0.025057)).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), "public/audio/CREDITS.md"))).toBe(true);

    const phaseKeys = ["phaseMorning", "phaseNoon", "phaseEvening", "phaseNight"] as const;
    const required: CueKey[] = [
      ...phaseKeys,
      "timeSkip",
      "sleep",
      "dayStarted",
      "jobAccepted",
      "jobCompleted",
      "jobFailed",
      "xp",
      "levelUp",
      "rankUp",
      "milestone",
      "moneyIn",
      "moneyOut",
      "course",
      "click",
      "hover",
      "panelOpen",
      "panelClose",
      "tab",
      "locked",
      "toast",
      "energyLow",
      "energyRestored",
      "typingLoop",
      "typingLoopFast",
      "eventOpen",
      "notifInfo",
      "notifWarn",
      "notifUrgent",
      "landlordKnock",
      "salary",
      "diaryFlip",
      "sickCough",
      "storeBuy",
    ];
    const missing = required.filter((key) => resolveCueKey(ids, key) == null);
    expect(missing, `unmapped ids: ${ids.join(", ")}`).toEqual([]);

    for (const cue of cues) {
      for (const url of cueUrls(cue)) {
        const relative = url.replace(/^\/audio\//, "");
        expect(fs.existsSync(path.join(process.cwd(), "public/audio", relative)), url).toBe(true);
        if (cue.type === "bgm") expect(url.endsWith(".ogg")).toBe(true);
      }
    }

    const offsets = parseSpriteMap(
      JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/audio/sprite/offsets.json"), "utf8")),
    );
    expect(offsets?.sampleRate).toBe(32000);
    expect(offsets?.channels).toBe(1);
    expect(fs.existsSync(path.join(process.cwd(), "public/audio/sprite/sfx.ogg"))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), "public/audio/sprite/sfx.mp3"))).toBe(true);
    expect(Object.keys(offsets!.ogg.cues)).toHaveLength(oneShots.length);
    expect(offsets!.mp3.delaySamples).toBeGreaterThan(0);
    const shift = (offsets!.mp3.delaySamples - offsets!.ogg.delaySamples) / offsets!.sampleRate;
    for (const cue of looped) {
      expect(offsets!.ogg.cues[cue.id], cue.id).toBeUndefined();
      expect(offsets!.mp3.cues[cue.id], cue.id).toBeUndefined();
    }
    for (const cue of oneShots) {
      const ogg = offsets!.ogg.cues[cue.id];
      const mp3 = offsets!.mp3.cues[cue.id];
      expect(ogg?.duration, cue.id).toBeGreaterThan(0);
      expect(mp3?.duration, cue.id).toBeCloseTo(ogg!.duration, 5);
      expect(mp3!.offset - ogg!.offset, cue.id).toBeCloseTo(shift, 5);
    }
    expect(offsets!.bgm.bgm_student_day?.mp3LeadSeconds).toBeGreaterThan(0.01);
    expect(offsets!.bgm.bgm_student_night?.mp3LeadSeconds).toBeGreaterThan(0.01);
    expect(offsets!.bgm.bgm_student_day?.mp3LeadSeconds).toBeLessThan(0.08);
  });
});
