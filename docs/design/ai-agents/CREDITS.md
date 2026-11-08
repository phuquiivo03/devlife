# Credits and provenance — AI agent trio v3

Three original 2D mascot portraits for the in-game AI Agent shop: **Mọt Mơ** (`claude_inspired`), **Vút Vít** (`cursor_inspired`) and **Kính Bay** (`copilot_inspired`).

## Not affiliated

These are original fan-inspired devlife game characters. They are **not** official brand mascots, **not** a partnership, and **not** endorsed by Anthropic, Anysphere/Cursor, GitHub or Microsoft. No logo, wordmark, brand text or existing mascot artwork was copied. The old Copilot robot head, Octocat and Invertocat were explicitly excluded in the prompts.

The in-game prices, speed multipliers and bug rates in [BALANCE.md](BALANCE.md) are game balance only. They are not benchmarks or claims about any real product. The game makes no LLM API calls and has no tokens, subscriptions or real money.

This is a provenance statement, not a legal clearance opinion.

## How the art was made

- Generator: Cursor `GenerateImage`, one call per mascot, `aspect_ratio: 1:1`. Exact prompts, palettes and reference URLs are in [`art/2d/ai_agents_trio_v3/HANDOFF.md`](../../../art/2d/ai_agents_trio_v3/HANDOFF.md).
- References: the superseded v2 3D masters were used only for silhouette and palette. The v3 prompts reject their 3D look. No Blender, `.blend`, GLB or 3D scene was used for v3, and none is needed.
- The generator returned JPEG RGB 1024×1024 on a magenta chroma background. Those files are kept unchanged as `<id>_generated_original.jpg`.
- Alpha: chroma segmentation, largest component kept, interior filled, contaminated edge strip removed, antialias colour rebuilt from clean contours, premultiplied-alpha resize. No shadow or matte.
- Palette hexes are target anchors in the prompts. Shaded pixels are not guaranteed to match them exactly. Kính Bay uses the current GitHub parent-brand green, not a Copilot-specific palette.

## Review and validation

- PM viewed `contact_sheet.png` and accepted the 2D outlined illustration direction for owner (síp) review. That is art approval only; it does not approve prices, multipliers, bug rates or the shop gate.
- Validation (`art/2d/ai_agents_trio_v3/TRIO_2D_ASSET_VALIDATION.json`, `qa.json`): all nine runtime PNGs are RGBA at exactly 512/256/64, borders fully transparent, zero visible magenta-dominant pixels with alpha > 16. That is a technical rule and does not replace visual review.
- On import into this repo, all 55 files in the review archive matched the SHA-256 values in its `TRIO_2D_REVIEW_MANIFEST.json`. Runtime file hashes are recorded in [`public/icons/agents/manifest.json`](../../../public/icons/agents/manifest.json).

## Where the files live

| Purpose | Path |
| --- | --- |
| Runtime portraits (shipped) | `public/icons/agents/agent_<id>_{512,256,64}.png` + `manifest.json` |
| Art source (not shipped) | `art/2d/ai_agents_trio_v3/<id>/` — generated original JPEG, normalized `master_1024.png`, editable `alpha_mask.png` |
| Review artifacts (not shipped) | `art/2d/ai_agents_trio_v3/contact_sheet.png`, `HANDOFF.md`, `qa.json`, `TRIO_2D_ASSET_VALIDATION.json` |
| Design and balance | `docs/design/ai-agents/SPEC.md`, `BALANCE.md`, `ART_BRIEF.md` |

Left out of the repo on purpose: the nested art ZIP, `preview_sheet.png`, `previews/*`, the pre-normalization `cutout_master.png` files, and all v1/v2 history. They stay in the original review archive (`devlife-ai-agent-trio-2d-review.zip`).

License: art made for devlife by the devlife team with an AI image generator, approved for use in devlife, same as other in-house art.
