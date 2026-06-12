import { vi } from 'vitest';

if (!URL.createObjectURL) {
    URL.createObjectURL = vi.fn(() => 'blob:mock');
}

if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = vi.fn();
}
