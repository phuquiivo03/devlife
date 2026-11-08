# AI Agent trio — design pack

Final design pack for the AI coding agent feature: three in-game agents bought with game money in a dedicated shop tab. **Not implemented yet.** The implementation plan is [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

| File | Content |
| --- | --- |
| [SPEC.md](SPEC.md) | Vietnamese flow, state, save and acceptance spec (draft revision 3, imported as delivered from `DRAFT_AI_CODING_AGENT.md`) |
| [BALANCE.md](BALANCE.md) | Price, time multiplier `m`, per-potential-bug survival `q`, worked timing examples (from `BALANCE_TRIO.md`) |
| [ART_BRIEF.md](ART_BRIEF.md) | Image-only brief and PM contact-sheet review |
| [CREDITS.md](CREDITS.md) | Asset provenance, non-affiliation, validation, file locations |

| Stable ID | Name | Price | `m` code & fix | `q` per potential bug |
| --- | --- | --- | --- | --- |
| `claude_inspired` | Mọt Mơ | 900.000đ | 0.90 | 0.25 |
| `cursor_inspired` | Vút Vít | 1.200.000đ | 0.55 | 0.80 |
| `copilot_inspired` | Kính Bay | 180.000đ | 1.10 | 0.60 |

The spec files were written outside this repo and still use the authoring box paths (`/workspace/devlife-art/...`, `/workspace/devlife-ai-agent-design/...`). In this repo those map to `art/2d/ai_agents_trio_v3/` and `docs/design/ai-agents/`. The spec's repo facts were read at `main` `b697ba3`; the implementation plan re-checks them against the code.

Notion: https://app.notion.com/p/412cc1496369811391c4db0812129341
