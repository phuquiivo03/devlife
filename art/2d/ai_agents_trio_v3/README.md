# AI agent trio v3 — art source

Source files for the three AI agent portraits. Runtime exports live in `public/icons/agents/`. Provenance, prompts and non-affiliation: [`docs/design/ai-agents/CREDITS.md`](../../../docs/design/ai-agents/CREDITS.md) and [HANDOFF.md](HANDOFF.md).

Per stable ID (`claude_inspired`, `cursor_inspired`, `copilot_inspired`):

- `<id>_generated_original.jpg` — unchanged generator output, JPEG RGB 1024×1024 on magenta chroma.
- `<id>_master_1024.png` — clean normalized RGBA master. Re-export 512/256/64 from this with a premultiplied-alpha resize.
- `<id>_alpha_mask.png` — editable grayscale removal mask.

`contact_sheet.png` is the sheet the PM approved. `qa.json` and `TRIO_2D_ASSET_VALIDATION.json` are the technical checks. HANDOFF.md predates the PM review and may still say approval is pending; CREDITS.md has the current status.
