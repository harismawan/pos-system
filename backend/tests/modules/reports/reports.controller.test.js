import '../../testSetup.js';
import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { createMockFn } from '../../mocks/mockFn.js';

const serviceMock = {
    getSalesSummary: createMockFn(async () => ({ summary: {} })),
    getTopProducts: createMockFn(async () => ({ products: [] })),
    getStockMovementReport: createMockFn(async () => ({ movements: [] })),
    getInventoryValuation: createMockFn(async () => ({ totalValue: 0 })),
    getOrderHistory: createMockFn(async () => ({ orders: [] })),
};

const loggerMock = { error: createMockFn() };

mock.module('../../../src/modules/reports/reports.service.js', () => serviceMock);
mock.module('../../../src/libs/logger.js', () => ({ default: loggerMock }));

const controller = await import('../../../src/modules/reports/reports.controller.js');

describe('modules/reports/reports.controller', () => {
    beforeEach(() => {
        serviceMock.getSalesSummary.mockReset();
        serviceMock.getSalesSummary.mockResolvedValue({ summary: {} });
        serviceMock.getTopProducts.mockReset();
        serviceMock.getTopProducts.mockResolvedValue({ products: [] });
        serviceMock.getStockMovementReport.mockReset();
        serviceMock.getStockMovementReport.mockResolvedValue({ movements: [] });
        serviceMock.getInventoryValuation.mockReset();
        serviceMock.getInventoryValuation.mockResolvedValue({ totalValue: 0 });
        serviceMock.getOrderHistory.mockReset();
        serviceMock.getOrderHistory.mockResolvedValue({ orders: [] });
        loggerMock.error.mockReset();
    });

    it('passes outletId from store for sales summary', async () => {
        const set = {};
        const store = { outletId: 'out-1' };
        const res = await controller.getSalesSummaryController({ query: {}, store, set });

        expect(res.success).toBe(true);
        expect(serviceMock.getSalesSummary.calls[0][0].outletId).toBe('out-1');
    });

    it('returns error when sales summary fails with status code', async () => {
        const set = {};
        const err = new Error('bad');
        err.statusCode = 400;
        serviceMock.getSalesSummary.mockImplementation(async () => { throw err; });

        const res = await controller.getSalesSummaryController({ query: {}, store: {}, set });
        expect(set.status).toBe(400);
        expect(res.error).toBe('bad');
    });

    it('passes outletId from query for top products', async () => {
        const set = {};
        const res = await controller.getTopProductsController({ query: { outletId: 'q-1' }, store: {}, set });

        expect(res.success).toBe(true);
        expect(serviceMock.getTopProducts.calls[0][0].outletId).toBe('q-1');
    });

    it('returns error when top products fails', async () => {
        const set = {};
        serviceMock.getTopProducts.mockImplementation(async () => { throw new Error('fail'); });

        const res = await controller.getTopProductsController({ query: {}, store: {}, set });
        expect(set.status).toBe(500);
        expect(res.error).toBe('Internal Server Error');
    });

    it('returns inventory valuation', async () => {
        const set = {};
        const res = await controller.getInventoryValuationController({ query: { warehouseId: 'w1' }, set });

        expect(res.success).toBe(true);
        expect(serviceMock.getInventoryValuation.calls[0][0].warehouseId).toBe('w1');
    });

    it('returns error when inventory valuation fails with custom status', async () => {
        const set = {};
        const err = new Error('cannot calc');
        err.statusCode = 422;
        serviceMock.getInventoryValuation.mockImplementation(async () => { throw err; });

        const res = await controller.getInventoryValuationController({ query: {}, set });
        expect(set.status).toBe(422);
        expect(res.error).toBe('cannot calc');
    });

    it('returns error when stock movement report fails', async () => {
        const set = {};
        const store = { outletId: 'out-1' };
        serviceMock.getStockMovementReport.mockImplementation(async () => { throw new Error('boom'); });

        const res = await controller.getStockMovementsController({ query: {}, store, set });

        expect(set.status).toBe(500);
        expect(res.success).toBe(false);

        serviceMock.getStockMovementReport.mockImplementation(async () => ({ movements: [] }));
    });

    it('passes outletId from query for stock movements', async () => {
        const set = {};
        const res = await controller.getStockMovementsController({ query: { outletId: 'q-2' }, store: {}, set });

        expect(res.success).toBe(true);
        expect(serviceMock.getStockMovementReport.calls[0][0].outletId).toBe('q-2');
    });

    it('returns order history and prefers store outlet', async () => {
        const set = {};
        const res = await controller.getOrderHistoryController({ query: { outletId: 'q-3' }, store: { outletId: 'store-1' }, set });

        expect(res.success).toBe(true);
        expect(serviceMock.getOrderHistory.calls[0][0].outletId).toBe('store-1');
    });

    it('returns error when order history fails', async () => {
        const set = {};
        serviceMock.getOrderHistory.mockImplementation(async () => { throw new Error('fail'); });

        const res = await controller.getOrderHistoryController({ query: {}, store: {}, set });
        expect(set.status).toBe(500);
        expect(res.error).toBe('Internal Server Error');
    });
});
