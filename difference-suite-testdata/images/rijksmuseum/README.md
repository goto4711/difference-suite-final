# Rijksmuseum collection

75 images harvested from Wikimedia Commons, drawn from the **Rijksmuseum
Amsterdam** holdings (paintings, with a small number of works on paper).
The user can pick ~20 to assemble the in-class collection.

## Provenance

- Source: <https://commons.wikimedia.org/wiki/Category:Paintings_in_the_Rijksmuseum_Amsterdam>
  and its by-genre subcategories.
- Rights: Rijksmuseum holdings on Commons are predominantly **public
  domain** (PD-Art / CC0 from the museum's Rijksstudio release). Per-record
  license is in `manifest.json`.
- Thumbnail width: 1024 px (Commons thumbnail API).

## Sampled subcategories (genre mix)

- Portrait paintings — early-modern faces; useful for testing how Florence-2
  and CLIP read pre-photographic portraiture.
- Landscape paintings — flat horizons, atmospheric perspective; teaching
  material for Depth Mirror.
- Still-life paintings — dense detail, useful for Detail Extractor and
  Visual Storyteller.
- Genre paintings — interiors, domestic scenes; the captioner often anachronises.
- History paintings — narrative scenes; tests whether the model recognises
  any depicted event.
- Religious paintings — saints and iconography; useful for Imagination
  Inspector pairings.
- Cityscape, marine, animal paintings — broader visual variety.

## Walkthrough use

These work especially well for showing **how CLIP and Florence-2 misread
non-photographic imagery**: oil paintings produce captions that drift toward
"a painting of…" but often miss period, allegory, and iconographic content.
That mismatch is the pedagogical point — it surfaces the model's training
distribution directly.

## Manifest

`manifest.json` carries the same fields as the Anefo collection: filename,
Commons title and URL, descriptive title, description, date (where
available), artist, credit, license, license URL, byte size, and source
Commons category.
