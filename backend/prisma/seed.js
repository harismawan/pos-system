import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

// Create PostgreSQL connection pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DATABASE_POOL_MAX || "10", 10),
  min: parseInt(process.env.DATABASE_POOL_MIN || "1", 10),
  idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || "30000", 10),
  connectionTimeoutMillis: parseInt(
    process.env.DATABASE_CONNECTION_TIMEOUT || "10000",
    10,
  ),
  allowExitOnIdle: false,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Prisma 7: Initialize with adapter
const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: "event", level: "query" },
    { emit: "event", level: "error" },
    { emit: "event", level: "warn" },
  ],
});

async function main() {
  console.log("🌱 Starting seed...");

  // Create default price tiers
  const retailTier = await prisma.priceTier.upsert({
    where: { code: "RETAIL" },
    update: {},
    create: {
      code: "RETAIL",
      name: "Retail",
      description: "Standard retail pricing",
      isDefault: true,
    },
  });

  const wholesaleTier = await prisma.priceTier.upsert({
    where: { code: "WHOLESALE" },
    update: {},
    create: {
      code: "WHOLESALE",
      name: "Wholesale",
      description: "Wholesale pricing for bulk purchases",
      isDefault: false,
    },
  });

  const memberTier = await prisma.priceTier.upsert({
    where: { code: "MEMBER" },
    update: {},
    create: {
      code: "MEMBER",
      name: "Member",
      description: "Member discount pricing",
      isDefault: false,
    },
  });

  console.log("✅ Created price tiers");

  // Create default owner user
  const passwordHash = await bcrypt.hash("password123", 10);

  const owner = await prisma.user.upsert({
    where: { username: "owner" },
    update: {},
    create: {
      username: "owner",
      name: "System Owner",
      passwordHash,
      email: "owner@pos-system.local",
      role: "OWNER",
      isActive: true,
    },
  });

  console.log("✅ Created owner user (username: owner, password: password123)");

  // Create default outlet
  const mainOutlet = await prisma.outlet.upsert({
    where: { code: "MAIN" },
    update: {},
    create: {
      code: "MAIN",
      name: "Main Outlet",
      addressLine1: "123 Main Street",
      city: "Jakarta",
      state: "DKI Jakarta",
      postalCode: "12345",
      country: "Indonesia",
      phone: "+62 21 12345678",
      defaultPriceTierId: retailTier.id,
      isActive: true,
    },
  });

  console.log("✅ Created main outlet");

  // Create outlet-user mapping
  await prisma.outletUser.upsert({
    where: {
      userId_outletId: {
        userId: owner.id,
        outletId: mainOutlet.id,
      },
    },
    update: {},
    create: {
      userId: owner.id,
      outletId: mainOutlet.id,
      outletRole: "MANAGER",
      isDefaultForUser: true,
    },
  });

  console.log("✅ Mapped owner to main outlet");

  // Create default warehouse
  const mainWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH-MAIN" },
    update: {},
    create: {
      code: "WH-MAIN",
      name: "Main Warehouse",
      outletId: mainOutlet.id,
      addressLine1: "123 Main Street",
      city: "Jakarta",
      state: "DKI Jakarta",
      postalCode: "12345",
      country: "Indonesia",
      type: "OUTLET",
      isDefault: true,
      isActive: true,
    },
  });

  console.log("✅ Created main warehouse");

  // Create default POS register
  await prisma.posRegister.upsert({
    where: {
      outletId_code: {
        outletId: mainOutlet.id,
        code: "REG-01",
      },
    },
    update: {},
    create: {
      outletId: mainOutlet.id,
      code: "REG-01",
      name: "Register 1",
      isActive: true,
    },
  });

  console.log("✅ Created POS register");

  // Create sample products
  const sampleProducts = [
    {
      sku: "PROD-001",
      barcode: "1234567890001",
      name: "Sample Product 1",
      description: "This is a sample product",
      category: "Electronics",
      unit: "pcs",
      basePrice: 100000,
      costPrice: 75000,
      taxRate: 11,
    },
    {
      sku: "PROD-002",
      barcode: "1234567890002",
      name: "Sample Product 2",
      description: "Another sample product",
      category: "Electronics",
      unit: "pcs",
      basePrice: 250000,
      costPrice: 180000,
      taxRate: 11,
    },
    {
      sku: "PROD-003",
      barcode: "1234567890003",
      name: "Sample Product 3",
      description: "Yet another sample product",
      category: "Accessories",
      unit: "pcs",
      basePrice: 50000,
      costPrice: 30000,
      taxRate: 11,
    },
  ];

  for (const productData of sampleProducts) {
    const product = await prisma.product.upsert({
      where: { sku: productData.sku },
      update: {},
      create: productData,
    });

    // Create inventory records
    await prisma.inventory.upsert({
      where: {
        productId_warehouseId: {
          productId: product.id,
          warehouseId: mainWarehouse.id,
        },
      },
      update: {},
      create: {
        productId: product.id,
        warehouseId: mainWarehouse.id,
        quantityOnHand: 100,
        minimumStock: 10,
        maximumStock: 500,
      },
    });

    // Create price tier prices
    await prisma.productPriceTier.upsert({
      where: {
        productId_priceTierId_outletId: {
          productId: product.id,
          priceTierId: wholesaleTier.id,
          outletId: mainOutlet.id,
        },
      },
      update: {},
      create: {
        productId: product.id,
        priceTierId: wholesaleTier.id,
        outletId: mainOutlet.id,
        price: productData.basePrice * 0.9, // 10% discount
      },
    });

    await prisma.productPriceTier.upsert({
      where: {
        productId_priceTierId_outletId: {
          productId: product.id,
          priceTierId: memberTier.id,
          outletId: mainOutlet.id,
        },
      },
      update: {},
      create: {
        productId: product.id,
        priceTierId: memberTier.id,
        outletId: mainOutlet.id,
        price: productData.basePrice * 0.95, // 5% discount
      },
    });
  }

  console.log("✅ Created sample products with inventory and pricing");

  // Create a sample customer
  await prisma.customer.upsert({
    where: { email: "customer@example.com" },
    update: {},
    create: {
      name: "John Doe",
      email: "customer@example.com",
      phone: "+62 812 3456 7890",
      addressLine1: "456 Customer Street",
      city: "Jakarta",
      state: "DKI Jakarta",
      postalCode: "12346",
      country: "Indonesia",
      priceTierId: memberTier.id,
      isMember: true,
    },
  });

  console.log("✅ Created sample customer");

  // Create a sample supplier
  await prisma.supplier.upsert({
    where: { id: "seed-supplier-1" },
    update: {},
    create: {
      id: "seed-supplier-1",
      name: "ABC Suppliers Inc.",
      contactPerson: "Jane Smith",
      email: "supplier@abc.com",
      phone: "+62 21 9876 5432",
      addressLine1: "789 Supplier Avenue",
      city: "Jakarta",
      state: "DKI Jakarta",
      postalCode: "12347",
      country: "Indonesia",
      isActive: true,
    },
  });

  console.log("✅ Created sample supplier");

  console.log("🎉 Seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
