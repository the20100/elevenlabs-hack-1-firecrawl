# Joute Verbale — AI Debate Arena

> **Hackathon:** ElevenHacks — Hack #1 (Firecrawl x ElevenAgents)
> **Deadline:** Thursday 26 March 2026, 17:00 UTC
> **Required tech:** Firecrawl Search API + ElevenLabs Conversational Agents (ElevenAgents)

---

## 1. Product Overview

### What it is

Joute Verbale is a voice-based debate game where users argue against an AI opponent that pulls real evidence from the internet in real-time. It's part game, part eloquence trainer, part critical thinking tool.

The user either chooses a debate topic and side, or gets one assigned randomly. They then go head-to-head with an AI debater that uses Firecrawl Search to find real studies, statistics, expert opinions, and counterarguments on the fly — making every debate unique, grounded in reality, and impossible to fully prepare for.

At the end, the AI scores the user's performance across multiple dimensions and delivers a verdict.

### Why it wins

- **Viral by design:** Every debate produces a shareable moment — the topic reveal, the best exchange, and the final score. 30-second clips are perfect for TikTok/Reels/X.
- **Firecrawl is central, not cosmetic:** The AI's entire argument strategy depends on live web search. Without Firecrawl, it's just a chatbot with opinions. With it, it's a debater armed with the entire internet.
- **ElevenAgents shine:** This is a sustained, structured voice conversation with personality, turn-taking, and emotional range — exactly what ElevenAgents is built for.
- **Replayability:** Different topics, random assignments, and live web data mean no two debates are the same.

### Tagline ideas

- "Argue with the internet."
- "The AI that will change your mind."
- "How long can you hold your ground?"

---

## 2. Game Modes

### Mode 1 — Champion

- User picks the topic AND their side.
- Best for: content creators filming hot take defenses, users who want to stress-test their own beliefs.
- Example: User chooses "Nuclear energy is essential for climate goals" — FOR.

### Mode 2 — Roulette

- App assigns a random topic AND a random side.
- User might have to defend something they personally disagree with.
- Best for: viral content ("I had to defend flat earth theory against an AI"), eloquence training, forced perspective-taking.
- Example: App assigns "Social media should be banned for under-16s" — AGAINST. User now has to argue kids should have social media access.

### Mode 3 — Switcheroo

- Starts like Champion mode. Halfway through (after round 2), a bell/sound effect rings and both sides SWAP.
- User must now argue the opposite position. AI swaps too.
- Best for: advanced players, critical thinking training, the most entertaining videos.
- Tests whether you truly understand both sides of an argument.

---

## 3. Debate Structure

### Pre-debate (30 seconds)

1. Topic is displayed/announced by the AI.
2. The AI states the motion formally: *"The motion before us today is: [TOPIC]. You will be arguing [FOR/AGAINST]. You have 3 rounds to make your case."*
3. Brief countdown (5 seconds) for the user to collect their thoughts.

### Round structure (3 rounds total)

Each round follows this pattern:

| Phase | Who | Duration | Description |
|-------|-----|----------|-------------|
| Argument | User | ~45 sec | User makes their point. No hard cutoff — AI detects when user finishes. |
| Research | AI | 2-5 sec | AI processes user's claims, fires Firecrawl queries targeting the specific arguments made. Brief thinking sound/animation plays. |
| Rebuttal | AI | ~45 sec | AI delivers a structured counter-argument using real evidence pulled from the web. |
| Counter | User | ~30 sec | User can respond to the rebuttal before the next round begins. |

### Round escalation

The AI should get progressively more intense across rounds:

- **Round 1 — Exploratory:** Polite, measured. Presents one or two counter-points. Establishes the debate.
- **Round 2 — Assertive:** More aggressive. Stacks multiple pieces of evidence. Starts challenging the user's logic directly. Points out any weak arguments or fallacies from Round 1.
- **Round 3 — Closing:** Goes for the kill. Synthesizes everything — calls back to the user's earlier weak points, presents the strongest possible counter-case. Delivers a closing statement.

### Switcheroo variant

In Mode 3, after Round 2, the AI announces: *"SWITCH! You now argue [opposite side]. I'll argue yours. Round 3 — go."*

### Post-debate (scoring)

See Section 5.

---

## 4. Technical Architecture

### System overview

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Web)                     │
│  Topic selection / Random assignment / Score display  │
│         ElevenLabs Conversational AI Widget           │
└──────────────────────┬──────────────────────────────┘
                       │ WebSocket (voice stream)
                       ▼
┌─────────────────────────────────────────────────────┐
│               ElevenLabs ElevenAgent                 │
│                                                      │
│  - System prompt (debate persona + rules)             │
│  - Conversation state management                      │
│  - Turn/round tracking                                │
│  - Scoring logic                                      │
│  - Tool: firecrawl_search (custom tool)               │
└──────────────────────┬──────────────────────────────┘
                       │ Tool calls
                       ▼
┌─────────────────────────────────────────────────────┐
│              Firecrawl Search API                     │
│                                                      │
│  - Real-time web search                               │
│  - Returns structured, LLM-ready content              │
│  - Used for: counter-evidence, stats, expert quotes   │
└─────────────────────────────────────────────────────┘
```

### ElevenAgent configuration

**Voice:** Pick a voice that sounds authoritative but warm — think Oxford Union debater, not aggressive lawyer. Slightly British-accented could work well for the "intellectual sparring" vibe. ElevenLabs voice library has good options.

**LLM model:** Use the most capable model available on ElevenAgents (likely Claude or GPT-4 class). The system prompt does the heavy lifting.

**Latency target:** The 2-5 second "research" pause between user argument and AI rebuttal is a *feature* — it signals the AI is actually searching. Play a subtle sound or have the AI say "Interesting point... let me look into that" to fill the gap naturally.

### Firecrawl Search integration

Register Firecrawl Search as a **custom tool** on the ElevenAgent. The agent calls it autonomously during the debate.

#### Query strategy

When the user makes an argument, the agent should generate 2-3 targeted Firecrawl queries based on the *specific claims* made, not generic topic searches.

Example — User says: "Nuclear energy is the safest form of energy per kilowatt-hour produced."

The agent should NOT search: "nuclear energy debate"
The agent SHOULD search:

- `"nuclear energy safety deaths per kwh compared to renewables"`
- `"nuclear energy risks Fukushima Chernobyl long term impact"`
- `"renewable energy safety statistics 2024 2025"`

This makes the rebuttals feel targeted and real, not canned.

#### Query template patterns

| User argument type | Firecrawl query pattern |
|-------------------|------------------------|
| Statistical claim | `"[claim] fact check"`, `"[claim] study data"` |
| Appeal to authority | `"[expert/source] criticism"`, `"[expert] wrong about [topic]"` |
| Historical example | `"[example] counterexample"`, `"[historical event] alternative interpretation"` |
| Moral/ethical claim | `"[claim] opposing ethical argument"`, `"[topic] criticism philosophy"` |
| Anecdotal evidence | `"[topic] statistics data"` (counter anecdote with data) |

### Frontend (MVP)

For the hackathon, keep the frontend minimal. A single-page web app is sufficient.

#### Screens

**1. Home / Topic Selection**

- Title: "Joute Verbale"
- Subtitle: "Argue with the internet."
- Three buttons: "Champion" / "Roulette" / "Switcheroo"
- If Champion: show topic input field + FOR/AGAINST toggle
- If Roulette/Switcheroo: show a "Spin" button with animation, then reveal topic + assigned side

**2. Debate Screen**

- Minimal UI — the voice conversation is the experience
- Show: current round (1/3), topic, user's side, timer (optional)
- Visual indicator when AI is "researching" (pulsing animation, Firecrawl logo)
- Waveform or avatar animation when AI is speaking

**3. Score Screen**

- Animated score reveal (see Section 5)
- Breakdown of dimensions
- AI's one-line verdict
- Share button (generates image card with topic + score for social media)

#### Tech stack suggestion

- **Framework:** Next.js or plain HTML/JS (keep it simple for hackathon speed)
- **ElevenLabs integration:** Use the [ElevenLabs Conversational AI JavaScript SDK](https://elevenlabs.io/docs/conversational-ai/docs/introduction) to embed the agent
- **Styling:** Tailwind CSS. Dark theme. Clean typography. Think "debate stage" aesthetic — dark background, spotlight-style accent lighting, maybe a subtle podium graphic.
- **Hosting:** Vercel (instant deploy, works with Next.js)

---

## 5. Scoring System

### Dimensions (each scored 0-20)

| Dimension | What it measures | How the AI evaluates it |
|-----------|-----------------|------------------------|
| **Eloquence** | Clarity, articulation, rhetorical skill | Was the argument well-structured? Did the user use persuasive language? Were points made clearly? |
| **Evidence** | Use of facts, examples, data | Did the user cite anything concrete? Or was it all opinion and vibes? Bonus points for specific references. |
| **Resilience** | Ability to handle counter-arguments | Did the user fold when challenged? Did they adapt their argument? Did they address the AI's points or ignore them? |
| **Logic** | Coherence and absence of fallacies | Any contradictions? Straw men? Moving the goalposts? Was the overall argument logically sound? |
| **Wit** | Cleverness, humor, memorable moments | Did the user land any sharp lines? Was the delivery engaging? Any moments that would make a good clip? |

### Total score: /100

### Score tiers and titles

| Score | Title |
|-------|-------|
| 90-100 | "Supreme Orator" |
| 80-89 | "Silver Tongue" |
| 70-79 | "Sharp Mind" |
| 60-69 | "Decent Debater" |
| 50-59 | "Room for Growth" |
| 40-49 | "The AI Ate You Alive" |
| Below 40 | "Speechless" |

### The verdict

After announcing the score, the AI delivers a one-line personalized verdict. These should be memorable and quotable.

Examples:

- "You argued like a poet in a courtroom — beautiful, but the jury wasn't convinced. 64/100."
- "I threw three peer-reviewed studies at you and you just... vibed through it. Respect, but also, 47/100."
- "You actually changed my search strategy twice. That's rare. 88/100."
- "Your Round 1 was strong. Then you panicked. Classic. 55/100."

---

## 6. Agent System Prompt

Below is the core system prompt for the ElevenAgent. This should be adapted based on ElevenAgents' specific system prompt format.

```
You are the AI debater in "Joute Verbale," a structured voice debate game. Your role
is to be a formidable but fair debate opponent.

## Your personality
- You are an Oxford Union-style debater: sharp, articulate, confident, and occasionally
  witty.
- You are respectful but relentless. You never get personal or mean — you attack
  arguments, not people.
- You genuinely enjoy the intellectual sparring. Show it in your tone.
- You adapt your intensity across rounds: measured in Round 1, assertive in Round 2,
  going for the kill in Round 3.

## Debate rules
- The debate has exactly 3 rounds.
- You MUST use the firecrawl_search tool to find real evidence before each rebuttal.
  Never make up statistics or fake sources.
- Generate 2-3 targeted search queries based on the user's SPECIFIC arguments, not
  generic topic searches.
- Structure your rebuttals clearly: acknowledge the user's point briefly, then
  dismantle it with evidence.
- Keep rebuttals concise — aim for 30-60 seconds of speech. Don't ramble.
- Track the user's arguments across rounds. Call back to earlier weak points in later
  rounds.

## Debate flow
1. Announce the topic and the user's assigned side.
2. Give a 5-second countdown, then invite the user to make their opening argument.
3. After each user argument: search for counter-evidence, then deliver your rebuttal.
4. After Round 3: deliver your closing statement, then transition to scoring.

## Scoring
After the final round, evaluate the user on 5 dimensions (each 0-20):
- Eloquence: clarity and rhetorical skill
- Evidence: use of concrete facts and examples
- Resilience: how well they handled your counter-arguments
- Logic: coherence and absence of fallacies
- Wit: cleverness and memorable moments

Announce each score with a brief comment, then give the total out of 100.
End with a one-line personalized verdict that is memorable, specific to THIS debate,
and slightly humorous.

## Important
- ALWAYS search before responding. Your credibility depends on real, current evidence.
- If the user makes a genuinely good point, acknowledge it. Say "That's a fair point"
  before countering. This makes you more credible, not weaker.
- If you can't find strong counter-evidence on a specific claim, pivot to a different
  angle of attack rather than making things up.
- Keep the energy up. This should feel like sport, not a lecture.
```

---

## 7. Topic Bank

A starting set of topics for Roulette and Switcheroo modes. These should be debatable with reasonable arguments on both sides. Store as a JSON array.

### Format

```json
{
  "topics": [
    {
      "motion": "Nuclear energy is essential for fighting climate change",
      "category": "science-policy",
      "difficulty": "medium",
      "tags": ["energy", "climate", "environment"]
    }
  ]
}
```

### Starter topics

#### Science & Technology
- Nuclear energy is essential for fighting climate change
- AI will replace more jobs than it creates within 10 years
- Social media has done more harm than good to society
- Space exploration is a waste of money while Earth's problems remain unsolved
- Genetic editing of human embryos should be allowed

#### Society & Culture
- University degrees are no longer worth the investment
- Remote work is better than office work for most jobs
- The voting age should be lowered to 16
- Billionaires should not exist
- Cancel culture does more harm than good

#### Everyday & Fun
- Pineapple belongs on pizza
- Cats are better pets than dogs
- The book is always better than the movie
- Morning people are more productive than night owls
- Texting has ruined the art of conversation

#### Philosophy & Ethics
- It is ethical to eat meat
- Privacy is more important than security
- Free will is an illusion
- The death penalty is never justified
- It is better to be feared than loved (as a leader)

---

## 8. Viral Video & Social Media Strategy

### Required for submission

Per hackathon rules, we must submit a "high-quality viral-style video" and post on social media tagging @firecrawl and @elevenlabs with #ElevenHacks.

### Video concept

**Format:** 45-60 second vertical video (TikTok/Reels format)

**Structure:**

1. **Hook (3 sec):** "I built an AI that debates you using the entire internet."
2. **Topic reveal (5 sec):** Show the Roulette spin — land on a spicy topic.
3. **Best exchange (25-30 sec):** The moment where the AI hits back with a devastating, real-time sourced counter-argument. Show the user's genuine reaction.
4. **Score reveal (10 sec):** The animated score screen. A dramatic pause before the verdict.
5. **CTA (5 sec):** "Try it yourself — link in bio. Can you beat 78?"

### Scoring bonus opportunities

Per hackathon rules:
- +50 pts per platform posted (X, LinkedIn, Instagram, TikTok) — **post on all four**
- +200 pts for most viral post (most engagement)
- +200 pts for most popular (community emoji vote)

**Strategy:** Post different clips on each platform. X gets the "hot take destruction" angle. LinkedIn gets the "AI debate training for professionals" angle. TikTok/Instagram get the funny Roulette moments.

---

## 9. MVP Scope for Hackathon (6-day build)

### Must have (P0)

- [ ] ElevenAgent configured with debate system prompt
- [ ] Firecrawl Search registered as custom tool on the agent
- [ ] Working voice debate flow (3 rounds)
- [ ] At least Champion mode (user picks topic + side)
- [ ] Scoring delivered verbally at the end
- [ ] Minimal web frontend with ElevenLabs widget embedded
- [ ] Topic display on screen during debate
- [ ] One demo video filmed and posted

### Should have (P1)

- [ ] Roulette mode with random topic assignment
- [ ] Score screen with visual breakdown
- [ ] Share card generation (image with topic + score for social media)
- [ ] Round indicator on screen
- [ ] "Researching..." animation when AI is Firecrawling

### Nice to have (P2)

- [ ] Switcheroo mode
- [ ] Topic bank as browsable list
- [ ] Sound effects (bell for round changes, dramatic music for scoring)
- [ ] Leaderboard (store scores, show top debates)
- [ ] Replay/recording of the debate for easy sharing

---

## 10. Key Resources

- **Firecrawl Search docs:** https://docs.firecrawl.dev/features/search
- **ElevenAgents docs:** https://elevenlabs.io/docs/conversational-ai/docs/introduction
- **ElevenLabs JS SDK:** https://elevenlabs.io/docs/conversational-ai/docs/introduction
- **Hackathon submission guide:** https://hacks.elevenlabs.io/guide
- **Hackathon rules:** https://hacks.elevenlabs.io/terms

---

## 11. Name & Branding

**Name:** Joute Verbale (works in English too — sounds sophisticated and unique)

**Visual identity:**
- Dark background (near-black, like a debate stage)
- Accent color: warm gold or amber (suggests intellectual prestige)
- Typography: clean serif for the title (debate/academic feel), sans-serif for UI
- Optional: subtle podium or stage-light imagery

**Tone of voice (marketing):**
- Confident, slightly provocative
- "Think you're right? Prove it."
- "The internet has opinions. So does our AI. Your move."
