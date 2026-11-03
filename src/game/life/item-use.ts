import type { CareerState } from "../career/types";
import type { GameEvent } from "../events/types";
import { applyActionStats } from "./logic";

/** Real-time gap before the same item can change stats again. */
export const ITEM_USE_COOLDOWN_MS = 45_000;

export type ItemUseAction = {
  /** Vietnamese name shown on the use prompt. */
  label: string;
  /** Short toast after a successful use. */
  notice: string;
  /**
   * What the item already did before the click (passive bonus, animation).
   * "none" means the click is the only effect.
   */
  prior: string;
  mood?: number;
  energy?: number;
  health?: number;
  fullness?: number;
};

/**
 * One click action per GLB the player can use. Deltas stay on the same scale
 * as the furniture bonuses already in the game: mood +1…+2 like a day's
 * plant or fairy lights, energy +2…+8 like the fan and aircon sleep bonuses,
 * health ±1 like the mattress and a mild meal, fullness +6…+12 for a sip or
 * a snack rather than a full meal.
 */
export const ITEM_USE: Record<string, ItemUseAction> = {
  bed: { label: "Giường", notice: "Nằm nghỉ một lát.", prior: "none", energy: 6, mood: 1 },
  mattress: {
    label: "Nệm",
    notice: "Nệm êm, người dễ chịu hơn.",
    prior: "daily health +1 while owned",
    health: 1,
    energy: 3,
  },
  bed_vip: {
    label: "Giường VIP",
    notice: "Nằm giường VIP, dễ chịu hẳn.",
    prior: "sleep energy +15 while owned",
    energy: 8,
    mood: 1,
  },
  bed_floor_mat: { label: "Chiếu ngủ", notice: "Trải chiếu nằm một lúc.", prior: "none", energy: 4 },
  desk: { label: "Bàn gỗ", notice: "Lau bàn cho gọn.", prior: "none", mood: 1 },
  senior_standing_desk: {
    label: "Bàn nâng hạ",
    notice: "Kéo bàn đứng cho vừa tầm.",
    prior: "none",
    mood: 1,
    energy: 2,
  },
  table_folding: { label: "Bàn xếp", notice: "Kê lại bàn xếp.", prior: "none", mood: 1 },
  drawer_pedestal: { label: "Tủ kéo", notice: "Kéo ngăn tủ.", prior: "none", mood: 1 },
  chair_plastic: { label: "Ghế nhựa", notice: "Ngồi xuống ghế nhựa.", prior: "none", mood: 1 },
  ergo_chair: {
    label: "Ghế công thái học",
    notice: "Ngồi ghế công thái học, đỡ mỏi.",
    prior: "job energy cost ×0.9 while owned",
    energy: 3,
    mood: 1,
  },
  junior_office_chair: {
    label: "Ghế văn phòng",
    notice: "Ngồi vào ghế văn phòng.",
    prior: "none",
    mood: 1,
    energy: 2,
  },
  stool_plastic: { label: "Ghế đẩu", notice: "Ngồi ghế đẩu một lát.", prior: "none", mood: 1 },
  senior_armchair: {
    label: "Ghế bành",
    notice: "Ngả lưng ghế bành.",
    prior: "none",
    mood: 2,
    energy: 4,
  },
  monitor: { label: "Màn hình", notice: "Bật màn hình.", prior: "none", mood: 1 },
  monitor2: {
    label: "Màn hình phụ",
    notice: "Màn hình phụ sáng lên.",
    prior: "study and job XP ×1.1 while owned",
    mood: 1,
  },
  senior_dual_monitor: {
    label: "Hai màn hình",
    notice: "Bật cả hai màn hình.",
    prior: "none",
    mood: 2,
  },
  laptop: { label: "Laptop", notice: "Mở laptop.", prior: "none", mood: 1 },
  junior_laptop_stand: { label: "Giá laptop", notice: "Chỉnh giá laptop.", prior: "none", mood: 1 },
  keyboard: { label: "Bàn phím", notice: "Gõ thử bàn phím.", prior: "none", mood: 1 },
  junior_keyboard_mat: { label: "Lót bàn phím", notice: "Vuốt lót bàn phím.", prior: "none", mood: 1 },
  senior_keyboard_mat: { label: "Lót bàn", notice: "Kê tay lên lót bàn.", prior: "none", mood: 1 },
  junior_mouse: { label: "Chuột", notice: "Bấm chuột một cái.", prior: "none", mood: 1 },
  mug: { label: "Cốc cà phê", notice: "Uống một ngụm cà phê.", prior: "none", fullness: 8, mood: 2 },
  cup: { label: "Mì ly", notice: "Ăn mì ly.", prior: "none", fullness: 12, health: -1 },
  kettle: { label: "Ấm điện", notice: "Đun nước, pha một tách.", prior: "none", fullness: 8, mood: 2 },
  senior_espresso_machine: {
    label: "Máy pha cà phê",
    notice: "Pha một shot cà phê.",
    prior: "none",
    fullness: 6,
    energy: 4,
    mood: 2,
  },
  senior_coffee_grinder: {
    label: "Máy xay cà phê",
    notice: "Xay cà phê, thơm cả phòng.",
    prior: "none",
    mood: 2,
  },
  lamp_desk: { label: "Đèn bàn", notice: "Bật đèn bàn.", prior: "none", mood: 1 },
  fairy_lights: {
    label: "Đèn dây",
    notice: "Đèn dây lập lánh.",
    prior: "daily mood +1 while owned",
    mood: 1,
  },
  aircon: {
    label: "Máy lạnh",
    notice: "Máy lạnh mát hơn.",
    prior: "sleep energy +10 while owned",
    energy: 3,
    mood: 1,
  },
  fan_standing: {
    label: "Quạt đứng",
    notice: "Quạt mát hơn.",
    prior: "sleep energy +5 while owned; blades spin",
    energy: 2,
    mood: 1,
  },
  plant_big: {
    label: "Cây lớn",
    notice: "Tưới cây lớn.",
    prior: "daily mood +2 while owned",
    mood: 2,
  },
  plant_small: { label: "Cây bàn", notice: "Tưới cây bàn.", prior: "none", mood: 1 },
  senior_monstera: { label: "Cây trầu bà", notice: "Lau lá trầu bà.", prior: "none", mood: 2 },
  books_stack: { label: "Chồng sách", notice: "Đọc vài trang.", prior: "none", mood: 2 },
  junior_bookshelf: { label: "Kệ sách", notice: "Rút một cuốn trên kệ.", prior: "none", mood: 2 },
  senior_bookshelf: { label: "Kệ sách", notice: "Lấy sách trên kệ.", prior: "none", mood: 2 },
  nightstand: { label: "Tủ đầu giường", notice: "Lục tủ đầu giường.", prior: "none", mood: 1 },
  junior_wardrobe: { label: "Tủ quần áo", notice: "Mở tủ quần áo.", prior: "none", mood: 1 },
  senior_sideboard: { label: "Tủ trà", notice: "Lấy đồ trên tủ trà.", prior: "none", mood: 1 },
  poster_vn: { label: "Poster", notice: "Ngắm poster.", prior: "none", mood: 1 },
  junior_poster_1: { label: "Poster", notice: "Ngắm poster.", prior: "none", mood: 1 },
  junior_poster_2: { label: "Poster", notice: "Ngắm poster.", prior: "none", mood: 1 },
  senior_frame_1: { label: "Tranh", notice: "Ngắm tranh.", prior: "none", mood: 1 },
  senior_frame_2: { label: "Tranh", notice: "Ngắm tranh.", prior: "none", mood: 1 },
  window: { label: "Cửa sổ", notice: "Mở hé cửa sổ.", prior: "none", mood: 2, energy: 1 },
  senior_smart_speaker: { label: "Loa", notice: "Mở nhạc nhẹ.", prior: "none", mood: 2 },
  senior_rug: { label: "Thảm", notice: "Đứng trên thảm êm.", prior: "none", mood: 1 },
};

export function itemUseAction(key: string): ItemUseAction | undefined {
  return ITEM_USE[key];
}

export type ItemUseResult = {
  state: CareerState;
  events: GameEvent[];
  notice: string;
};

/** Apply one use. Unknown keys leave the state unchanged and return no notice. */
export function applyItemUse(state: CareerState, key: string): ItemUseResult {
  const action = ITEM_USE[key];
  if (!action) return { state, events: [], notice: "" };
  const result = applyActionStats(state, {
    mood: action.mood,
    energy: action.energy,
    health: action.health,
    fullness: action.fullness,
  });
  return { state: result.state, events: result.events, notice: action.notice };
}
