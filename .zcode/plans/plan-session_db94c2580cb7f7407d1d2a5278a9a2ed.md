# Sửa bug đi ngủ qua nửa đêm + rule phục hồi khi ngủ thiếu giờ

## Phần 1 — Bug ngủ qua nửa đêm bị mất cả ngày

**Vấn đề:** `sleepToNextMorning` ([src/game/time/clock.ts:217-230](src/game/time/clock.ts)) tính `wake = day × 1440 + 06:00` theo ngày lịch hiện tại. 1h sáng đã là "ngày 2" nên ngủ lúc 1h sáng ngày 2 → thức dậy 6h sáng **ngày 3**, mất trọn ngày 2.

**Sửa:** ngủ trong pha Đêm (00:00–05:59) → thức dậy **06:00 của cùng ngày**:
```ts
const dayIndex = snap.minuteOfDay < SLEEP_WAKE_MINUTE ? snap.day - 1 : snap.day;
const wake = dayIndex * MINUTES_PER_DAY + SLEEP_WAKE_MINUTE;
```
Các mắt xích đã kiểm chứng, không cần sửa: `hoursUntilWake` (tính tới 06:00 — vẫn đúng), `onWake → applyWake → resolveMorning` (idempotent theo ngày, ngày mới đã chạy bills lúc nửa đêm khi player còn thức), `SleepTransition` (dùng lại đúng hàm này cho cả animation lẫn landing), `maybeHospital`/`debugSkipDay` (công thức riêng, không đụng).

## Phần 2 — Rule phục hồi sức khỏe & thể lực khi ngủ (yêu cầu mới)

Vì luôn dậy 06:00, thời lượng ngủ = từ lúc nằm xuống tới 6h sáng. Thay đổi `applySleepRest` ([src/game/life/logic.ts:742](src/game/life/logic.ts)):

| Ngủ | Hồi phục thể lực | Sức khỏe | Tâm trạng mai |
|---|---|---|---|
| 7–9h+ (22:00–23:00) | bình thường | không đổi | không đổi |
| thiếu mỗi 1h dưới 7h | **−10%** tổng lượng năng lượng hồi phục | **−2** mỗi giờ thiếu | −5 ngày mai (rule sẵn có, giữ nguyên) |
| nhiều hơn 9h | không sao (energy vẫn cap theo health như cũ) | — | — |

Ví dụ: 00:00→6h (×0.9, −2 HP) · 01:00→5h (×0.8, −4 HP) · 02:00→4h (×0.7, −6 HP).

### Thay đổi cụ thể

1. **`config/life_sim.json`:**
   - `sleep_short_hours`: 6 → **7**
   - `sleep_short_health_per_missing_hour`: 4 → **2**
   - thêm key mới `sleep_energy_loss_per_missing_hour`: **0.1**
2. **`src/game/life/content.ts`:** thêm khai báo type `sleep_energy_loss_per_missing_hour: number` vào LIFE.
3. **`src/game/life/logic.ts` — `applySleepRest`:**
   - `missing = max(0, sleep_short_hours − hours)`
   - hệ số hồi phục `scale = max(0, 1 − sleep_energy_loss_per_missing_hour × missing)` áp lên **toàn bộ** gain gồm năng lượng theo giờ + bonus nội thất (giường/giặt đệm)
   - `health −= sleep_short_health_per_missing_hour × missing`
   - `moodPenaltyTomorrow += |sleep_short_mood_tomorrow|` khi thiếu giờ (cơ chế cũ, giữ nguyên — nếu muốn bỏ mục tâm trạng này nói lại khi duyệt plan)

## Tests cần cập nhật

1. **`tests/unit/time.test.ts`** — test `"increments the day when already past midnight"` (đang codify đúng bug): đổi thành ngủ 2AM ngày 2 → dậy 06:00 **ngày 2**, events `[hourChanged, phaseChanged, sleep]` (không có `dayStarted` vì cùng ngày). Thêm test biên ngủ 00:00 → 06:00 cùng ngày (6h). Test cũ 22:30 giữ nguyên.
2. **`tests/unit/life.test.ts`** — test `"sleeps 8h to full energy and punishes a 4h night"`: nhánh 8h giữ nguyên (100, không phạt); nhánh 4h đêm cập nhật số: energy 40 + (12.5×4)×0.7 = **75**, health 80 − 3×2 = **74**, moodPenaltyTomorrow vẫn 5; assertion `applyWake` mood `70−5−1` giữ nguyên.
3. **`tests/unit/store.test.ts`** — `applySleepRest(rested, 1)`: 1h ngủ → missing 6 → ×0.4 → energy = 10 + (12.5+5)×0.4 = **17**.
4. `knowledgeJobs.test.ts` (ngủ 22:00 = 8h) không đổi.

## Xác minh
1. `npx vitest run` — so baseline (176 pass / 1 fail audio có sẵn, 19 file fail collect do thiếu package 3D trong môi trường này).
2. `npx eslint` 2 file logic; typecheck so baseline 30 lỗi môi trường có sẵn.
3. Thủ công (nếu dev server chạy được): `?debug=1` → tua 1h sáng → Đi ngủ → dậy 06:00 **cùng ngày**, ngày không tăng, health giảm nhẹ theo số giờ ngủ.