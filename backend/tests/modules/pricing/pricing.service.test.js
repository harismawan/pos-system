import '../../testSetup.js';
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createPrismaMock } from '../../mocks/prisma.js';

const prismaMock = createPrismaMock();

mock.module('../../../src/libs/prisma.js', () => ({ default: prismaMock }));

// Use unique query to avoid prior mocks from other tests
const pricingService = await import('../../../src/modules/pricing/pricing.service.js?real');

const resetPrismaMocks = () => {
    [
        prismaMock.product,
        prismaMock.customer,
        prismaMock.outlet,
        prismaMock.priceTier,
        prismaMock.productPriceTier,
    ].forEach((model) => {
        if (!model) return;
        Object.values(model).forEach((fn) => fn.mockReset?.());
    });
};

describe('modules/pricing/pricing.service', () => {
    beforeEach(() => {
        resetPrismaMocks();
    });

    it('falls back to default price tier and base price when no overrides exist', async () => {
        prismaMock.product.findUnique.mockImplementation(async () => ({
            id: 'p1',
            name: 'Product',
            basePrice: 10,
            costPrice: 5,
            taxRate: null,
        }));
        prismaMock.priceTier.findFirst.mockResolvedValue({
            id: 'tier-1',
            name: 'Default',
            code: 'DEF',
        });
        prismaMock.productPriceTier.findFirst.mockResolvedValue(null);

        const result = await pricingService.resolvePrice('p1', 'out-1', null);

        expect(result.effectivePrice).toBe(10);
        expect(result.tierSource).toBe('default');
        expect(result.priceSource).toBe('base_price');
    });

    it('uses outlet default tier when customer tier missing and no tier pricing overrides', async () => {
        prismaMock.product.findUnique.mockResolvedValue({
            id: 'p1',
            name: 'Prod',
            basePrice: 30,
            costPrice: 20,
            taxRate: 1.5,
        });
        prismaMock.customer.findUnique.mockResolvedValue({ priceTier: null });
        prismaMock.outlet.findUnique.mockResolvedValue({ defaultPriceTier: { id: 'ot1', name: 'Outlet', code: 'O' } });
        prismaMock.productPriceTier.findFirst.mockResolvedValue(null);

        const result = await pricingService.resolvePrice('p1', 'out-9', 'cust-9');
        expect(result.effectivePrice).toBe(30);
        expect(result.priceSource).toBe('base_price');
        expect(result.tierSource).toBe('outlet');
    });

    it('unsets other defaults when creating default price tier', async () => {
        prismaMock.priceTier.create.mockImplementation(async (args) => ({ id: 't1', ...args.data }));

        const created = await pricingService.createPriceTier({ name: 'Tier', code: 'T', isDefault: true });

        expect(prismaMock.priceTier.updateMany.calls.length).toBeGreaterThan(0);
        expect(created.id).toBe('t1');
    });

    it('skips unsetting defaults when creating non-default price tier', async () => {
        await pricingService.createPriceTier({ name: 'Tier', code: 'T', isDefault: false });
        expect(prismaMock.priceTier.updateMany.calls.length).toBe(0);
    });

    it('throws when product is missing', async () => {
        prismaMock.product.findUnique.mockResolvedValue(null);
        await expect(pricingService.resolvePrice('missing', 'out', null)).rejects.toThrow('Product not found');
    });

    it('uses customer tier and outlet-specific price when available', async () => {
        prismaMock.product.findUnique.mockResolvedValue({
            id: 'p1',
            name: 'Prod',
            basePrice: 20,
            costPrice: 10,
            taxRate: null,
        });
        prismaMock.customer.findUnique.mockResolvedValue({
            priceTier: { id: 'ct1', name: 'CustTier', code: 'CT' },
        });
        prismaMock.productPriceTier.findFirst.mockImplementation(async ({ where }) => {
            if (where.outletId) {
                return { price: 15 };
            }
            return null;
        });

        const result = await pricingService.resolvePrice('p1', 'out-1', 'cust-1');
        expect(result.effectivePrice).toBe(15);
        expect(result.tierSource).toBe('customer');
        expect(result.priceSource).toBe('outlet_tier_price');
    });

    it('falls back to global tier price when outlet price missing', async () => {
        prismaMock.product.findUnique.mockResolvedValue({
            id: 'p1',
            name: 'Prod',
            basePrice: 20,
            costPrice: 10,
            taxRate: null,
        });
        prismaMock.customer.findUnique.mockResolvedValue({ priceTier: null });
        prismaMock.outlet.findUnique.mockResolvedValue({ defaultPriceTier: { id: 't1', name: 'Tier', code: 'T' } });
        let call = 0;
        prismaMock.productPriceTier.findFirst.mockImplementation(async ({ where }) => {
            call += 1;
            if (call === 1) return null; // outlet price
            return { price: 12 }; // global
        });

        const result = await pricingService.resolvePrice('p1', 'out-1', null);
        expect(result.effectivePrice).toBe(12);
        expect(result.priceSource).toBe('global_tier_price');
        expect(result.tierSource).toBe('outlet');
    });

    it('sets product price via upsert', async () => {
        prismaMock.productPriceTier.upsert.mockImplementation(async ({ create }) => ({ ...create, id: 'ppt1' }));
        const res = await pricingService.setProductPrice({ productId: 'p1', priceTierId: 't1', outletId: null, price: 5 });
        expect(res.id).toBe('ppt1');
        const upsertArgs = prismaMock.productPriceTier.upsert.calls[0][0];
        expect(upsertArgs.where.productId_priceTierId_outletId.productId).toBe('p1');
    });

    it('returns price quote for multiple items', async () => {
        prismaMock.product.findUnique.mockResolvedValue({
            id: 'p1',
            name: 'Prod',
            basePrice: 10,
            costPrice: 5,
            taxRate: null,
        });
        prismaMock.priceTier.findFirst.mockResolvedValue(null);
        prismaMock.productPriceTier.findFirst.mockResolvedValue(null);

        const res = await pricingService.getPriceQuote([{ productId: 'p1' }, { productId: 'p1' }], 'out-1', null);
        expect(res.length).toBe(2);
    });

    it('returns price tiers sorted ascending by name', async () => {
        prismaMock.priceTier.findMany.mockResolvedValue([{ id: 't1' }]);
        const res = await pricingService.getPriceTiers();
        expect(res[0].id).toBe('t1');
        const args = prismaMock.priceTier.findMany.calls[0][0];
        expect(args.orderBy.name).toBe('asc');
    });

    it('updates price tier and unsets other defaults when flagged', async () => {
        prismaMock.priceTier.update.mockResolvedValue({ id: 't1', name: 'New' });
        const res = await pricingService.updatePriceTier('t1', { name: 'New', isDefault: true });
        expect(res.id).toBe('t1');
        expect(prismaMock.priceTier.updateMany.calls.length).toBe(1);
        const updateManyArgs = prismaMock.priceTier.updateMany.calls[0][0];
        expect(updateManyArgs.where.id.not).toBe('t1');
    });

    it('updates price tier without touching defaults when not flagged', async () => {
        await pricingService.updatePriceTier('t1', { name: 'New' });
        expect(prismaMock.priceTier.updateMany.calls.length).toBe(0);
    });

    it('returns product prices with relations', async () => {
        prismaMock.productPriceTier.findMany.mockResolvedValue([{ id: 'pp1' }]);
        const res = await pricingService.getProductPrices('p1');
        expect(res[0].id).toBe('pp1');
        const args = prismaMock.productPriceTier.findMany.calls[0][0];
        expect(args.include.priceTier).toBe(true);
        expect(args.orderBy.createdAt).toBe('desc');
    });
});
