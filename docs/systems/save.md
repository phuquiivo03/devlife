# Save

One career document lives in `localStorage` under `devlife:v1`. Zustand persist stores `version` and runs `migrate`. The current number is `PERSIST_VERSION` in `src/game/config.ts`. The tables are [`docs/db/schema.sql`](../db/schema.sql).

## Standing rule

Every schema change bumps the persist version and adds a migration in `src/game/storage/migrate.ts`.

A schema change is a new or renamed column in `docs/db/schema.sql`, or a new required field on the persisted career document. A new optional field is still a schema change: existing saves must load through `migrateSave`.

The migration keeps money, skills, and progress, and fills every new field with a default. Players never need to clear storage.

Version notes sit next to `PERSIST_VERSION`. Version 8 is the store (owned items and the pin). A save from before the store owns nothing and wakes in the student room. Junior and senior rooms are bought in the store. Version 9 adds `cue` on a notice; a version 8 notice migrates with `cue` null and keeps the id and severity sound rules. Version 10 was a short-lived room grant that was reverted, so it is not reused. Version 11 adds `players.trait` and `life.homeDays`. That version wrote Cẩn thận, and home days start at 0. Version 12 adds `players.traitRolled`. A save that has not been rolled gets one random trait, including a version 11 Cẩn thận, and the flag is stored so a later load does not roll again. A version 11 save whose trait is already one of the other five keeps that trait and is marked rolled. Version 13 adds `players.introSeen`. A save from before that has already started, so the creation popup stays closed. Version 14 adds `feed.purse` (earned, food, rent, shop, other). A save from before that starts with an empty purse. Version 15 adds `life.slotsSinceMeal`. A save from before that starts at 0. Version 16 adds `sleptDay` and `sleptAt` on an open diary. A save from before that leaves both empty. Version 17 adds notice `actions` and `payload`, and `life.jobNoticeSlots`. A legacy `action` string becomes one `{ id, label }` button. An older `jobId` moves into `payload.jobId`. The slot counter starts at 0. Version 18 turns an offered or in-progress job into an accepted job and recomputes its deadline from the day in the save (easy 2, mid 3, hard 4). Finished, failed, and expired jobs stay as they were. Money, skills, shop, room, pay, progress, and the task run stay as the earlier rules left them.
