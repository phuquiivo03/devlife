/** Paths stay on the spec keys. Trait icons are the approved 16×16 sheets; the card draws the matching `_x2` file. */
export const M5_ASSET_KEYS = [
  "ui_dialog_frame.png",
  "ui_diary_page.png",
  "ui_banner.png",
  "ui_store_frame.png",
  "ui_store_card.png",
  "ui_badge_unread.png",
  "portrait_mom.png",
  "portrait_crush.png",
  "portrait_landlord.png",
  "portrait_client.png",
  "portrait_boss.png",
  "portrait_roommate.png",
  "portrait_headhunter.png",
  "portrait_coworker.png",
  "icon_notif_money.png",
  "icon_notif_rent.png",
  "icon_notif_salary.png",
  "icon_notif_bill.png",
  "icon_notif_sick.png",
  "icon_notif_burnout.png",
  "icon_notif_deadline.png",
  "icon_notif_job.png",
  "icon_notif_store.png",
  "icon_notif_rain.png",
  "icon_notif_power_outage.png",
  "icon_notif_event.png",
  "icon_notif_sale.png",
  "icon_severity_info.png",
  "icon_severity_warn.png",
  "icon_severity_urgent.png",
  "emote_cough.png",
  "emote_cloud.png",
  "emote_happy.png",
  "emote_sweat.png",
  "ui_speech_bubble.png",
  "item_plant.png",
  "item_fan.png",
  "item_aircon.png",
  "item_ergo_chair.png",
  "item_monitor2.png",
  "item_mattress_student.png",
  "item_mattress_junior.png",
  "icon_store_room_junior.png",
  "icon_store_room_senior.png",
  "icon_trait_night_owl.png",
  "icon_trait_diligent.png",
  "icon_trait_extrovert.png",
  "icon_trait_frugal.png",
  "icon_trait_careful.png",
  "icon_trait_optimist.png",
] as const;

export type M5AssetKey = (typeof M5_ASSET_KEYS)[number];

export function m5AssetPath(key: M5AssetKey): string {
  return `/ui/m5/${key}`;
}

/** M5.1 sheets in `public/ui/m5_1/`. Final art uses these same names. */
export function m51AssetPath(file: string): string {
  return `/ui/m5_1/${file}`;
}

/**
 * Store icons for the 3D furniture items live in `public/icons/shop/` as
 * `shop_<id>.png` (512) + `shop_<id>_256.png`; the UI renders the `_256`
 * file at 64px with object-fit contain (no pixelation). Room icons keep
 * the M5 sheets.
 */
export function shopIconPath(icon: string): string {
  return `/icons/shop/${icon.replace(/\.png$/, "_256.png")}`;
}

export function isShopIcon(icon: string): boolean {
  return icon.startsWith("shop_");
}
