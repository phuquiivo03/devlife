# Redesign devlife theo design pastel lavender (ảnh tham chiếu)

## Phân tích design đích (từ ảnh)
- **Nền**: pastel tím lavender nhạt → hồng nhạt, không còn gradient tím đậm + grid trắng.
- **Top bar**: 1 pill trắng bo tròn full-width — logo "devlife" trái · chip ngày/giờ (icon + `Ngày 6 · T5 · 18:40 · Chiều`) · chip tiền (icon + số dư) · nút chuông + nút âm thanh phải.
- **Trái**: 1 card scene TRẮNG bo góc lớn (~20px, shadow mềm) chiếm gần hết chiều cao/chiều ngang còn lại, chứa canvas phòng.
- **Phải**: sidebar ~360px gồm 3 card trắng: **Profile** (avatar pixel trong ô vuông bo tròn nền lavender, tên + rank, dòng "stage · rank", XP bar `Lv. N · a/b XP` màu mint), **Stats** (4 hàng: pill màu nhãn — Sức khỏe coral, Tinh thần mint, Năng lượng sky, No bụng amber — giá trị + thanh progress), **Actions** (grid 3×2: Ăn, Chơi game, Đi ngủ, Học, Việc làm, Kỹ năng + nút **Cửa hàng** amber full-width).

## Quyết định đã chốt (user + phán đoán)
- Giữ **font Galmuri pixel** (7/9/11) toàn UI; terminal giữ nguyên style CRT.
- Giữ **PixelIcon/PixelAvatar** (tài sản pixel 44px/48px); **PixelButton bỏ skin 9-slice bitmap, đổi sang skin CSS tròn mềm** (toàn project tự đồng bộ).
- Restyle **toàn project** (shell + mọi modal/popup) + cập nhật `docs/design/DESIGN_SYSTEM.md`.
- Scene: **2D pixel làm mặc định** như hiện tại, card to như ảnh; **3D R3F vẫn sau `?3d=1`** (đổ đầy card khi bật).

## Bước 1 — Design tokens mới (`src/app/globals.css`)
- `--background-gradient` → pastel nhạt: `#E9E4F6 → #F5EBF7 → #FBEFF3` (135deg); `.devlife-page-bg` bỏ grid trắng, thêm radial glow rất nhẹ; giữ nguyên tên class.
- Panel: `--panel-bg: #FFFFFF`, `--panel-border: #E7DFF2`, `--radius-panel: 20px` (card) + `--radius-chip: 999px`; shadow mềm lavender `0 8px 24px rgba(124,107,217,0.14)`.
- Giữ accent coral/mint/sky/amber (khớp màu pill trong ảnh); **thêm** tint nền pill cho 4 stat + amber-soft cho nút Cửa hàng; `--tab-lavender` nhạt lại.
- Retire các class chamfer/9-slice khỏi shell (`.room-frame-glow`, `.chamfer-frame-*`, `.panel-frame-*`…): thay bằng card tròn. Giữ `.store-frame`/`.life-*` cho phần canvas in-game (không đụng).
- Xuất **design token sheet** (bảng màu/radius/shadow) vào DESIGN_SYSTEM.md ở Bước 6.

## Bước 2 — PixelButton skin tròn (`src/components/ui/button/`)
- Giữ nguyên API (`primary | secondary | light | danger | icon`, press-shift, focus ring, `data-testid`).
- Bỏ `--btn-img*` (bitmap 9-slice); vẽ bằng CSS: bo 12–14px, fill trắng/lavender nhạt viền `#E7DFF2` (secondary/light), primary tím `#7C6BD9` chữ trắng, danger coral, `icon` = ô vuông tròn trắng; press = `translateY(2px)`; icon pixel + label Galmuri giữ nguyên.
- Store, career, notices, food… tự ăn skin mới không cần sửa từng chỗ.

## Bước 3 — Shell layout mới (`src/components/game/GameShell.tsx`, `shell-layout.config.ts`, `shell-layout.module.css`)
- Cấu trúc desktop (lg+): `h-screen` container max-w-[1280px] → hàng TopBar → grid `[1fr_360px]` gap 20px, 2 cột cao bằng nhau (`min-h-0`), sidebar `overflow-y-auto` nội bộ → **bỏ** cơ chế đo `--shell-panel-h` bằng ResizeObserver (không còn cần card đo chiều cao; lược `shellPanelVars`/đo lường, giữ viewport cap).
- Mobile: stack TopBar → Scene → Stats → Actions → Profile/Skills (stats+actions gần scene để chơi được).

## Bước 4 — Component mới/phục dựng trong `src/components/game/`
- **`TopBar.tsx`** (phục dựng từ `RoomStatusBar`): pill trắng; logo trái; chip giờ (`game-clock` giữ data-attrs) + chip tiền (`hud-money`, StatFlash/StatFloaters giữ); phải: `NotificationsButton` + `AudioButton` dạng nút tròn. **StoreButton rời topbar** xuống Actions card.
- **`SceneCard.tsx`** (thay `RoomChamferFrame`/`PanelChamferFrame` ở shell): card trắng bo 20px, bên trong canvas 2D (mặc định, giữ logic SceneCanvas nguyên vẹn) hoặc `Scene3DLazy` khi `?3d=1`; nền trong card = plate lavender rất nhạt; `LifeRoomFx`, `LifeEventPopup`, `SleepTransition` giữ nguyên vị trí overlay; label stage thành pill nhỏ góc trên.
- **`StatsCard.tsx`** (dịch từ `HudVital` trong `PlayerHudCard.tsx`): 4 hàng pill nhãn màu + `value/max` + `StatBar`; **giữ nguyên** `hud-health/mood/energy/fullness` testid, blink cảnh báo, StatFX.
- **`ActionsCard.tsx`**: grid 3×2 gộp `HungerDock` (Ăn), `GameButton` (Chơi game), `SleepButton` (Đi ngủ), `CAREER_ACTIONS` (Học/Việc làm/Kỹ năng — giữ `open-study/open-jobs/open-skills`) dạng nút dọc icon pixel + nhãn; dưới cùng `StoreButton` amber full-width. Tooltip/aria giữ nguyên.
- **`PlayerInfoPanel.tsx` → tách**: đầu panel thành **ProfileCard** (avatar, tên, rank badge, stage · rank, XP bar; XP hiển thị tính-presentational từ `skillProgressList`: `Lv = tổng level`, `a/b = Σxp/ΣxpToNext`; Danh tiếng + Freelance thành hàng nhỏ); phần skills list thành card "Kỹ năng" riêng dưới cùng (giữ `player-skills` testid). Tabs `Nhân vật/Sửa phòng` chỉ hiện dev như hiện tại, style pill mềm.
- `TimeDebugPanel`, `CareerChrome` (debug board + modal career), `StoreModal`, `AudioPopup`, `NotificationsPopup`, `HospitalPopup`, `CharacterIntro`, `LoadingScreen`, `SleepTransition`: giữ logic, đổi chrome theo token mới (PanelCard/modal mới; bỏ viền border-image pixel phần chrome — frame 9-slice **trong canvas** không đụng).

## Bước 5 — Primitives (`src/components/ui/panel-card.tsx`, modal, tabs, tooltip)
- `PanelCard` → trắng, radius 20, border + shadow mới; thêm biến thể chip/pill.
- Modal backdrop nhạt lại (tím 25%), content radius 20. Tabs lavender nhạt. Không đổi hành vi.

## Bước 6 — Cập nhật docs
- Viết lại `docs/design/DESIGN_SYSTEM.md`: triết lý pastel mới, bảng token màu/radius/shadow, layout mới (topbar + 2 cột, mobile stack), skin nút tròn, map component mới, ghi chú "canvas exception" + terminal giữ nguyên, ghi nhận việc bỏ cap `ROOM_VIEWPORT_W` 480px theo redesign này.

## Bước 7 — Kiểm thử & xác minh
- `typecheck` + `vitest run` (baseline: 11 test fail sẵn từ trước — chỉ cần không tăng).
- Chạy dev server `:4317` (WSL, Node 22, wsl.exe non-login bash), screenshot desktop 1280 + mobile 390 bằng playwright borrow 1.59 / browser-use; đối chiếu trực quan với ảnh design.
- Rà e2e playwright liên quan HUD/topbar/store chạy qua.

## Rủi ro & giới hạn
- Canvas 2D hiển thị to hơn 480px → pixel to hơn (đúng bản sắc pixel, `image-rendering: pixelated` giữ); SceneCanvas không bị sửa.
- 3D vẫn thiếu 4 GLB wave2 (giữ ?3d=1, không phải mặc định).
- Không đổi game logic/state/store; chỉ UI layer.