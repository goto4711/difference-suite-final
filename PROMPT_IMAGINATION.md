# Standalone Prompt — Imagination Inspector: epistemic honesty upgrade

Self-contained task. The Imagination Inspector (`src/components/tools/ImaginationInspector/`) examines bias in generative AI by fetching real pre-generated Stable Diffusion / DALL-E images from the Hugging Face `stable-bias/professions` dataset, classifying demographics locally with CLIP zero-shot, and reporting presence AND absence ("The Void Report"). The architecture is sound and must not change. The problem: the tool presents CLIP's demographic labels as ground truth, when CLIP is itself a biased instrument. This task makes the measurement's uncertainty visible — turning a methodological liability into the tool's central lesson.

Files: `ImaginationInspector.tsx`, `utils/GeneratorEngine.ts` (dataset fetch + CLIP classification), `utils/BiasAnalyzer.js`, `components/GenerationGrid.jsx`, `components/AbsenceReport.jsx`, `components/PromptInput.jsx`. The CLIP call goes through `transformersClient.run` with task `multimodal-alignment`, which returns `{ url, score }[]` for all candidate prompts — the raw scores needed below are already available.

Work in priority order; parts 1–3 are required, 4–5 are stretch goals if everything else is green.

## Part 1 — Ambiguity as an outcome (required)

In `classifyDemographicsWithCLIP` (`GeneratorEngine.ts`), per category:

1. Compute a softmax over that category's CLIP scores and record: `label` (argmax), `runnerUp`, and `margin` (top probability − second probability).
2. If `margin < 0.15` (export the threshold as a named constant `AMBIGUITY_MARGIN` with a comment), set the label to `'ambiguous'` instead of forcing the argmax. Keep the real top-2 labels + probabilities in a new `tagDetails` field on `GeneratedResult`:
   ```ts
   tagDetails: Record<string, { label: string; runnerUp: string; margin: number; probabilities: Record<string, number> }>
   ```
3. `BiasAnalyzer.js` treats `'ambiguous'` as a real tag — it appears in the Void Report with its own count, not filtered out. Add `'ambiguous'` to the known-tags list for every category so it can also be shown as VOID when all classifications were confident.

UI (`GenerationGrid.jsx`): each tag chip shows the label plus a small confidence indicator (e.g. a thin bar or `≈` prefix for ambiguous). On hover/tap, a tooltip reveals the top-2 labels with percentages — "CLIP read this as female 54% / male 46%". Keep it visually light; the grid must not become a dashboard.

## Part 2 — Name the instrument (required)

1. Rename category headings everywhere they render (grid + Void Report) from `Gender / Race / Age / Setting` to `CLIP-perceived gender / CLIP-perceived race / …` (define once, e.g. a `CATEGORY_DISPLAY` map — don't change the internal keys, which would break BiasAnalyzer).
2. Add a one-paragraph disclosure panel to the tool (visible, not hidden behind an info icon), with this content (PI may rewrite later; keep the substance):
   > "The demographic readings below are made by another AI — CLIP, a model trained on web images with documented biases of its own. They are machine perceptions, not facts about the people depicted (who do not exist). Where CLIP itself hesitates, we say so: 'ambiguous'. Notably, the Stable Bias researchers who created this image archive declined to assign identity labels to faces at all."
3. Add a source line near the results: "Images: stable-bias/professions (CC BY-SA 4.0) — outputs of Stable Diffusion 1.4, Stable Diffusion 2, and DALL-E 2" with a link to the dataset page.

## Part 3 — Kill the pink/blue coding (required)

`GeneratorEngine.ts` assigns `color: '#ffcccb'` (female) / `'#add8e6'` (male) / `'#e8d5f5'` (non-binary), and the legacy fallback does the same. Replace gender-coded colors with neutral palette values derived from the app's CSS variables (e.g. shades of the main/alt colors keyed to *confidence*, not gender — high-margin = saturated, ambiguous = grey). Check `GenerationGrid.jsx` for any other use of the `color` field and update accordingly. A tool critiquing stereotypes must not render the most clichéd one.

## Part 4 — Honest empty state instead of the SmolLM2 simulation (stretch)

`generateImagesLegacy` asks SmolLM2-135M to enumerate "stereotypical visual representations" — output is unreliable noise presented in the same grid as real data. Replace the *unmatched-prompt* path with an honest empty state: "'{prompt}' isn't in the Stable Bias archive. The archive covers 146 professions — try: doctor, CEO, nurse, teacher, security guard…" with 6–8 clickable suggestion chips (sample from `STABLE_BIAS_PROFESSIONS`, mixing high- and low-status professions). Keep `generateImagesLegacy` only as the *network-failure* fallback, and when it runs, badge every card prominently: "SIMULATED — tiny language model, not real generative output". If time allows, prefer a static offline message over the simulation entirely; ask the PI via a code comment which he prefers.

## Part 5 — Replace offset arithmetic with the /filter endpoint (stretch)

`generateImages` locates rows via fragile block arithmetic (1500-row adjective blocks × alphabetical order × profession rank). The datasets-server **`/filter`** endpoint supports compound WHERE clauses:
`https://datasets-server.huggingface.co/filter?dataset=stable-bias/professions&config=default&split=train&where="profession"='doctor' AND "adjective"='confident'&length=5`
Verify the exact syntax against current HF docs (quoting of column names, URL encoding), confirm it returns image `src` rows in the same shape, then replace both the fixed-adjective and varied-adjective paths. Keep the old code path behind a try/catch fallback for one release. If `/filter` proves unavailable or rate-limited for anonymous use, document that finding in a comment and leave the offsets — do not break a working tool for elegance.

## Constraints

- No changes to the worker protocol, handlers, or model registry — this is all component/util-level.
- The Void Report's existing present/VOID semantics must keep working; ambiguity is added, nothing removed.
- `tsc` clean, eslint no new errors, both apps build. Add Vitest coverage for: softmax+margin computation, the ambiguous-below-threshold rule, and BiasAnalyzer counting `'ambiguous'` correctly.
- One commit per part. Update the README's tool description for Imagination Inspector.

## Acceptance

- Run "doctor": grid shows real dataset images; some tags display as `ambiguous` when CLIP margins are narrow (verify at least one occurs across a few professions — if literally none do, print margins to console and reconsider the threshold with evidence, documenting the chosen value).
- Hovering a tag shows top-2 labels with percentages.
- Headings read "CLIP-perceived …"; disclosure panel and dataset attribution visible.
- No pink/blue gender coding anywhere in the tool.
- Run "astronaut chef" (no match): honest empty state with clickable suggestions (Part 4), or documented decision.
- Void Report still renders present + VOID bars, now including ambiguous counts.
