# What It Took to Make Deep Learning Small

*A fragility log from the Difference Suite — DEEP CULTURE (ERC Advanced Grant)*

*Draft for the PI's revision. Everything recounted here happened, in this order, over roughly one week in June 2026. Technical detail is preserved deliberately: the argument of this document is that the detail is the pedagogy.*

---

## Why small?

The Difference Suite runs deep learning entirely inside your browser. No server receives your data; no platform logs your prompts; when the Wi-Fi dies mid-seminar, the tools keep working. A student who has visited the suite once owns a working copy of the whole thing — models, inference engine, interface — on their own machine.

This is a political choice before it is a technical one. The dominant deep culture runs on extraction: your inputs travel to data centres, are processed at a scale you cannot inspect, by systems you cannot contest. Making deep learning *small* — small enough to hold, to break, to question — refuses that arrangement. But the refusal has a price, and this document is an honest accounting of it. The cloud does not make deep learning's fragility disappear; it makes it *someone else's problem*, invisible behind a loading spinner. Run the same systems on a laptop and every fragility becomes yours. We think that is a feature. Bonnie Honig argues that public things bind us precisely because they are fragile and need constant reconstitution. What follows is a week of reconstitution.

## The week everything broke

### The progress bar that talked to nobody

It began with a code review. The suite's models run in a background worker, which reports its progress — *downloading, 40%* — back to the interface. The review found that these progress messages carried the wrong address: the worker labelled them with the *model's* name, while the interface filed its expectations under the *request's* number. Every progress report was delivered to a mailbox nobody was watching. The loading bars that seemed to work had never worked; the downloads were simply fast enough that nobody noticed the silence.

**The lesson:** in deep learning systems, failure is frequently *silent*. Nothing crashed. No error appeared. The system simply did slightly less than everyone believed it did, for months. The question "how would we know if this were broken?" has to be asked while things appear to work.

### The upgrade that was a negotiation

We migrated the suite's inference library to a new major version — a rewritten engine promising large speedups. The library's API survived almost unchanged; nearly everything else underneath it shifted. Models that loaded before now needed different files. One tool, it turned out, had *never actually loaded its model* — it had been failing quietly behind a wrong configuration since the beginning, and only the upgrade's stricter checking revealed it.

**The lesson:** a model is not a thing but an arrangement — weights in a particular file format, a loader that expects that format, a runtime that executes it, a browser that hosts the runtime. "Upgrading" renegotiates every clause of that arrangement at once. The marketing word is *seamless*; the experienced reality is diplomacy.

### The freeze

Then the real trouble. One model — CLIP, which connects images and text and quietly powers half the suite — began to hang. Not error: *hang*. We tried the old export of the model and the new one; full precision and three kinds of compression; the graphics card and the ordinary processor. Every combination downloaded correctly, reported itself ready, and then locked. Within ninety seconds the entire browser tab froze so completely that it could no longer report its own state, and eventually crashed.

The freeze had a mechanism worth understanding. The inference engine's worker threads *spin-wait* — they burn processor cycles at full speed while waiting for work. A stuck computation meant eight threads spinning on eight cores, starving everything else, including the interface that might have told us what was wrong. The PI asked, reasonably, at midnight: *"Is this impossible?"*

It was not. The cause, found by instrumented debugging in a live browser, was not the model at all but the *manner of loading it*: a convenience wrapper that the new engine no longer supported for this kind of two-part model. Loading the same weights through the model's proper classes — the same fix that had already rescued another model, which should have been the clue — worked immediately. The "newer, faster" export of CLIP, incidentally, turned out to be *incompatible* with the correct loader. The fix kept the old files and changed how they were opened.

**The lesson:** when a deep learning system fails, the weights are usually the last thing at fault. The mundane machinery around them — loaders, wrappers, thread pools, memory limits — does most of the breaking. And: newer is not safer.

### The header worth a 4× slowdown

Throughout the freeze investigation, a second fault hid inside the first. Browsers will only grant a page fast, multi-threaded computation if the server sends two obscure security headers. Our development server didn't send them. Without them, the inference engine fell back — silently, of course — to a single thread. Models that should have loaded in seconds appeared to hang forever, mimicking the real freeze and confusing the diagnosis for a day. The fix was five lines of configuration. The font broke (the same headers block any resource that doesn't formally consent to being embedded), which cost another line.

**The lesson:** the performance of "AI in the browser" can hinge on an HTTP header. Infrastructure this small is rarely written about and never advertised, yet it divided "works impressively" from "appears fundamentally broken." Materiality goes all the way down.

### The missing word

After the engine was healthy, a tool for training a small classifier on the user's own images kept producing a model that had learned nothing. The cause was one absent keyword in the code — an `await` — which meant the program threw away each image a microsecond before the model could read it. Training "completed" cheerfully every time. Zero examples had been learned.

**The lesson:** between the model and the user sit thousands of lines of ordinary software, and a single missing word can hollow out everything the interface claims. The demonstration *looked* identical to a working one. Skepticism about demos is not cynicism; it is method.

### The instrument that had to confess

The Imagination Inspector examines bias in image generators by classifying their outputs with CLIP. We decided the classifier should admit uncertainty: when its top two readings are close, it should say *ambiguous* rather than force a verdict. The first implementation reported **everything** as ambiguous — one hundred percent, every category. The cause: CLIP's raw similarity scores live in a tiny numerical range, and turning them into honest probabilities requires multiplying by a calibration constant (about 100) that the model learned during training. Omit it, and the mathematics says "no idea" about everything. Include it, and the same numbers say "female, 87%" or "genuinely unclear, 51% to 42%" — which is what students now see when they hover over a tag.

**The lesson:** even *measuring* a model takes a model, and the measuring instrument needs calibrating, disclosing, and doubting like any other. The suite now labels these readings "CLIP-perceived" and shows the margin. The hesitation is displayed, not discarded — ambiguity became an outcome instead of an embarrassment.

## What we built from the wreckage

Every failure above left a permanent mark on the suite — not as a patch but as a feature.

The freeze became the **watchdog**: no model may now wedge the interface; a stuck computation is shut down after two minutes and reported in plain language. The spinning threads became a **thread cap** that always leaves the interface a core to breathe with. The silent failures became the **Machine Room**: a page where the suite narrates its own decisions as they happen — *"Chose the q8 version: less precise, 4× smaller. Someone made this trade-off for you."* — with a journal of downloads, evictions, fallbacks, and crashes. And the right to disagree with any output became the **Contestations** ledger, exportable and comparable, because a tool that confesses its decisions invites dissent about them.

The week ended with a ritual: load the suite once, switch the browser to offline, reload. The page appears; the models answer; the network graph stays flat. A student on a dying eduroam connection now carries the entire apparatus with them.

## Six lessons, kept short

1. **Failure is ambient, not exceptional.** The healthy-looking system contained three silent faults. Design for confession, not for the demo.
2. **A model is an arrangement, not an object.** Weights, formats, loaders, runtimes, headers, browsers — any clause can break the contract.
3. **The breakage is the curriculum.** Every fault above teaches more about how deep learning actually exists in the world than a working demo could.
4. **Instruments need instruments.** Classifying a generator's bias with CLIP imports CLIP's own biases and miscalibrations; honesty means showing the margins.
5. **Small is a politics.** Local-first AI trades the cloud's invisible fragility for visible, ownable fragility — and gains privacy, offline resilience, and contestability.
6. **Public things need tending.** The suite broke and was reconstituted, repeatedly, in public view. Per Honig, that is not the failure of a public thing. That is what one is.

## A note on how this was repaired

The debugging itself enacted the project's theme of new human–machine agencies: the PI tested and judged; a coding agent implemented from written specifications; a second AI assistant reviewed the code, drove a live browser to reproduce the freezes, and read the machine's silence for clues. No party could have done it alone — the human supplied purpose, taste, and the decisive observation ("it works on the server!"); the machines supplied patience and the ability to read ten thousand lines without flinching. The transcript of that collaboration is itself research data, and this document is its first publication.

---

*The Difference Suite is developed within DEEP CULTURE (ERC Advanced Grant), University of Amsterdam. The suite, its source code, and the full unedited diagnosis log are public. All inference described here runs locally in the reader's browser — which you can verify, as we did, by turning the network off.*
