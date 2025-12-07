import '../../testSetup.js';
import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { createMockFn } from '../../mocks/mockFn.js';

const defaultImplementations = {
    resolvePrice: async () => ({ effectivePrice: 10 }),
    getPriceTiers: async () => [],
    createPriceTier: async (body) => ({ id: 'tier1', ...body }),
    updatePriceTier: async (id, body) => ({ id, ...body }),
    getProductPrices: async () => [{ id: 'pp1' }],
    setProductPrice: async (data) => ({ id: 'pp1', price: 10, ...data }),
};

const serviceMock = {
    resolvePrice: createMockFn(defaultImplementations.resolvePrice),
    getPriceTiers: createMockFn(defaultImplementations.getPriceTiers),
    createPriceTier: createMockFn(defaultImplementations.createPriceTier),
    updatePriceTier: createMockFn(defaultImplementations.updatePriceTier),
    getProductPrices: createMockFn(defaultImplementations.getProductPrices),
    setProductPrice: createMockFn(defaultImplementations.setProductPrice),
};

const loggerMock = { error: createMockFn() };

mock.module('../../../src/modules/pricing/pricing.service.js', () => serviceMock);
mock.module('../../../src/libs/logger.js', () => ({ default: loggerMock }));

const controller = await import('../../../src/modules/pricing/pricing.controller.js');

const resetServiceMocks = () => {
    Object.entries(defaultImplementations).forEach(([key, impl]) => {
        serviceMock[key].mockReset();
        serviceMock[key].mockImplementation(impl);
    });
};

describe('modules/pricing/pricing.controller', () => {
    beforeEach(() => {
        resetServiceMocks();
        loggerMock.error.mockReset();
    });

    it('returns 400 when required params missing', async () => {
        const set = {};
        const res = await controller.getPriceQuoteController({ query: {}, store: {}, set });
        expect(set.status).toBe(400);
        expect(res.success).toBe(false);
    });

    it('returns success when params provided and prefers store outletId', async () => {
        const set = {};
        const store = { outletId: 'out-1' };
        const res = await controller.getPriceQuoteController({
            query: { productId: 'p1' },
            store,
            set,
        });
        expect(res.success).toBe(true);
        const [productId, outletId, customerId] = serviceMock.resolvePrice.calls[0];
        expect(productId).toBe('p1');
        expect(outletId).toBe('out-1');
        expect(customerId).toBeUndefined();
    });

    it('handles price quote service errors with custom status code', async () => {
        const set = {};
        serviceMock.resolvePrice.mockImplementation(async () => {
            const err = new Error('not found');
            err.statusCode = 404;
            throw err;
        });

        const res = await controller.getPriceQuoteController({
            query: { productId: 'p1', outletId: 'out1' },
            store: {},
            set,
        });
        expect(set.status).toBe(404);
        expect(res.error).toBe('not found');
        expect(loggerMock.error.calls.length).toBe(1);
    });

    it('sets status 201 on successful price tier creation', async () => {
        const set = {};
        const res = await controller.createPriceTierController({ body: { name: 'Tier' }, set });
        expect(set.status).toBe(201);
        expect(res.success).toBe(true);
        expect(res.data.name).toBe('Tier');
    });

    it('handles price tier creation errors', async () => {
        const set = {};
        serviceMock.createPriceTier.mockImplementation(async () => { throw new Error('fail'); });

        const res = await controller.createPriceTierController({ body: {}, set });
        expect(set.status).toBe(500);
        expect(res.success).toBe(false);
        expect(loggerMock.error.calls.length).toBe(1);
    });

    it('returns price tiers list', async () => {
        const set = {};
        const res = await controller.getPriceTiersController({ set });
        expect(res.success).toBe(true);
        expect(serviceMock.getPriceTiers.calls.length).toBeGreaterThan(0);
    });

    it('handles price tiers errors', async () => {
        const set = {};
        serviceMock.getPriceTiers.mockImplementation(async () => {
            const err = new Error('db down');
            err.statusCode = 503;
            throw err;
        });

        const res = await controller.getPriceTiersController({ set });
        expect(set.status).toBe(503);
        expect(res.error).toBe('db down');
        expect(loggerMock.error.calls.length).toBe(1);
    });

    it('returns updated price tier', async () => {
        const set = {};
        const res = await controller.updatePriceTierController({ params: { id: 'tier1' }, body: { name: 'Updated' }, set });
        expect(res.success).toBe(true);
        expect(serviceMock.updatePriceTier.calls.length).toBeGreaterThan(0);
    });

    it('handles update price tier errors', async () => {
        const set = {};
        serviceMock.updatePriceTier.mockImplementation(async () => { throw new Error('fail'); });

        const res = await controller.updatePriceTierController({ params: { id: 'tier1' }, body: {}, set });
        expect(set.status).toBe(500);
        expect(res.error).toBe('Internal Server Error');
        expect(loggerMock.error.calls.length).toBe(1);
    });

    it('returns product prices', async () => {
        const set = {};
        const res = await controller.getProductPricesController({ params: { productId: 'p1' }, set });
        expect(res.success).toBe(true);
        expect(serviceMock.getProductPrices.calls.length).toBeGreaterThan(0);
    });

    it('handles product prices errors', async () => {
        const set = {};
        serviceMock.getProductPrices.mockImplementation(async () => { throw new Error('db'); });

        const res = await controller.getProductPricesController({ params: { productId: 'p1' }, set });
        expect(set.status).toBe(500);
        expect(res.error).toBe('Internal Server Error');
        expect(loggerMock.error.calls.length).toBe(1);
    });

    it('handles set product price errors', async () => {
        const set = {};
        serviceMock.setProductPrice.mockImplementation(async () => { throw new Error('fail'); });

        const res = await controller.setProductPriceController({ params: { productId: 'p1' }, body: { price: 1 }, set });
        expect(set.status).toBe(500);
        expect(res.success).toBe(false);
        expect(loggerMock.error.calls.length).toBe(1);
    });

    it('sets product price successfully and merges productId', async () => {
        const set = {};
        const res = await controller.setProductPriceController({ params: { productId: 'p1' }, body: { price: 1 }, set });
        expect(res.success).toBe(true);
        const callArgs = serviceMock.setProductPrice.calls[0][0];
        expect(callArgs.productId).toBe('p1');
        expect(callArgs.price).toBe(1);
    });
});
