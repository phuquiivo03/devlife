# Art backlog (from Milestone 1 plan)

## M5.4 Chơi game
- icon_btn_game.png 24×24 + icon_btn_game_x2.png 48×48 in public/ui/m5_1/
- sprite nhân vật đang chơi game (hiện dùng lại tư thế ngồi bàn CHAR_POSE_SIT_BACK)

## Redraw at native scale (priority)

Junior bed, desk, and wardrobe are redrawn (see `composite_junior_shadow.png`). Their shadows shipped with that drop.

## Resample quality

- **senior/rug** (×1.71), **senior/bookshelf** (×1.50), **senior/standing_desk** (×1.41), **student/mattress** (×1.40)
- **junior/mouse** (×0.40), **mug** (×0.51), **plant_small** (×0.53), **poster_2** (×0.58)

## Constraints

- All **frame/poster** assets are front-on — use on back wall only until angled art exists.
- Consider split **chair_back** / **chair_front** layers to replace runtime `overlayFromY` cropping.
