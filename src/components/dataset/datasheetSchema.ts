// Datasheet field set, faithful to the Gebru et al. "Datasheets for Datasets"
// sections (motivation, composition, collection process, preprocessing/cleaning,
// uses, distribution, maintenance) — trimmed to what an AI-literacy workshop
// user can realistically fill in.
//
// AUTO fields are computed by datasheetBuilder from a collection's items and
// the app's build-time provenance. USER fields are editable text the form
// presents as textareas. Both shapes live together in DatasheetData so a
// single object round-trips through edit → preview → export.

export interface DatasheetAuto {
    name: string;                                   // collection name
    description?: string;
    exportedAt: number;                             // unix ms
    appCommit: string;                              // build-time SHA
    appVersion?: string;
    totalItems: number;
    itemCountsByType: Record<string, number>;       // 'image' | 'text' | …
    hasEmbeddings: boolean;
    embeddingCount: number;
    embeddingDim: number | null;                    // common dim, or null if mixed/none
    sourceFileSamples: string[];                    // up to 10 item filenames
    collectionTimeRange: {                          // first/last item lastModified
        firstTs: number | null;
        lastTs: number | null;
    };
    activeEmbeddingModel?: string;                  // suite store at export-time
    modelsUsed: string[];                           // dedup'd union of registry ids
}

export interface DatasheetUser {
    motivation: string;                             // why was this collection created?
    fundingAndContext: string;                      // who / what supported it?
    sensitiveContentNote: string;                   // does it contain sensitive material?
    peopleDepictedNote: string;                     // are people identifiable / consenting?
    collectionMethod: string;                       // how were items gathered?
    recruitmentEthics: string;                      // for human-derived data: consent, IRB, etc.
    preprocessingNotes: string;                     // cleaning / labeling / transformations
    intendedUses: string;                           // what is this dataset for?
    knownNonUses: string;                           // what should it NOT be used for?
    license: string;                                // SPDX id or free text
    maintainerContact: string;                      // who to contact
    hostingPlan: string;                            // where will this live? for how long?
    knownBiases: string;
    limitations: string;
}

export interface DatasheetData {
    auto: DatasheetAuto;
    user: DatasheetUser;
}

export const EMPTY_USER_FIELDS: DatasheetUser = {
    motivation: '',
    fundingAndContext: '',
    sensitiveContentNote: '',
    peopleDepictedNote: '',
    collectionMethod: '',
    recruitmentEthics: '',
    preprocessingNotes: '',
    intendedUses: '',
    knownNonUses: '',
    license: 'All rights reserved — set this before distributing',
    maintainerContact: '',
    hostingPlan: '',
    knownBiases: '',
    limitations: '',
};

/** Static how-to block; documented inside the datasheet itself. */
export const HF_REPO_LAYOUT = `Mapping to a HuggingFace dataset repository
-------------------------------------------
This datasheet doubles as the repo's README.md (HF treats README.md as the
"dataset card"). A minimal HF repo layout consistent with the bundle:

  README.md            ← this datasheet (markdown export)
  data/manifest.json   ← bundle.manifest
  data/embeddings.json ← bundle.embeddings  (omit if no embeddings)
  data/items/<file>    ← raw item files; only if the exporter opted in

Within the EU-SSHOC "methodological commons" framing, this layout makes the
dataset documentation, the manifest, and (optionally) the computed embeddings
all citable artefacts. The datasheet is the human-readable contract; the
manifest is the machine-readable inventory; the embeddings are the
reproducibility hook tying the dataset to a specific model + commit.`;
