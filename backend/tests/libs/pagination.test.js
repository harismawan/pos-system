import '../testSetup.js';
import { describe, it, expect } from 'bun:test';
import { normalizePagination, buildPaginationMeta, PAGINATION_DEFAULTS } from '../../src/libs/pagination.js';

describe('libs/pagination', () => {
    it('falls back to defaults for invalid values', () => {
        const result = normalizePagination({ page: 'not-a-number', limit: '-5' });
        expect(result).toEqual({
            page: PAGINATION_DEFAULTS.page,
            limit: PAGINATION_DEFAULTS.limit,
            skip: 0,
        });
    });

    it('enforces maximum limit', () => {
        const result = normalizePagination({ page: '2', limit: '1000' }, { maxLimit: 50 });
        expect(result).toEqual({
            page: 2,
            limit: 50,
            skip: 50,
        });
    });

    it('builds pagination metadata', () => {
        const meta = buildPaginationMeta(55, 3, 10);
        expect(meta).toEqual({
            total: 55,
            page: 3,
            limit: 10,
            totalPages: 6,
            hasNext: true,
            hasPrev: true,
        });
    });
});
