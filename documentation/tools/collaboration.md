# Collaboration

**Route:** `/collaboration` · **Model:** none — merges and visualises multi-participant dissent · **Key dependencies:** `contestationStore` (`mergeRecords`, packet validation), `workshopHelpers` (`buildMatrix`, `buildThresholdSpread`), `exportPacket` · **Archival site:** cross-cutting (public things) · **Try it with:** evidence packets exported by several participants from the Contestations page

---

## Keyword Translation

**Individual judgement → Action in concert**

Where Contestations records one person's dissent, Collaboration assembles *many*. It imports the evidence packets of different participants, merges them, and makes the pattern of agreement and disagreement across a group visible — turning private objections into collective, deliberable difference.

## Theoretical Context

The project's ethico-political ambition is not merely to enable critique but to support "digital action in concert" — publics reconstituted through shared engagement with a contested thing (Honig, 2017; Marres, 2016). Drawing on the PI's work with "hackathons in concert" and techno-cultural workshops, Collaboration is designed for the room rather than the individual: it treats disagreement among participants not as a problem to be resolved into consensus but as the very material of democratic deliberation, to be surfaced and held open. Difference here is social as well as computational — the point is to see *that*, and *where*, people diverge.

## How It Works

Collaboration ingests **contestation packets** exported by other participants. Uploaded files are validated against the `difference-suite-contestations@1` schema, rejected with clear errors if malformed, and otherwise **merged** into a combined set (`mergeRecords`) that de-duplicates while preserving each record's authorship. The page then derives **participants** from the records (labelling and colour-coding each), and uses `workshopHelpers` to build two views of the group: a **matrix** (`buildMatrix`) cross-tabulating who contested what — making visible where participants converge on the same output and where only one dissents — and a **threshold spread** (`buildThresholdSpread`) showing how differently participants set decision boundaries on the same material. Categories are carried through with their colour coding so the *kind* of disagreement (erasure, stereotype, mislabel…) remains legible across the group. The merged set can itself be re-exported as a JSON or HTML packet, so a workshop's collective record can be carried onward. As throughout the suite, all processing is local and file-based; there is no server, no account, no shared backend.

## Methods Setup

Every choice here serves the aim of making group difference visible without dissolving it. *File-based packet exchange* rather than a live shared database is deliberate: it keeps the tool serverless and privacy-preserving, and it models a federated politics in which each participant owns their record and chooses to contribute it, rather than a central platform aggregating everyone by default. *Schema validation* is what makes trustworthy merging possible across participants who never shared a session. The decision to *preserve authorship through the merge* is the methodological heart of the tool — the goal is emphatically not to average dissent into a single score but to keep each voice attributable, so the matrix can show a lone objector as clearly as a unanimous one. The *matrix and threshold-spread visualisations* operationalise "agonism over harmonisation": they are built to reveal spread and divergence, not to compute agreement. Re-exporting the merged packet lets a workshop's collective contestation become an input to the next gathering, supporting deliberation that accretes over time. The honest limit: Collaboration visualises the structure of disagreement but does not adjudicate it — it is scaffolding for a human conversation, and its value depends on that conversation actually taking place.

## Walkthrough

After a workshop session, six participants each export their Contestations packet. The facilitator opens Collaboration and imports all six. The matrix immediately shows structure: one Imagination Inspector output was contested by five of six as a *Stereotype* — a near-consensus — while a Threshold Adjuster decision split the room, three participants flagging *Disagreement* and three letting it stand. The threshold spread reveals that participants drew the asylum decision boundary at markedly different points. None of this is resolved by the tool; instead it becomes the agenda for discussion. The facilitator re-exports the merged packet as the session's collective record.

## Critical Insight

Collaboration completes the suite's arc from critique to public practice. By moving from individual contestation to collective, attributable, visualised disagreement, it enacts the project's claim that deep learning can become a "public thing" around which people deliberate. Its refusal to compute consensus is the point: in a field where "fairness" is constantly reduced to a metric to be optimised, Collaboration keeps difference irreducible and on the table. It builds, from portable files and a matrix, a small infrastructure for arguing together about the machines that increasingly judge us — and for making that argument, not the algorithm's output, the thing that counts.
