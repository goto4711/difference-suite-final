# Machine Room

**Route:** `/machine-room` · **Model:** none — observes and configures the inference engine · **Key dependencies:** `machineRoomStore` (Zustand ring buffer), `machineNarrator`, `TransformersClient` (`clearModelCache`), `modelRegistry` (`getModelsForTask`) · **Archival site:** cross-cutting (material culture of AI) · **Try it with:** open it after running any model-backed tool (e.g. Visual Storyteller on `images/animals/`)

---

## Keyword Translation

**Opacity → Transparency (of the apparatus itself)**

Every other tool turns deep learning on cultural material. The Machine Room turns the suite on *itself*, surfacing what the inference engine is doing backstage — which models download, which are evicted, which fall back to a slower device, which time out or crash — and narrating these events in plain language rather than hiding them behind a spinner.

## Theoretical Context

The DEEP CULTURE project insists that the "material culture of AI" — "what goes on inside the technology" (Born, 2022) — is a proper object of cultural critique, and that genuine public engagement requires tools that resist black-boxing. Commercial systems work hard to make their machinery disappear: latency is smoothed, fallbacks are silent, the remote and local costs of computation are kept off-screen. The Machine Room refuses this concealment. It treats the operational life of the models — their fragility, their resource hunger, their failures — as something a non-expert has a right to see and reason about. This is contestability beginning at the infrastructure: you cannot contest what you cannot perceive.

## How It Works

The Machine Room renders a live **decision journal**. As the suite's `TransformersClient` loads and runs models, it emits typed **machine events** — `download`, `cache-check` (a model already on the machine — "no download needed"), `device-fallback`, `evicted`, `watchdog-timeout`, `worker-crash`, `cache-cleared`, and related kinds — into a session-only Zustand store (`machineRoomStore`), a ring buffer capped at 300 entries. Each event is passed through `machineNarrator`, which converts a terse technical record into a layperson sentence ("Found X already on this computer. No download needed."). Entries are timestamped, filterable by model, expandable to reveal raw detail; model names link out to their Hugging Face pages. A header tallies **session counts** of the five "fragility indicators" — downloads, fallbacks, evictions, timeouts, crashes. The journal itself is not persisted; it is session-only telemetry.

Beyond the journal, the Machine Room is also where the engine is **configured and managed**. A **Defaults panel** (`DefaultsPanel`) exposes two `<select>`s — the active **text-embedding model** and **ASR model** — populated from `getModelsForTask(...)` (the embedding list excludes loader-based models like CLIP); switching the embedding model wipes cached embeddings (since vectors from different models aren't comparable), and the panel says so. A **cache list** lets the user **clear a downloaded model** per entry (`clearModelCache(modelId)` + a trash control), emitting a `cache-cleared` event — so the same surface that *reveals* the model supply chain also lets the user *act* on it.

## Methods Setup

The methodological choices all serve the theoretical aim of making the apparatus contestable. *Plain-language narration* is the central move: a raw log of `device-fallback: webgpu→wasm` is technically transparent but practically opaque to the project's intended publics, so the narrator translates each event into a sentence that names a consequence ("this will run more slowly"). The decision to surface *fragility specifically* — evictions, timeouts, crashes — is itself an argument: where vendor dashboards advertise uptime and capability, the Machine Room foregrounds the seams, because the project's interest is in the points where "things could be otherwise" and where the system's limits, not its powers, are on display. Keeping the buffer *session-only and capped* is a deliberate non-feature: this is not surveillance of the user but a mirror they can switch off, and the cap encodes a refusal to accumulate. The model links to Hugging Face make the supply chain concrete — these weights came from somewhere, and the user can go and look. Co-locating *model selection and cache-clearing* with the journal is deliberate too: the same screen that makes the apparatus legible also hands the user levers over it — choose a lighter or heavier model, or evict one from the machine — so transparency tips into agency rather than mere spectatorship. The method's limit is honest and worth stating: the Machine Room reports the events the client chooses to emit, so it is a curated window onto the engine, not a complete trace; its candour is real but bounded by what the instrumentation captures.

## Walkthrough

A workshop participant runs the Visual Storyteller on the `images/animals/` set, then opens the Machine Room. The journal shows Florence-2 downloading (hundreds of megabytes), loading into WebGPU, and — on a weaker laptop — a `device-fallback` to WASM with the narrator explaining the slowdown. Later, switching to a second large model, an `evicted` entry records that Florence-2 was unloaded to make room. The session counter ticks: one download, one fallback, one eviction. The participant, who has written no code, now grasps something concrete and political — that these tools are heavy, that the device matters, that running one model can displace another — and has language to discuss it.

## Critical Insight

The Machine Room reframes operational telemetry, normally an engineering concern, as a resource for public understanding. By narrating downloads, fallbacks and crashes in plain terms, it converts the hidden material substrate of deep learning into something a non-expert can witness, question, and hold onto. This is the precondition for the suite's wider politics of contestation: the apparatus is shown to be effortful, fragile and finite rather than seamless and omnipotent. To see the machine sweat is to stop mistaking it for magic — and to begin treating it as a built thing that could have been built, and could be governed, otherwise.
