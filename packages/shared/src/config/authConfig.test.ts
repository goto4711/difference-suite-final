import { describe, expect, it } from 'vitest';
import { checkDomain } from './authConfig';

describe('checkDomain', () => {
    it('accepts explicitly allowed domains and their subdomains', () => {
        expect(checkDomain('researcher@tum.de')).toBe(true);
        expect(checkDomain('researcher@lab.tum.de')).toBe(true);
    });

    it('accepts academic regex domains', () => {
        expect(checkDomain('scholar@archive.edu')).toBe(true);
        expect(checkDomain('scholar@dept.archive.ac.uk')).toBe(true);
    });

    it('rejects non-academic addresses', () => {
        expect(checkDomain('reader@example.com')).toBe(false);
        expect(checkDomain('reader@tum.example')).toBe(false);
    });
});
