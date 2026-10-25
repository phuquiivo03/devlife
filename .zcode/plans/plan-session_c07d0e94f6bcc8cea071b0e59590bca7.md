# Nối canvas 3D vào loadout (render theo slot/variant)

## Mô hình

- **Baseline (loadout trống)**: canvas 3D giữ nguyên hiện trạng — manifest base + owned-gating từ task trước. Loadout chỉ override khi người chơi **chủ động** đặt đồ.
- **Slot resolution** (pure function, dễ test): cho mỗi slot của phòng hiện tại, đọc entry theo convention mới `slot.id in loadout ? loadout[slot.id] : slot.default` — entry `null` (nút "Không"/switch tắt) giờ là **ẩn thật** thay vì fallback default (sửa quirk `??` cũ trong CustomizePanel/owned-items).
- **Entry resolve GLB**: catalog id → GLB qua map (11 exact + các closest đã dùng ở owned tab: folding_table→table_folding, plastic_stool→stool_plastic, fan→fan_standing, bedside_cabinet→nightstand, noodle_cup→cup, office_chair→ergo_chair); entry `store:<id>` → GLB qua STORE_TO_KEY. Entry không có GLB (mouse, poster_1, bookshelf…) → **giữ base model** của slot (không mất đồ).
- **Store items tham gia slot**: thêm `category` vào `config/store.json` (bed_vip/mattress/bed_floor_mat=bed, ergo_chair/stool_plastic=chair, monitor2=display, plant_big/fan_standing/books_stack=floor_decor, nightstand=cabinet, kettle=appliance, mug=cup, keyboard=keyboard, plant_small=desk_plant, fairy_lights=wall_hanging, poster_vn=wall_art). `aircon`, `lamp_desk` không category → giữ owned-tự-hiện. Mode đè/trả: **overlay** cho mattress (nệm đè giường), monitor2 (màn 2 cạnh màn chính); còn lại **replace**.
- **Slot chưa đụng + owned item tự-thay** (ergo_chair thay chair_plastic, bed_vip thay bed): giữ nguyên hành vi hiện tại.

## Thay đổi file

1. **`config/store.json`** + **`src/game/life/furniture.ts`**: thêm `category` vào StoreItem, pass qua STORE_ITEMS.
2. **`src/game3d/slot-models.ts` (mới)**: `CATALOG_TO_GLB`, `SLOT_BASE_MODEL` (bed→bed, desk→desk, seat→chair_plastic, display→monitor, keyboard→keyboard, cup→cup, cabinet→nightstand, cabinet_top→kettle, decor_1→fan_standing, decor_3→books_stack, desk_plant→plant_small), mode overlay/replace cho store items, `POSITION_OVERRIDES` (student.mattress thay slot bed → vị trí sàn thay vì vị trí overlay trên giường), và resolver pure `resolveRoomFurniture(slots, loadout, owned, floorPose)` → { visibleKeys, hiddenKeys, positionOverrides }.
3. **`src/game3d/Furniture.tsx`** (viết lại render loop): dùng resolver thay các rule cứng ergo_chair/bed_vip; room_shell luôn hiện; stage0/floor-pose giữ nguyên (kể cả stage0.hide).
4. **`src/components/game/CustomizePanel.tsx`**: convention null-off mới; variants của mỗi slot = catalog (slot.accepts) **+ store items đã mua có category khớp** (id dạng `store:<id>`); **`ItemThumb`** thêm prop `imageUrl` — store variants render icon 3D thay vì canvas atlas pixel.
5. **`src/components/game/owned-items.ts`** (viết lại): bỏ phụ thuộc `placementRows`; store item phân loại theo `category`, tìm slot bằng `findAcceptingSlotsByCategory`; status "Đang dùng" = `loadout[slot] === "store:<id>"` (hoặc catalog id); tab đặt/gỡ store item qua category. **`StorePanel.tsx` OwnedCard**: activate → `onActivate(slot.id, "store:<id>")`.
6. **Xoá 2D dead**: `src/game/life/placement.ts` + `placement.json` + test block "store placement" trong `tests/unit/store.test.ts` (storeDrawEntries/notSold/replacedItemIds không còn người dùng sau bước 5).
7. **Tests**: mới `tests/unit/slot-models.test.ts` (untouched base; null ẩn; replace/overlay; catalog map GLB; entry không GLB giữ base; ownership); cập nhật `owned-items.test.ts` (status theo loadout store: prefix, đặt qua category); giữ các test store/migration khác.

## Không đổi

- `usePlayerPose` (floor-pose theo owned monitor2/ergo_chair), migrate/PERSIST_VERSION (loadout cũ vẫn hợp lệ), Scene3D/RoomShell/manifest positions (dùng lại vị trí manifest theo GLB key).

## Kiểm chứng

`tsc` + `pnpm lint` + `pnpm test` (baseline 3 fail: audio, life, notice-actions) — không phát sinh fail mới; chạy lại e2e `game.spec.ts` (mở customize qua phím `c`, toggle vẫn persist).