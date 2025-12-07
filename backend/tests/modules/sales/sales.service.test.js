import '../../testSetup.js';
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createPrismaMock } from '../../mocks/prisma.js';
import { createMockFn } from '../../mocks/mockFn.js';

const prismaMock = createPrismaMock();
const pricingMock = { resolvePrice: createMockFn(async () => ({ effectivePrice: 10, taxRate: 0 })) };
const jobsMock = { enqueueAuditLogJob: createMockFn(), enqueueEmailNotificationJob: createMockFn() };
const loggerMock = { info: createMockFn(), error: createMockFn(), warn: createMockFn(), debug: createMockFn(), child: createMockFn(() => loggerMock) };

mock.module('../../../src/libs/prisma.js', () => ({ default: prismaMock }));
mock.module('../../../src/modules/pricing/pricing.service.js', () => pricingMock);
mock.module('../../../src/libs/jobs.js', () => jobsMock);
mock.module('../../../src/libs/logger.js', () => ({ default: loggerMock }));

const salesService = await import('../../../src/modules/sales/sales.service.js?service');

describe('modules/sales/sales.service', () => {
    beforeEach(() => {
        prismaMock.posOrder.findUnique.mockReset?.();
        prismaMock.posOrder.findMany.mockReset?.();
        prismaMock.posOrder.count.mockReset?.();
        prismaMock.posOrder.create.mockReset?.();
        prismaMock.posOrder.update.mockReset?.();
        prismaMock.outlet.findUnique?.mockReset?.();
        prismaMock.stockMovement.create?.mockReset?.();
        prismaMock.inventory.findUnique?.mockReset?.();
        prismaMock.inventory.update?.mockReset?.();
        prismaMock.payment.create?.mockReset?.();
        prismaMock.payment.findMany?.mockReset?.();
        jobsMock.enqueueAuditLogJob.mockReset();
        jobsMock.enqueueEmailNotificationJob.mockReset();
        loggerMock.info.mockReset();
        pricingMock.resolvePrice.mockReset();
        pricingMock.resolvePrice.mockResolvedValue({ effectivePrice: 10, taxRate: 0 });
    });

    it('throws when completing an order that is not open', async () => {
        prismaMock.posOrder.findUnique.mockImplementation(async () => ({
            id: 'o1',
            status: 'COMPLETED',
            paymentStatus: 'PAID',
        }));

        await expect(salesService.completePosOrder('o1', 'u1')).rejects.toThrow('Order is not open');
    });

    it('throws when completing an unpaid order', async () => {
        prismaMock.posOrder.findUnique.mockImplementation(async () => ({
            id: 'o1',
            status: 'OPEN',
            paymentStatus: 'PARTIAL',
        }));

        await expect(salesService.completePosOrder('o1', 'u1')).rejects.toThrow('Order must be fully paid before completion');
    });

    it('creates POS order with calculated totals and price tiers', async () => {
        prismaMock.outlet.findUnique.mockResolvedValue({ code: 'OUT1' });
        let createArgs;
        prismaMock.posOrder.create.mockImplementation(async (args) => {
            createArgs = args;
            return { id: 'o1', ...args.data };
        });
        let priceCall = 0;
        pricingMock.resolvePrice.mockImplementation(async () => {
            priceCall += 1;
            if (priceCall === 1) {
                return { effectivePrice: 10, taxRate: 10, priceTier: { id: 'tier1' } };
            }
            return { effectivePrice: 5, taxRate: 0 };
        });
        const originalRandom = Math.random;
        Math.random = () => 0.1234;

        const order = await salesService.createPosOrder({
            outletId: 'out-1',
            warehouseId: 'w1',
            registerId: 'r1',
            customerId: 'c1',
            items: [
                { productId: 'p1', quantity: 2, discountAmount: 1 },
                { productId: 'p2', quantity: 1 },
            ],
            notes: 'note',
        }, 'u1');

        Math.random = originalRandom;

        expect(order.id).toBe('o1');
        expect(createArgs.data.items.create[0].effectivePriceTierId).toBe('tier1');
        expect(createArgs.data.totalAmount).toBeCloseTo(25.9);
        expect(createArgs.data.totalTaxAmount).toBeCloseTo(1.9);
        expect(createArgs.data.orderNumber.startsWith('OUT1-')).toBe(true);
        expect(loggerMock.info.calls.length).toBe(1);
    });

    it('gets POS orders with filters and pagination', async () => {
        prismaMock.posOrder.findMany.mockResolvedValue([{ id: 'o1' }]);
        prismaMock.posOrder.count.mockResolvedValue(1);

        const res = await salesService.getPosOrders({
            outletId: 'out-1',
            status: 'OPEN',
            customerId: 'c1',
            cashierId: 'u1',
            page: 2,
            limit: 5,
        });

        const args = prismaMock.posOrder.findMany.calls[0][0];
        expect(args.where).toEqual({
            outletId: 'out-1',
            status: 'OPEN',
            customerId: 'c1',
            cashierId: 'u1',
        });
        expect(args.skip).toBe(5);
        expect(res.pagination.totalPages).toBe(1);
    });

    it('returns POS order by id', async () => {
        prismaMock.posOrder.findUnique.mockResolvedValue({ id: 'o1', items: [], payments: [] });

        const res = await salesService.getPosOrderById('o1');

        expect(res.id).toBe('o1');
        const args = prismaMock.posOrder.findUnique.calls[0][0];
        expect(args.include.items.include.product).toBe(true);
    });

    it('completes order, updates inventory, and enqueues jobs', async () => {
        prismaMock.posOrder.findUnique.mockResolvedValue({
            id: 'o1',
            status: 'OPEN',
            paymentStatus: 'PAID',
            warehouseId: 'w1',
            outletId: 'out-1',
            orderNumber: 'POS-1',
            totalAmount: 20,
            customer: { name: 'Cust', email: 'a@test.com' },
            items: [{ productId: 'p1', quantity: 2 }],
        });
        prismaMock.inventory.findUnique.mockResolvedValue({ id: 'inv1' });
        prismaMock.posOrder.update.mockResolvedValue({ id: 'o1', status: 'COMPLETED' });

        const res = await salesService.completePosOrder('o1', 'u1');

        expect(res.status).toBe('COMPLETED');
        expect(prismaMock.stockMovement.create.calls.length).toBe(1);
        expect(prismaMock.inventory.update.calls.length).toBe(1);
        expect(jobsMock.enqueueAuditLogJob.calls.at(-1)[0].eventType).toBe('SALE_COMPLETED');
        expect(jobsMock.enqueueEmailNotificationJob.calls.length).toBe(1);
        expect(loggerMock.info.calls.length).toBe(1);
    });

    it('completes order without sending email when customer missing', async () => {
        prismaMock.posOrder.findUnique.mockResolvedValue({
            id: 'o1',
            status: 'OPEN',
            paymentStatus: 'PAID',
            warehouseId: 'w1',
            outletId: 'out-1',
            orderNumber: 'POS-1',
            totalAmount: 20,
            customer: null,
            items: [{ productId: 'p1', quantity: 1 }],
        });
        prismaMock.inventory.findUnique.mockResolvedValue({ id: 'inv1' });
        prismaMock.posOrder.update.mockResolvedValue({ id: 'o1', status: 'COMPLETED' });

        await salesService.completePosOrder('o1', 'u1');

        expect(jobsMock.enqueueEmailNotificationJob.calls.length).toBe(0);
    });

    it('cancels order and enqueues audit log', async () => {
        prismaMock.posOrder.findUnique.mockResolvedValue({
            id: 'o1',
            status: 'OPEN',
            outletId: 'out-1',
            orderNumber: 'POS-1',
        });
        prismaMock.posOrder.update.mockResolvedValue({ id: 'o1', status: 'CANCELLED' });

        const res = await salesService.cancelPosOrder('o1', 'u1');

        expect(res.status).toBe('CANCELLED');
        expect(jobsMock.enqueueAuditLogJob.calls.at(-1)[0].eventType).toBe('SALE_CANCELLED');
    });

    it('throws when cancelling non-open order', async () => {
        prismaMock.posOrder.findUnique.mockResolvedValue({ id: 'o1', status: 'COMPLETED' });

        await expect(salesService.cancelPosOrder('o1', 'u1')).rejects.toThrow('Only open orders can be cancelled');
    });

    it('adds payment and updates status to PAID', async () => {
        prismaMock.posOrder.findUnique.mockResolvedValue({ id: 'o1', status: 'OPEN', totalAmount: 100 });
        prismaMock.payment.create.mockResolvedValue({ id: 'pay1' });
        prismaMock.payment.findMany.mockResolvedValue([{ amount: 100 }]);
        prismaMock.posOrder.update.mockResolvedValue({ id: 'o1', paymentStatus: 'PAID' });

        const res = await salesService.addPayment('o1', { method: 'CASH', amount: 100 });

        expect(res.order.paymentStatus).toBe('PAID');
        expect(loggerMock.info.calls.length).toBe(1);
    });

    it('adds payment and sets status to PARTIAL', async () => {
        prismaMock.posOrder.findUnique.mockResolvedValue({ id: 'o1', status: 'OPEN', totalAmount: 100 });
        prismaMock.payment.create.mockResolvedValue({ id: 'pay1' });
        prismaMock.payment.findMany.mockResolvedValue([{ amount: 50 }]);
        prismaMock.posOrder.update.mockResolvedValue({ id: 'o1', paymentStatus: 'PARTIAL' });

        const res = await salesService.addPayment('o1', { method: 'CARD', amount: 50 });

        expect(res.order.paymentStatus).toBe('PARTIAL');
    });

    it('throws when adding payment to non-open order', async () => {
        prismaMock.posOrder.findUnique.mockResolvedValue({ id: 'o1', status: 'COMPLETED' });

        await expect(salesService.addPayment('o1', { method: 'CARD', amount: 10 }))
            .rejects.toThrow('Cannot add payment to non-open order');
    });
});
