/**
 * Handler barrel import.
 *
 * Importing this file triggers self-registration of all task handlers.
 * To add a new handler:
 *   1. Create a file in this directory (e.g. `depthEstimation.ts`)
 *   2. Call `registerHandler(...)` in that file
 *   3. Add an import line below
 */

import './textGeneration';
import './imageToText';
import './featureExtraction';
import './speechRecognition';
import './multimodalAlignment';
import './attentionAnalysis';
import './imageClassification';
import './zeroShotNer';
import './depthEstimation';
// Add new handlers here ↓
