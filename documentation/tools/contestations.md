# Contestations

**Route:** `/contestations` · **Model:** none — records and exports user dissent · **Key dependencies:** `contestationStore` (Zustand + `persist`), `ContestButton`, `exportPacket` (JSON/HTML) · **Archival site:** cross-cutting (public things) · **Try it with:** any tool — use the "Contest this" button on an output you disagree with, then open this page

---

## Keyword Translation

**Output → Contestation**

Commercial AI presents its outputs as finished verdicts to be accepted. Contestations turns the verdict into the *start* of a conversation: a structured way to record dissent against any tool's output, to categorise the kind of harm or error involved, and to carry that dissent out of the app as portable evidence.

## Theoretical Context

The project draws on Bonnie Honig's notion of a "public thing" — an object that gathers people into contestation and deliberation (Honig, 2017) — and on the conviction that algorithmic decisions should be made "publicly contestable" rather than absorbed passively. Critically, it seeks to extend contestation beyond the citizens with the right "skills and free time" (Birchall, 2021), offering otherwise passive users a concrete means to challenge deep learning's pronouncements. Contestations operationalises this: it treats disagreement not as noise to be smoothed away but as legitimate evidence to be recorded, named, and circulated. The tool refuses the asymmetry by which the system speaks and the user merely receives.

## How It Works

Contestation is woven into every tool through a shared **"Contest this" button** (rendered via `ToolLayout`), so any output, anywhere in the suite, can be challenged in place. Opening the dialog captures a **ContestationRecord**: the contesting user selects a **category** — *Erasure*, *Stereotype*, *Mislabel*, *Disagreement*, or *Other* — writes a note (up to 1,000 characters), and optionally signs it; the record also stores the tool id, the route, a plain-text summary of the contested output, and a snapshot of the relevant tool settings (e.g. a threshold value). Records are held in a Zustand store **persisted to the browser** (`difference-suite-contestations`), so dissent survives reloads. The Contestations page lists every record as a card, grouped and colour-coded by category, and — crucially — exports the whole set as an **evidence packet** in either machine-readable **JSON** (schema `difference-suite-contestations@1`) or human-readable **HTML**. Everything stays local; export is a deliberate, user-initiated act.

## Methods Setup

The design is a sequence of methodological commitments. *Embedding the contest action in every tool* rather than quarantining it on a feedback page means dissent is captured at the moment and site of disagreement, with the output and settings still in context — the record is evidential, not a vague after-the-fact complaint. The *fixed category vocabulary* (erasure, stereotype, mislabel, disagreement, other) is a small act of theory: it names the kinds of harm the project most cares about — particularly *erasure*, the absence of what should be present — and gives non-experts a shared language without forcing their open-ended note into a rigid form. Capturing a *settings snapshot* makes each contestation reproducible: a reader of the packet can see the exact threshold or mode that produced the contested output. *Local persistence with explicit export* encodes the politics directly: the user owns their dissent, nothing is transmitted without action, and the evidence packet is a portable public document rather than data harvested by a platform. The schema-versioned packet is what makes the next tool, Collaboration, possible — dissent is built from the start to travel. The method's honest limit: these are records of *subjective* contestation, not adjudications; the tool deliberately does not decide who is right, only that disagreement deserves a durable, shareable form.

## Walkthrough

A researcher runs the Imagination Inspector on a profession prompt and finds the generated demographics overwhelmingly skewed. They click **Contest this**, choose **Stereotype**, and note which group is over-represented and which is absent; the record silently captures the prompt, the tool, and its settings. Working across the suite, they accumulate further contestations — an *Erasure* logged against a caption that omitted a photograph's political context, a *Mislabel* against a confident misclassification. On the Contestations page the dissent is gathered into a colour-coded ledger, then exported as an HTML packet the researcher can attach to a report or bring to a workshop.

## Critical Insight

Contestations reframes the user's relationship to algorithmic output from reception to authorship. By giving disagreement a structured form, a shared vocabulary, persistence, and an export path, it makes dissent durable and portable rather than fleeting and private — the difference between muttering at a screen and producing evidence. This is the suite's wager that deep learning can be made into a "public thing": not by building a better classifier, but by building the means to argue back. The evidence packet is the hinge — it turns a personal objection into a document that can enter deliberation, and sets up the move from individual to collective contestation.
