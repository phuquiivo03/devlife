# Biến 3D thành chế độ duy nhất (xoá bản 2D)

Nguồn sự thật đã xác minh: `src/components/game/GameShell.tsx:56` là nơi duy nhất đọc `?3d=1`; mọi rẽ nhánh 2D/3D đều đi qua `is3d` trong file này.

## 1. `GameShell.tsx` — 3D luôn bật, xoá nhánh 2D
- Bỏ `const is3d = searchParams.get("3d") === "1"` và import `SceneCanvas`; luôn render `<Scene3DLazy debug={debug} />`.
- `theme-clay` áp dụng ở cả 3 wrapper (loading / hydration / shell); `TopBar` luôn `clay`; `SceneCard` luôn `bare`.
- Label phòng: chỉ hiện khi `debug` (giữ hành vi 3D hiện tại).
- Sidebar: giữ duy nhất nhánh 3D — `.clay-side-block` (CustomizePanel khi `customizeOpen`, else ProfileCard + StatsCard `embedded` + ActionsCard, hết `clay`/`clay embedded`). Xoá nhánh `Tabs` 2D, type `SidebarTab`, state `sidebarTab`, effect đồng bộ tab, và `setSidebarTab("edit-room")` trong hotkey `c` (giữ `setCustomizeOpen(true)`). Xoá import Tabs.
- Đo `panelHeightPx` bỏ gate `is3d`; `--shell-panel-h` áp khi có số đo (giữ inline var — test cấm chuỗi `shellPanelVars`).
- `SkillsCard` chỉ render khi `debug`.
- Giữ nguyên chữ dòng `useStatFx(hydrated && assetsLoaded); // useStatFx(hydrated)` và các chuỗi `<SceneCard`, `<TopBar`, `data-side-panel="player"`, `lg:grid-cols-[minmax(0,1fr)_360px]` (tests kiểm tra source-string).
- Cập nhật comment dòng 36 (three vào bundle thế nào) — `useSearchParams` vẫn cần cho `debug`/`stage`.

## 2. `LifeStage.tsx`
- `LifeRoomFx` bỏ prop `is3d`, bỏ `lifeEmote` + khối `<img>` emote (chỉ tồn tại cho 2D); giữ life bubble.

## 3. Xoá file 2D-only (grep import trước khi xoá, typecheck làm lưới an toàn)
- `src/components/game/SceneCanvas.tsx`, `src/components/game/life-emote.ts`
- `src/game/render/{canvasRenderer,atlas,hitTest}.ts`, `src/game/layout/{resolveScene,sort}.ts`, `src/game/view/{computeView,camera}.ts`, `src/lib/chamfer-frame.ts`
- `src/app/debug/` (page + DebugCanvas — dev tool trên engine 2D)
- `scripts/3d/verify-split.mjs` (kịch bản kiểm split 2D/3D, không còn ý nghĩa)
- Tests chết: `tests/unit/{computeView,resolveScene,chamferFrame,life-emote}.test.ts`
- Không đụng pipeline asset sprite (`scripts/assets/*`, `public/atlas/*`, `src/game/content`) — để follow-up dọn riêng nếu cần.

## 4. `LoadingScreen.tsx`
- Bỏ 2 task preload atlas (`/atlas/devlife.json` + `.png`, chỉ phục vụ 2D); giữ 2 task audio manifest + offsets (dùng chung). Progress tính theo độ dài mảng tasks nên tự đúng.

## 5. Docs + comment
- `docs/design/DESIGN_SYSTEM.md`: mục "2D pixel canvas is the default; R3F stays behind ?3d=1" (~dòng 105) và "## 3D shell palette (?3d=1)" (~dòng 206) → viết lại theo 3D-only.
- Comment `src/game3d/Scene3D.tsx` (~dòng 150) về flag `?3d=1` → cập nhật.

## 6. E2E `tests/e2e/game.spec.ts`
- Test 1 (assert `data-scale` — attr chỉ canvas 2D đặt): viết lại cho 3D (canvas render + sidebar `.clay-side-block` hiện).
- Test 2 (flow tab "Junior" → "Tùy chỉnh" → "Bàn nâng hạ" → reload): 3D không có Tabs — mở customize qua hotkey `c` (hoặc nút tương đương trong sidebar nếu có), giữ phần assert persist.
- Test 3 `/debug`: xoá (trang đã bị xoá).

## 7. Kiểm chứng (WSL quirks: chạy qua `wsl.exe -d Ubuntu-20.04` non-login bash, Node 22 nvm)
- `pnpm typecheck`, `pnpm lint`, `pnpm test` — so với baseline 6 test fail sẵn có, không được phát sinh fail mới.
- `pnpm build` + chạy thử trang `/` (port 4317 bị chiếm thì dùng 4318) để xác nhận 3D render mặc định, không còn tham chiếu atlas 2D.
- `pnpm test:e2e` cho `game.spec.ts` đã viết lại (playwright chromium executablePath quirks trong memory).