# Deep Time

**Route:** `/deep-time` · **Model:** none — pure mathematical simulation (no inference) · **Key dependencies:** `plotly.js-dist-min` · **Archival site:** Real-time archives (cross-cutting) · **Try it with:** any image from `difference-suite-testdata/images/animals/` (Diffusion Scrubber)

---

## Keyword Translation

**Temporality → Contingency**

Deep Time turns attention from *what* models output to *how* they handle time and memory. It exposes the architectural mechanisms — causal masking, scheduled noise, gradient decay — through which neural networks construct, compress and forget the past, and asks what is contingent in those seemingly inevitable mathematics.

## Theoretical Context

The project insists that the "material culture of AI" — what goes on inside the technology (Born, 2022) — is a proper object of cultural analysis. Deep Time takes this literally. Rather than running a model over cultural data, it lays bare the temporal logics that structure deep learning itself: how a transformer decides which past tokens a present token may attend to, how a diffusion model destroys an image on a fixed schedule, how a recurrent network's memory of early inputs decays as gradients vanish. These are not neutral givens but designed constraints, and seeing them is a precondition for understanding how AI renders time.

## How It Works

Deep Time is unusual in the suite: it loads **no machine-learning model** and sends nothing to inference. It operates on transparent mathematics, rendered through Plotly, across three modules. **Attention Lens** simulates the causal masking and attention decay of transformers, showing which positions in a sequence can "see" which others, and how that visibility falls off. **Diffusion Scrubber** visualises the forward-diffusion noise schedule on an image — the mathematically scheduled process by which a picture is progressively destroyed into noise, the inverse of what generative models learn to reverse — letting users scrub through the timesteps on their own image. **Memory Audit** runs pure-JavaScript backpropagation through time to expose the vanishing-gradient problem in RNNs and LSTMs, demonstrating numerically how recurrent networks forget.

## Methods Setup

Deep Time's refusal of inference is a methodological statement, not a limitation. Every other tool in the suite runs a trained model and inherits its opacity; Deep Time deliberately strips the model away so that nothing on screen depends on weights the user cannot inspect. The three modules compose a small anatomy of machine time, each chosen to denaturalise a different temporal operation. The Attention Lens shows *selective* time — the causal mask is a rule about which past a token may consult, so visualising it reveals "attention" as much prohibition as focus. The Diffusion Scrubber shows *destructive and recoverable* time — running the user's own image forward through the noise schedule makes vivid that generative models invert a precisely scheduled corruption, so apparent creation-from-nothing is mathematically reconstruction-from-noise. The Memory Audit shows *decaying* time — watching gradients shrink toward zero across a sequence is the formal signature of why recurrent networks forget their distant past. Because the modules are *exact rather than learned*, they are fully reproducible and fast, which makes Deep Time unusually well suited to teaching and public engagement: a non-expert can change the schedule or the sequence length and see the consequence immediately, with no black box to take on trust. The trade-off is equally clear — Deep Time explains mechanisms in idealised form; it is a model of the architecture, not a probe of any particular trained network.

## Walkthrough

A researcher wanting to understand why long documents trouble language models opens the Memory Audit and watches gradients shrink toward zero as they propagate back through a simulated sequence — the model's structural amnesia made visible. Switching to the Diffusion Scrubber, they drag an image from `images/animals/` through the noise schedule, watching a tiger dissolve grain by grain into static, and grasp that generation is this process run backwards. In the Attention Lens, they trace how causal masking forbids a token from attending to its own future, hard-coding a particular, directional shape of time.

## Critical Insight

Deep Time argues that the temporality of AI is built, not found. By stripping away the model and showing only the mechanisms, it denaturalises operations that usually hide inside trained weights: memory, attention, and the destruction-and-recovery of diffusion are revealed as specific engineering decisions with cultural consequences. Each could be otherwise. This is the project's "material culture" dimension in its purest form — a tool that refuses inference altogether in order to make the substrate contestable. Understanding how a machine forgets, or how it decides which past it is allowed to remember, is the beginning of a critical relation to the cultural time it increasingly mediates.
