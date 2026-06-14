# Multilingual fixtures (WP-1)

Short non-English text corpora and an audio clip used to verify that the Difference Suite works on non-English material after the WP-1 multilingual swap (`multilingual-e5-small` for text, `whisper-base` for ASR).

## Texts

- `german.txt`, `dutch.txt`, `french.txt` — one sentence per line, drawn from three latent themes (family/home, travel/journey, work/labor). Use them in Context Weaver (similarity) and Detail Extractor (k-means clustering) — clusters should track the themes, not the language.

## Audio

- `audio/` — **pending**. Supply one short clip (~5–15 s) of clear speech in one of the target languages (German / Dutch / French), mono, ideally 16 kHz WAV (Whisper resamples to 16 kHz; webm/opus or m4a from a normal recorder is fine too). Drop alongside a `*.reference.txt` file with the ground-truth transcript so the ASR acceptance test can assert against it.
