import { vi } from 'vitest';

if (!URL.createObjectURL) {
    URL.createObjectURL = vi.fn(() => 'blob:mock');
}

if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = vi.fn();
}

// Vite injects these via `define` at build time; vitest does not, so stub
// them here so anything reading provenance constants under test sees a
// stable value.
(globalThis as Record<string, unknown>).__APP_COMMIT__ = 'test';
(globalThis as Record<string, unknown>).__APP_VERSION__ = '0.0.0-test';
