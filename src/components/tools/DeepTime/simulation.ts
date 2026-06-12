import { MAX_TOKENS, T_MAX } from "./data";

export interface MemorySimulationResult {
  gradMags: Float32Array;
  simVals: Float32Array;
}

function softmax(row: number[]): number[] {
  const finiteValues = row.filter((value) => Number.isFinite(value));
  if (finiteValues.length === 0) {
    return row.map(() => 0);
  }

  const maxValue = Math.max(...finiteValues);
  const exponentials = row.map((value) => (Number.isFinite(value) ? Math.exp(value - maxValue) : 0));
  const total = exponentials.reduce((sum, value) => sum + value, 0);

  return exponentials.map((value) => (total === 0 ? 0 : value / total));
}

export function buildMatrix(size: number, lambda: number): number[][] {
  return Array.from({ length: size }, (_, rowIndex) =>
    softmax(
      Array.from({ length: size }, (_, columnIndex) =>
        columnIndex > rowIndex ? Number.NEGATIVE_INFINITY : -lambda * (rowIndex - columnIndex),
      ),
    ),
  );
}

export function tokenize(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean).slice(0, MAX_TOKENS);
}

export const ALPHAS_CUMPROD = (() => {
  const offset = 0.008;
  const raw = new Float64Array(T_MAX + 1);

  for (let timestep = 0; timestep <= T_MAX; timestep += 1) {
    raw[timestep] = Math.cos((((timestep / T_MAX) + offset) / (1 + offset)) * Math.PI * 0.5) ** 2;
  }

  const baseValue = raw[0];
  const alphas = new Float64Array(T_MAX);

  for (let timestep = 0; timestep < T_MAX; timestep += 1) {
    alphas[timestep] = raw[timestep] / baseValue;
  }

  return alphas;
})();

function makePrng(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateNoise(size: number, seed: number): Float32Array {
  const totalValues = size * size * 3;
  const buffer = new Float32Array(totalValues);
  const random = makePrng(seed);

  for (let index = 0; index < totalValues; index += 2) {
    const u1 = random() + 1e-10;
    const u2 = random();
    const magnitude = Math.sqrt(-2 * Math.log(u1));
    buffer[index] = magnitude * Math.cos(2 * Math.PI * u2);

    if (index + 1 < totalValues) {
      buffer[index + 1] = magnitude * Math.sin(2 * Math.PI * u2);
    }
  }

  return buffer;
}

export function applyNoise(srcData: Uint8ClampedArray, noise: Float32Array, timestep: number): Uint8ClampedArray {
  const alphaBar = ALPHAS_CUMPROD[timestep];
  const signalScale = Math.sqrt(alphaBar);
  const noiseScale = Math.sqrt(1 - alphaBar);
  const output = new Uint8ClampedArray(srcData.length);
  let noiseIndex = 0;

  for (let pixelIndex = 0; pixelIndex < srcData.length; pixelIndex += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      const normalized = (srcData[pixelIndex + channel] / 127.5) - 1;
      output[pixelIndex + channel] = Math.round(
        Math.min(255, Math.max(0, ((signalScale * normalized) + (noiseScale * noise[noiseIndex]) + 1) * 127.5)),
      );
      noiseIndex += 1;
    }
    output[pixelIndex + 3] = 255;
  }

  return output;
}

export function makeDemoImage(size: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    const band = Math.floor(y / (size / 12));
    const darkness = band % 2 === 0 ? 0.88 : 0.78;

    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const scratch = (Math.sin((x * 0.35) + (band * 2.1)) * 0.5 + 0.5) * 0.18;
      const value = Math.round((darkness - scratch) * 210);
      data[index] = value + 12;
      data[index + 1] = value + 6;
      data[index + 2] = value - 8;
      data[index + 3] = 255;
    }
  }

  return data;
}

function multiplyMatrixVector(matrix: Float64Array, vector: Float64Array, rows: number, columns: number): Float64Array {
  const output = new Float64Array(rows);

  for (let row = 0; row < rows; row += 1) {
    let sum = 0;

    for (let column = 0; column < columns; column += 1) {
      sum += matrix[(row * columns) + column] * vector[column];
    }

    output[row] = sum;
  }

  return output;
}

function multiplyMatrixTransposeVector(
  matrix: Float64Array,
  vector: Float64Array,
  rows: number,
  columns: number,
): Float64Array {
  const output = new Float64Array(columns);

  for (let column = 0; column < columns; column += 1) {
    let sum = 0;

    for (let row = 0; row < rows; row += 1) {
      sum += matrix[(row * columns) + column] * vector[row];
    }

    output[column] = sum;
  }

  return output;
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function vectorNorm(vector: Float64Array): number {
  let sum = 0;

  for (const value of vector) {
    sum += value * value;
  }

  return Math.sqrt(sum);
}

function cosineSimilarity(a: Float64Array, b: Float64Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator < 1e-12 ? 0 : dot / denominator;
}

function randomWeights(hiddenSize: number, inputSize: number, seed: number): Float64Array {
  const scale = Math.sqrt(2 / (hiddenSize + inputSize));
  const weights = new Float64Array(hiddenSize * inputSize);
  const random = makePrng(seed);

  for (let index = 0; index < hiddenSize * inputSize; index += 2) {
    const gaussian = Math.sqrt(-2 * Math.log(random() + 1e-10));
    weights[index] = gaussian * Math.cos(2 * Math.PI * random()) * scale;

    if (index + 1 < hiddenSize * inputSize) {
      weights[index + 1] = gaussian * Math.sin(2 * Math.PI * random()) * scale;
    }
  }

  return weights;
}

function randomSequence(length: number, inputSize: number, seed: number): Float64Array[] {
  const random = makePrng(seed + 9999);

  return Array.from({ length }, () => {
    const vector = new Float64Array(inputSize);

    for (let index = 0; index < inputSize; index += 2) {
      const gaussian = Math.sqrt(-2 * Math.log(random() + 1e-10));
      vector[index] = gaussian * Math.cos(2 * Math.PI * random());

      if (index + 1 < inputSize) {
        vector[index + 1] = gaussian * Math.sin(2 * Math.PI * random());
      }
    }

    return vector;
  });
}

export function runRNN(sequenceLength: number, inputSize: number, hiddenSize: number, seed: number): MemorySimulationResult {
  const wxh = randomWeights(hiddenSize, inputSize, seed);
  const whh = randomWeights(hiddenSize, hiddenSize, seed + 1);
  const inputs = randomSequence(sequenceLength, inputSize, seed);
  const hiddenStates = [new Float64Array(hiddenSize)];

  for (let timestep = 0; timestep < sequenceLength; timestep += 1) {
    const hidden = new Float64Array(hiddenSize);
    const projectedInput = multiplyMatrixVector(wxh, inputs[timestep], hiddenSize, inputSize);
    const projectedHidden = multiplyMatrixVector(whh, hiddenStates[timestep], hiddenSize, hiddenSize);

    for (let index = 0; index < hiddenSize; index += 1) {
      hidden[index] = Math.tanh(projectedInput[index] + projectedHidden[index]);
    }

    hiddenStates.push(hidden);
  }

  const finalHidden = hiddenStates[sequenceLength];
  let gradient: Float64Array = new Float64Array(hiddenSize);
  gradient.fill(1);
  const gradMags = new Float32Array(sequenceLength);
  const simVals = new Float32Array(sequenceLength);

  for (let timestep = 0; timestep < sequenceLength; timestep += 1) {
    simVals[timestep] = cosineSimilarity(hiddenStates[timestep + 1], finalHidden);
  }

  for (let timestep = sequenceLength - 1; timestep >= 0; timestep -= 1) {
    const delta = new Float64Array(hiddenSize);

    for (let index = 0; index < hiddenSize; index += 1) {
      delta[index] = gradient[index] * (1 - (hiddenStates[timestep + 1][index] ** 2));
    }

    gradMags[timestep] = vectorNorm(multiplyMatrixTransposeVector(wxh, delta, hiddenSize, inputSize));
    gradient = multiplyMatrixTransposeVector(whh, delta, hiddenSize, hiddenSize);
  }

  return { gradMags, simVals };
}

export function runLSTM(sequenceLength: number, inputSize: number, hiddenSize: number, seed: number): MemorySimulationResult {
  const wi = randomWeights(hiddenSize, inputSize, seed + 10);
  const hi = randomWeights(hiddenSize, hiddenSize, seed + 11);
  const wf = randomWeights(hiddenSize, inputSize, seed + 12);
  const hf = randomWeights(hiddenSize, hiddenSize, seed + 13);
  const wg = randomWeights(hiddenSize, inputSize, seed + 14);
  const hg = randomWeights(hiddenSize, hiddenSize, seed + 15);
  const wo = randomWeights(hiddenSize, inputSize, seed + 16);
  const ho = randomWeights(hiddenSize, hiddenSize, seed + 17);
  const inputs = randomSequence(sequenceLength, inputSize, seed);
  const hiddenStates = [new Float64Array(hiddenSize)];
  const cellStates = [new Float64Array(hiddenSize)];
  const inputGates: Float64Array[] = [];
  const forgetGates: Float64Array[] = [];
  const candidateGates: Float64Array[] = [];
  const outputGates: Float64Array[] = [];
  const activatedCells: Float64Array[] = [];

  for (let timestep = 0; timestep < sequenceLength; timestep += 1) {
    const input = inputs[timestep];
    const previousHidden = hiddenStates[timestep];
    const previousCell = cellStates[timestep];
    const inputGate = new Float64Array(hiddenSize);
    const forgetGate = new Float64Array(hiddenSize);
    const candidateGate = new Float64Array(hiddenSize);
    const outputGate = new Float64Array(hiddenSize);
    const projectedInputGate = multiplyMatrixVector(wi, input, hiddenSize, inputSize);
    const projectedHiddenInputGate = multiplyMatrixVector(hi, previousHidden, hiddenSize, hiddenSize);
    const projectedForgetGate = multiplyMatrixVector(wf, input, hiddenSize, inputSize);
    const projectedHiddenForgetGate = multiplyMatrixVector(hf, previousHidden, hiddenSize, hiddenSize);
    const projectedCandidateGate = multiplyMatrixVector(wg, input, hiddenSize, inputSize);
    const projectedHiddenCandidateGate = multiplyMatrixVector(hg, previousHidden, hiddenSize, hiddenSize);
    const projectedOutputGate = multiplyMatrixVector(wo, input, hiddenSize, inputSize);
    const projectedHiddenOutputGate = multiplyMatrixVector(ho, previousHidden, hiddenSize, hiddenSize);

    for (let index = 0; index < hiddenSize; index += 1) {
      inputGate[index] = sigmoid(projectedInputGate[index] + projectedHiddenInputGate[index]);
      forgetGate[index] = sigmoid(projectedForgetGate[index] + projectedHiddenForgetGate[index]);
      candidateGate[index] = Math.tanh(projectedCandidateGate[index] + projectedHiddenCandidateGate[index]);
      outputGate[index] = sigmoid(projectedOutputGate[index] + projectedHiddenOutputGate[index]);
    }

    const cell = new Float64Array(hiddenSize);
    const hidden = new Float64Array(hiddenSize);
    const activatedCell = new Float64Array(hiddenSize);

    for (let index = 0; index < hiddenSize; index += 1) {
      cell[index] = (forgetGate[index] * previousCell[index]) + (inputGate[index] * candidateGate[index]);
      activatedCell[index] = Math.tanh(cell[index]);
      hidden[index] = outputGate[index] * activatedCell[index];
    }

    hiddenStates.push(hidden);
    cellStates.push(cell);
    inputGates.push(inputGate);
    forgetGates.push(forgetGate);
    candidateGates.push(candidateGate);
    outputGates.push(outputGate);
    activatedCells.push(activatedCell);
  }

  const finalHidden = hiddenStates[sequenceLength];
  let hiddenGradient: Float64Array = new Float64Array(hiddenSize);
  hiddenGradient.fill(1);
  let cellGradient: Float64Array = new Float64Array(hiddenSize);
  const gradMags = new Float32Array(sequenceLength);
  const simVals = new Float32Array(sequenceLength);

  for (let timestep = 0; timestep < sequenceLength; timestep += 1) {
    simVals[timestep] = cosineSimilarity(hiddenStates[timestep + 1], finalHidden);
  }

  for (let timestep = sequenceLength - 1; timestep >= 0; timestep -= 1) {
    const inputGate = inputGates[timestep];
    const forgetGate = forgetGates[timestep];
    const candidateGate = candidateGates[timestep];
    const outputGate = outputGates[timestep];
    const activatedCell = activatedCells[timestep];
    const previousCell = cellStates[timestep];
    const nextCellGradient = new Float64Array(hiddenSize);

    for (let index = 0; index < hiddenSize; index += 1) {
      nextCellGradient[index] = (hiddenGradient[index] * outputGate[index] * (1 - (activatedCell[index] ** 2))) + cellGradient[index];
    }

    const outputDelta = new Float64Array(hiddenSize);
    const inputDelta = new Float64Array(hiddenSize);
    const forgetDelta = new Float64Array(hiddenSize);
    const candidateDelta = new Float64Array(hiddenSize);

    for (let index = 0; index < hiddenSize; index += 1) {
      outputDelta[index] = hiddenGradient[index] * activatedCell[index] * outputGate[index] * (1 - outputGate[index]);
      inputDelta[index] = nextCellGradient[index] * candidateGate[index] * inputGate[index] * (1 - inputGate[index]);
      forgetDelta[index] = nextCellGradient[index] * previousCell[index] * forgetGate[index] * (1 - forgetGate[index]);
      candidateDelta[index] = nextCellGradient[index] * inputGate[index] * (1 - (candidateGate[index] ** 2));
    }

    const inputGradientFromInputGate = multiplyMatrixTransposeVector(wi, inputDelta, hiddenSize, inputSize);
    const inputGradientFromForgetGate = multiplyMatrixTransposeVector(wf, forgetDelta, hiddenSize, inputSize);
    const inputGradientFromCandidateGate = multiplyMatrixTransposeVector(wg, candidateDelta, hiddenSize, inputSize);
    const inputGradientFromOutputGate = multiplyMatrixTransposeVector(wo, outputDelta, hiddenSize, inputSize);
    const inputGradient = new Float64Array(inputSize);

    for (let index = 0; index < inputSize; index += 1) {
      inputGradient[index] =
        inputGradientFromInputGate[index] +
        inputGradientFromForgetGate[index] +
        inputGradientFromCandidateGate[index] +
        inputGradientFromOutputGate[index];
    }

    gradMags[timestep] = vectorNorm(inputGradient);

    const hiddenGradientFromInputGate = multiplyMatrixTransposeVector(hi, inputDelta, hiddenSize, hiddenSize);
    const hiddenGradientFromForgetGate = multiplyMatrixTransposeVector(hf, forgetDelta, hiddenSize, hiddenSize);
    const hiddenGradientFromCandidateGate = multiplyMatrixTransposeVector(hg, candidateDelta, hiddenSize, hiddenSize);
    const hiddenGradientFromOutputGate = multiplyMatrixTransposeVector(ho, outputDelta, hiddenSize, hiddenSize);
    hiddenGradient = new Float64Array(hiddenSize);
    cellGradient = new Float64Array(hiddenSize);

    for (let index = 0; index < hiddenSize; index += 1) {
      hiddenGradient[index] =
        hiddenGradientFromInputGate[index] +
        hiddenGradientFromForgetGate[index] +
        hiddenGradientFromCandidateGate[index] +
        hiddenGradientFromOutputGate[index];
      cellGradient[index] = nextCellGradient[index] * forgetGate[index];
    }
  }

  return { gradMags, simVals };
}
