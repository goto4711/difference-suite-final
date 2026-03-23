import type {
  InferenceRequest,
  InferenceResult,
  InferenceProgress,
  PipelineTask,
} from './types';

/**
 * A TaskHandler encapsulates all inference logic for one pipeline task type.
 *
 * TransformersManager dispatches to the matching registered handler instead
 * of using a growing switch/case. To add support for a new task:
 *
 *   1. Create a file in `src/core/inference/handlers/`
 *   2. Call `registerHandler({ task: 'your-task', run: ... })`
 *   3. Import the file in `handlers/index.ts`
 */
export interface TaskHandler {
  /** The pipeline task this handler covers (e.g. 'text-generation'). */
  task: PipelineTask;

  /**
   * Run inference for the given request.
   * @param request   The inference request (model, payload, etc.)
   * @param pipeline  The loaded Transformers.js pipeline instance.
   * @param onProgress Optional progress callback.
   * @returns The inference result.
   */
  run(
    request: InferenceRequest,
    pipeline: unknown,
    onProgress?: (p: InferenceProgress) => void,
  ): Promise<InferenceResult>;
}

// ── Handler registry ──────────────────────────────────────────

/** Global handler registry. Handlers self-register by calling registerHandler(). */
const handlers = new Map<string, TaskHandler>();

/**
 * Register a handler for a pipeline task.
 * Typically called at module load time (side-effect import).
 */
export function registerHandler(handler: TaskHandler): void {
  if (handlers.has(handler.task)) {
    console.warn(
      `[TaskHandlers] Overwriting existing handler for task: ${handler.task}`,
    );
  }
  handlers.set(handler.task, handler);
}

/**
 * Get the handler for a given task. Throws if none is registered.
 */
export function getHandler(task: PipelineTask): TaskHandler {
  const handler = handlers.get(task);
  if (!handler) {
    throw new Error(
      `No handler registered for task "${task}". ` +
        `Register one via registerHandler() in src/core/inference/handlers/.`,
    );
  }
  return handler;
}

/**
 * List all currently registered task types.
 * Useful for debugging and for the Model Status UI.
 */
export function getRegisteredTasks(): PipelineTask[] {
  return Array.from(handlers.keys());
}
