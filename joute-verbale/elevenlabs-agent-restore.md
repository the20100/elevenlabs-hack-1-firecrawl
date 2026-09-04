# ElevenLabs agent — restore kit

**Purpose: make deleting the agent a two-way door.**

ELE-32 decision 3 says deleting the ElevenLabs agent is the only complete fix for
the unauthenticated-access exposure, but that it is a *one-way door* because "the
agent config is not in the repo (ELE-7 put it on the dashboard) so deletion loses
it."

That was too pessimistic. Most of the config either is already in this repo or is
readable from a public endpoint with no credentials. This file collects it, and
states honestly what is *not* recoverable.

Captured 2026-09-04 from `GET https://api.elevenlabs.io/v1/convai/agents/<agent_id>/widget`,
no credentials. Raw response: [`elevenlabs-widget-config.json`](./elevenlabs-widget-config.json).

Nothing here is a secret. Every value below is already served publicly to anyone
who asks — that is the exposure ELE-32 is about, not a new one. The agent ID has
shipped in the public client bundle since March.

---

## What is already recoverable

| Piece | Where it lives | Confidence |
|---|---|---|
| System prompt | [`elevenlabs-prompt-template.txt`](./elevenlabs-prompt-template.txt) (110 lines, dashboard paste source) | High — see drift note below |
| First message | `widget_config.first_message` in the JSON snapshot | Exact |
| Dynamic variable names | Sent from `src/app/debate/page.tsx:177-184` | Exact |
| `firecrawl_search` tool | Client tool, implementation at `src/app/debate/page.tsx:79-108`, registered at `:111-113` | Exact |
| Connection type | `websocket` (`src/app/debate/page.tsx:176`) | Exact |
| Language, text-input, widget skin, terms text | JSON snapshot | Exact |

### Dynamic variables

The client sends exactly six. The prompt template and the first message together
consume all six, so the contract is closed:

| Variable | Value sent | Used by |
|---|---|---|
| `topic` | debate motion | prompt + first message |
| `user_side` | `FOR` \| `AGAINST` | prompt + first message |
| `ai_side` | the opposite | prompt + first message |
| `total_rounds` | `6` (`TOTAL_ROUNDS` in `src/lib/debate-prompt.ts`) | prompt + first message |
| `mode` | `champion` \| `roulette` \| `switcheroo` | prompt |
| `switcheroo_instructions` | `ACTIVE — ...` \| `INACTIVE` | prompt |

### The `firecrawl_search` tool declaration

Register on the dashboard as a **client tool** (not a server webhook — the browser
calls our own route same-origin; the dashboard never holds the Firecrawl key):

- Name: `firecrawl_search`
- Parameters: one required `query`, type `string`
- Returns: `string` — `JSON.stringify` of the results array

## What is genuinely lost on deletion

These are dashboard-only picks, not readable from the public endpoint and not
recorded anywhere in this repo. Whoever recreates the agent has to re-choose them:

1. **Voice ID** — no record of which voice was selected.
2. **LLM model and temperature** — no record.
3. **ASR / turn-taking / latency settings** — no record.
4. **The override lock.** `src/app/debate/page.tsx:189-190` notes that ElevenLabs
   config blocks `overrides.agent.prompt` and `overrides.agent.firstMessage`. That
   is a dashboard security setting and it must be re-applied, or the client-side
   `sendContextualUpdate` workaround at `:191` stops being necessary and the
   security posture silently changes.

None of the four is tuned as far as any issue records; all four are minutes of
work to re-pick. **The irreversible part of deleting the agent is a handful of
default-ish settings, not the product.** Decision 3 should be re-costed with that
in mind.

---

## Drift: the dashboard first message contradicts the repo prompt

Flagging, not asserting. The captured `first_message` ends:

> ...We will have {{total_rounds}} rounds of debate. Round 1 begins now. Collect
> your thoughts... Go.

That hands the floor to the user. The prompt template's *Introduction + Opening
Argument* section says the opposite, explicitly:

> Do NOT just say "Go" and wait passively. You fire first.

The first message is spoken verbatim before the prompt's flow takes over, and
`overrides.agent.firstMessage` is blocked, so the client cannot correct it. This
looks like ELE-12 / ELE-19 ("add an introduction step", "the AI must fire an
opening argument") landing in the repo but never being re-pasted onto the
dashboard.

**Not verified**: whether the agent recovers and delivers its opening argument
anyway. Confirming that needs a live, paid conversation, so it stays a flag.

Corroboration that the template *is* the dashboard source: the first message's
wording tracks the template's Introduction steps 1–4 almost verbatim. That is
evidence the dashboard was configured from this file, not proof the two are in
sync today. Anyone with dashboard access should diff them.

---

## Restore procedure

1. Create a Conversational AI agent.
2. Paste `elevenlabs-prompt-template.txt` as the system prompt.
3. Paste `widget_config.first_message` from the JSON snapshot as the first message.
4. Add the `firecrawl_search` client tool per the declaration above.
5. Apply language / text-input / widget values from the JSON snapshot.
6. Re-block prompt and first-message overrides.
7. Re-pick voice, model, and turn-taking settings — these are the lost ones.
8. Put the new agent ID in `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` on Vercel Production.
   Use `printf`, not `echo` — a trailing newline is how ELE-28 happened.
9. **Set `enable_auth` and a hostname allowlist this time**, and set the account
   spend cap. That is the whole point of ELE-32; recreating the agent without
   them reopens the same tap.
