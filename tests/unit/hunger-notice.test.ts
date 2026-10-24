import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isHungerNotice } from "@/components/game/hunger-notice";
import type { LifeNotice } from "@/game/career/types";
import { LIFE } from "@/game/life/content";

function notice(partial: Pick<LifeNotice, "id" | "action"> & Partial<LifeNotice>): LifeNotice {
  return {
    day: 1,
    minute: 8 * 60,
    severity: "warn",
    icon: "icon_notif_event.png",
    text: "row",
    read: false,
    ...partial,
  };
}

describe("isHungerNotice", () => {
  it("matches the rows tickFullness writes, and either stable field on its own", () => {
    expect(
      isHungerNotice(
        notice({
          id: "fullness-hungry-1-0",
          action: "eat",
          text: LIFE.fullness_hungry_notice,
          icon: "icon_notif_event.png",
          severity: "warn",
        }),
      ),
    ).toBe(true);
    expect(
      isHungerNotice(notice({ id: "fullness-starving-1-0", action: "eat", text: LIFE.fullness_starving_notice })),
    ).toBe(true);
    expect(isHungerNotice(notice({ id: "meal-offer", action: "eat" }))).toBe(true);
    expect(isHungerNotice(notice({ id: "fullness-hungry-3-1", action: null }))).toBe(true);
    expect(isHungerNotice(notice({ id: "hunger-1-0", action: null }))).toBe(true);
  });

  it("keeps the low Sức khỏe row and every other action", () => {
    expect(
      isHungerNotice(
        notice({
          id: "sick-1",
          action: "sleep",
          icon: "icon_notif_sick.png",
          text: `Sức khỏe dưới ${LIFE.sick_below}.`,
        }),
      ),
    ).toBe(false);
    expect(isHungerNotice(notice({ id: "rent-1", action: "payRent", text: "Trả trọ." }))).toBe(false);
    expect(isHungerNotice(notice({ id: "jobs-1", action: "viewJobs" }))).toBe(false);
    expect(isHungerNotice(notice({ id: "shop-1", action: "openStore" }))).toBe(false);
    expect(isHungerNotice(notice({ id: "info-1", action: null, text: LIFE.fullness_hungry_notice }))).toBe(false);
  });

  it("drops hunger rows from the listed unread count", () => {
    const rows = [
      notice({ id: "fullness-hungry-1-0", action: "eat", text: LIFE.fullness_hungry_notice }),
      notice({ id: "sick-1", action: "sleep", text: `Sức khỏe dưới ${LIFE.sick_below}.` }),
      notice({ id: "rent-1", action: "payRent", read: true }),
    ];
    const listed = rows.filter((row) => !isHungerNotice(row));
    let unread = 0;
    for (const row of listed) {
      if (!row.read) unread += 1;
    }
    expect(listed.map((row) => row.id)).toEqual(["sick-1", "rent-1"]);
    expect(unread).toBe(1);
  });

  it("is what the panel uses for the list and the badge", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/game/NotificationsPanel.tsx"),
      "utf8",
    );
    expect(source).toContain("isHungerNotice");
    expect(source).toContain("notices.filter((notice) => !isHungerNotice(notice))");
    expect(source).not.toContain("unreadCount");
  });
});
