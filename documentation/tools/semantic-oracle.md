# Semantic Oracle

**Route:** `/semantic-oracle` · **Model:** SmolLM2-135M-Instruct (Transformers.js v4, text-generation, WebGPU/WASM) · **Key dependencies:** `@huggingface/transformers` · **Archival site:** cross-cutting · **Try it with:** any text corpus, e.g. `difference-suite-testdata/texts/holocaust-texts/`

---

## Keyword Translation

**Relationality → Semantic understanding (oracular, not authoritative)**

In computing, an "oracle" is a theoretical device that answers undecidable questions. The Semantic Oracle inverts the trope. Running a small language model entirely in the browser, it offers not omniscience but suggestion — surfacing the gaps between computational "understanding" and human meaning, and inviting the user to treat its pronouncements as prompts rather than answers.

## Theoretical Context

The project resists two opposed temptations: awe at AI's apparent intelligence, and dismissal of it as mere statistics. The Oracle stages a middle path. By placing a genuinely generative model in the user's hands — but a *small* one, whose limits are quickly felt — it demonstrates both the reach and the brittleness of local language generation. Its framing as "oracular" is deliberate: an oracle's words are notoriously ambiguous, requiring interpretation. This casts computational reading as hypothesis, not verdict, and keeps human judgement in the loop.

## How It Works

The Oracle runs **SmolLM2-135M-Instruct** locally via Transformers.js; no prompt or corpus leaves the machine. It offers three modes, each a different prompt template wrapped around the user's input: **Define** ("Define and explain this concept clearly") for a straightforward gloss; **Expand** ("List 5 related concepts or hidden connections to") for lateral associations that map a term's semantic neighbourhood; and **Tangent** ("Write a creative, abstract metaphor describing") for a deliberately figurative, divergent reading. Output streams token by token, the loading time itself a reminder that the model is computing on the user's own device. A **mic button** beside the input opens the shared audio recorder (multilingual Whisper, with a language dropdown) and appends the transcript to the prompt — spoken input for those who'd rather dictate than type. The Oracle can also be pointed at the user's text corpus, drawing context from uploaded materials so its responses are grounded in the documents at hand rather than generic priors.

## Methods Setup

The most consequential methodological choice is the *deliberately small model*. SmolLM2-135M is not a compromise forced by the browser so much as an argument: where a large commercial system invites the user to outsource thinking, a visibly limited model keeps the human firmly in the interpretive seat, because its outputs cannot plausibly pass as authoritative. The *three fixed modes* operationalise different relations to meaning — definition (convergent), expansion (associative), tangent (divergent) — so the same term can be approached as something to be pinned down, mapped, or estranged; this is the keyword "relationality" turned into an interaction design. The *oracular framing* is itself a method for managing the model's unreliability honestly: rather than presenting generations as facts and apologising for hallucination, the tool reframes ambiguity and surprise as the point, which is both intellectually defensible and ethically safer with a small model prone to error. Optional *corpus grounding* lets the Oracle speak from the user's materials, aligning it with the project's preference for situated over generic knowledge. The honest limit is that SmolLM2 is genuinely weak — it will sometimes produce incoherent or wrong output — and the design's response is not to hide this but to position every response as a provocation requiring the researcher's judgement, never an endpoint.

## Walkthrough

A researcher studying colonial archives enters "civilising mission" and selects **Expand**. The Oracle returns a cluster of related terms — development, progress, trusteeship, modernisation — making visible how deeply a colonial vocabulary persists in ostensibly neutral language. Switching to **Tangent**, the same phrase yields a metaphor that estranges it, surfacing associations a literal definition would suppress and prompting reflection on the term's continued resonance. Grounding the Oracle in `texts/holocaust-texts/`, its expansions begin to echo the corpus's own vocabulary. The researcher reads these outputs not as findings but as provocations to think with, cross-checking each against the sources.

## Critical Insight

By framing AI interpretation as oracular — suggestive rather than definitive — the Semantic Oracle encourages users to treat computational readings as hypotheses requiring human judgement. Its deliberately small model is a feature, not a shortcoming: where a large system invites users to outsource thinking, SmolLM2's evident limits keep the human in the interpretive seat. The oracle's pronouncements are starting points for inquiry, not endpoints of understanding. Relationality, here, names the model's real capacity — to surface unexpected semantic neighbours and connections — held carefully apart from any claim to genuine comprehension.
