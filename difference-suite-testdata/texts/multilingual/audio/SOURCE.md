# ASR test fixture — Dutch

## Expected files

- `max_havelaar_nl.<ext>` — the audio clip (drop it here; `.mp3`, `.ogg`, or 16 kHz mono `.wav`).
- `max_havelaar_nl.reference.txt` — the reference transcript (already present).

The audio file is **not committed by the docs/setup step** — download and trim it as below.

## Source & licence

- **Work:** Multatuli (Eduard Douwes Dekker), *Max Havelaar, of de koffij-veilingen der Nederlandsche Handel-Maatschappij* (1860). Text is public domain.
- **Recording:** LibriVox, read by **Anna Simon**. LibriVox recordings are released into the **public domain**.
- **Project page:** https://librivox.org/max-havelaar-of-de-koffij-veilingen-der-nederlandsche-handel-maatschappij/
- **Download (Internet Archive):** https://archive.org/details/max_havelaar_as_librivox
- **Language:** Dutch (`nl`). Select **Dutch** in the dashboard ASR language dropdown.

## How to prepare the clip

1. From the Internet Archive item, download the **Chapter 1 / "Eerste hoofdstuk"** MP3.
2. The target line is the **very first sentence of the book**. **Trim past the LibriVox spoken intro** ("Dit is een LibriVox-opname…" and the chapter/reader announcement) to the first sentence of the narration.
3. Keep ~5–8 seconds, ending at the sentence boundary after "…Nº 37."
4. Optional but recommended for the automated handler test: convert to **16 kHz mono WAV/PCM**
   (e.g. `ffmpeg -i in.mp3 -ac 1 -ar 16000 max_havelaar_nl.wav`). The dashboard recorder resamples
   to 16 kHz on decode anyway, so MP3/OGG also work for the manual check.

## Reference transcript (printed form)

> Ik ben makelaar in koffie, en woon op de Lauriergracht, Nº 37.

### ⚠ Spoken vs printed — important for assertions

The printed "**Nº 37**" is read aloud as a number ("**nummer zevenendertig**" / "nummer 37"),
so Whisper transcribes the spoken form, not "Nº 37". It also varies casing/punctuation. **Do not
assert exact equality, and do not assert a tight WER.**

**Observed `whisper-base` output (this clip):**
> Ik ben MacLaan koffie en warm op de Lauriergacht, nummer 37.

i.e. it correctly transcribes Dutch and the number-as-words, but the small model mis-hears the
uncommon archaic word "makelaar" → "MacLaan", "woon" → "warm", and drops an `r` in
"Lauriergracht". WER ≈ 0.3. This is expected: `whisper-base` is small (chosen for the AI-literacy
footprint) and the sentence is 1860s Dutch. **It is not an integration defect.**

**Recommended assertion (landmark-based, robust to small-model errors):**

- Normalise both sides: lowercase, strip punctuation/diacritics, collapse whitespace.
- Assert the detected **language is `nl`**, and
- Assert the transcript contains the robust landmarks **`koffie`** and **`37`** (or `nummer`).
- Do **not** assert on `makelaar`, `woon`, or an exact `lauriergracht` spelling — the small model
  mangles these.

This proves multilingual ASR actually ran on Dutch audio, without being flaky on `whisper-base`'s
accuracy ceiling. If higher fidelity is needed, swap in `whisper-small` via the model selector
(~2× the download) — the integration is unchanged.
