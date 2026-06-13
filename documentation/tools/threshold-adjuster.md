# Threshold Adjuster

**Route:** `/threshold-adjuster` · **Model:** none — operates on supplied or simulated decision scores · **Key dependencies:** Recharts, CSV/JSON parsing · **Archival site:** Incidental archives · **Try it with:** `difference-suite-testdata/other/threshold_data.json` (asylum tribunal scores)

---

## Keyword Translation

**Uncertainty: Probability → Doubt**

Every classification system ultimately converts a continuous probability into a discrete decision by drawing a line: above the threshold, approved; below it, rejected. The Threshold Adjuster exposes that line, makes it movable, and asks what happens to the people clustered around it — the cases where the system's confidence is precisely least deserved.

## Theoretical Context

Critical humanities scholarship understands its own work as open-ended, comfortable with remaining doubt (Hecht, 2004). Algorithmic decision-making is the opposite: it must always return an answer. The project locates the suppressed doubt at the **threshold** — the human-set boundary where uncertainty is resolved into a verdict. As Bartolo and Thomas (2022) note, "qualitative decisions are made about what metrics to optimise for… how to define their bounds": the threshold is one such decision, usually fixed by engineers with little knowledge of the lives it sorts. The chosen domain — asylum and immigration appeals — is exactly the "incidental archive" the project foregrounds: government repositories of tribunal decisions, never built as training data, in which lives are split into the evidential and the non-evidential.

## How It Works

The tool loads scored cases and presents an interactive **threshold slider**. As the user moves the boundary, a **histogram** of the score distribution updates, **impact statistics** recompute how many cases flip between "approved" and "rejected," and a **case list** surfaces the borderline decisions nearest the line. By default it generates a thousand simulated asylum-tribunal cases whose scores are deliberately clustered into a "zone of doubt" around 0.4–0.6, each carrying a realistic case summary — consistent testimony undermined by missing documents, medical evidence of torture set against a delayed claim, a contested translation. Users can replace this with their own CSV or JSON of scored records. No model runs; the tool works on the scores themselves, because its argument is about the *decision*, not the prediction.

## Methods Setup

The decisive methodological choice is to run *no model at all*. By operating directly on decision scores, the Threshold Adjuster isolates the moment the project actually cares about — the human act of drawing a line — from the upstream prediction, refusing the alibi by which a threshold is treated as a neutral technical default rather than an ethical choice. Making the threshold *interactive* is the whole argument in interface form: the user feels, in real time, that the same data yields opposite verdicts depending on where the line falls, so the contingency of the decision is experienced rather than asserted. The synthetic default data is engineered with a deliberate *"zone of doubt"* clustering scores around the middle, because a realistic distribution is what makes the borderline population — the tool's true subject — populous and legible; pairing each score with a qualitative case summary insists that behind every number is a narrative the number cannot hold. Surfacing the *borderline case list* specifically directs attention to where confidence is least earned. The honest limit is that the tool takes the scores as given: it interrogates the threshold, not how the scores were produced, so it should be read as a study of decision-making under uncertainty rather than a critique of any particular scoring model.

## Walkthrough

A researcher loads `other/threshold_data.json` and starts at a threshold of 0.5. Nudging it to 0.55, the impact statistics show dozens of cases swing from accepted to rejected; nudging it back, the swing reverses. The case list fills with appellants whose scores hover at the boundary — precisely those whose summaries describe genuine ambiguity, where the algorithm's number offers least guidance. The researcher examines these individuals one by one: which evidence was made to count, and which discounted, to push a life onto one side of a line that moved at the drag of a slider?

## Critical Insight

The Threshold Adjuster exposes what the project calls the "qualitative decisions made to enable quantifications." A threshold is not a technical detail but a site of profound ethical consequence — the point where probabilistic uncertainty is laundered into administrative certainty. By letting users move the line and watch lives reclassify in real time, the tool restores doubt to its proper place: at the boundary, among the borderline cases, where confident-seeming outputs most actively conceal it. It models a different disposition toward algorithmic decision-making — one that treats the people near the threshold not as rounding error but as the very population whose situation demands human judgement.
