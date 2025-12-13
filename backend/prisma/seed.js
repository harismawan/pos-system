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

async function seedBusiness(config) {
  const {
    code,
    name,
    description,
    ownerUsername,
    ownerEmail,
    outletCode,
    outletName,
    warehouseCode,
    products,
    supplierName,
    supplierEmail,
    customerName,
    customerEmail,
  } = config;

  console.log(`🌱 Seeding business: ${name} (${code})...`);

  // Create business
  const business = await prisma.business.upsert({
    where: { code },
    update: {},
    create: {
      code,
      name,
      description,
      isActive: true,
    },
  });

  console.log(`✅ Created business: ${name}`);

  // Create price tiers
  const retailTier = await prisma.priceTier.upsert({
    where: {
      businessId_code: {
        businessId: business.id,
        code: "RETAIL",
      },
    },
    update: {},
    create: {
      businessId: business.id,
      code: "RETAIL",
      name: "Retail",
      description: "Standard retail pricing",
      isDefault: true,
    },
  });

  const wholesaleTier = await prisma.priceTier.upsert({
    where: {
      businessId_code: {
        businessId: business.id,
        code: "WHOLESALE",
      },
    },
    update: {},
    create: {
      businessId: business.id,
      code: "WHOLESALE",
      name: "Wholesale",
      description: "Wholesale pricing for bulk purchases",
      isDefault: false,
    },
  });

  const memberTier = await prisma.priceTier.upsert({
    where: {
      businessId_code: {
        businessId: business.id,
        code: "MEMBER",
      },
    },
    update: {},
    create: {
      businessId: business.id,
      code: "MEMBER",
      name: "Member",
      description: "Member discount pricing",
      isDefault: false,
    },
  });

  // Create owner user
  const passwordHash = await bcrypt.hash("password123", 10);

  const owner = await prisma.user.upsert({
    where: { username: ownerUsername },
    update: {},
    create: {
      businessId: business.id,
      username: ownerUsername,
      name: `Owner of ${name}`,
      passwordHash,
      email: ownerEmail,
      role: "OWNER",
      isActive: true,
    },
  });

  console.log(`✅ Created user: ${ownerUsername}`);

  // Create outlet
  const outlet = await prisma.outlet.upsert({
    where: {
      businessId_code: {
        businessId: business.id,
        code: outletCode,
      },
    },
    update: {},
    create: {
      businessId: business.id,
      code: outletCode,
      name: outletName,
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

  console.log(`✅ Created outlet: ${outletName}`);

  // Outlet User
  await prisma.outletUser.upsert({
    where: {
      userId_outletId: {
        userId: owner.id,
        outletId: outlet.id,
      },
    },
    update: {},
    create: {
      userId: owner.id,
      outletId: outlet.id,
      outletRole: "MANAGER",
      isDefaultForUser: true,
    },
  });

  // Create warehouse
  const warehouse = await prisma.warehouse.upsert({
    where: {
      outletId_code: {
        outletId: outlet.id,
        code: warehouseCode,
      },
    },
    update: {},
    create: {
      code: warehouseCode,
      name: `${outletName} Warehouse`,
      outletId: outlet.id,
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

  // Create POS Register
  await prisma.posRegister.upsert({
    where: {
      outletId_code: {
        outletId: outlet.id,
        code: "REG-01",
      },
    },
    update: {},
    create: {
      outletId: outlet.id,
      code: "REG-01",
      name: "Register 1",
      isActive: true,
    },
  });

  // Create products
  for (const productData of products) {
    const product = await prisma.product.upsert({
      where: {
        businessId_sku: {
          businessId: business.id,
          sku: productData.sku,
        },
      },
      update: {},
      create: {
        businessId: business.id,
        ...productData,
      },
    });

    // Inventory
    await prisma.inventory.upsert({
      where: {
        productId_warehouseId: {
          productId: product.id,
          warehouseId: warehouse.id,
        },
      },
      update: {},
      create: {
        productId: product.id,
        warehouseId: warehouse.id,
        quantityOnHand: 100,
        minimumStock: 10,
        maximumStock: 500,
      },
    });

    // Prices
    await prisma.productPriceTier.upsert({
      where: {
        productId_priceTierId_outletId: {
          productId: product.id,
          priceTierId: wholesaleTier.id,
          outletId: outlet.id,
        },
      },
      update: {},
      create: {
        productId: product.id,
        priceTierId: wholesaleTier.id,
        outletId: outlet.id,
        price: productData.basePrice * 0.9,
      },
    });

    await prisma.productPriceTier.upsert({
      where: {
        productId_priceTierId_outletId: {
          productId: product.id,
          priceTierId: memberTier.id,
          outletId: outlet.id,
        },
      },
      update: {},
      create: {
        productId: product.id,
        priceTierId: memberTier.id,
        outletId: outlet.id,
        price: productData.basePrice * 0.95,
      },
    });
  }

  // Customer
  await prisma.customer.upsert({
    where: {
      businessId_email: {
        businessId: business.id,
        email: customerEmail,
      },
    },
    update: {},
    create: {
      businessId: business.id,
      name: customerName,
      email: customerEmail,
      phone: "+62 812 3456 7890",
      addressLine1: "456 Customer Street",
      city: "Jakarta",
      country: "Indonesia",
      priceTierId: memberTier.id,
      isMember: true,
    },
  });

  // Supplier
  const existingSupplier = await prisma.supplier.findFirst({
    where: {
      businessId: business.id,
      email: supplierEmail,
    },
  });

  if (existingSupplier) {
    await prisma.supplier.update({
      where: { id: existingSupplier.id },
      data: {
        name: supplierName,
        contactPerson: "Manager",
        phone: "+62 21 9876 5432",
        addressLine1: "789 Supplier Avenue",
        city: "Jakarta",
        country: "Indonesia",
        isActive: true,
      },
    });
  } else {
    await prisma.supplier.create({
      data: {
        businessId: business.id,
        name: supplierName,
        contactPerson: "Manager",
        email: supplierEmail,
        phone: "+62 21 9876 5432",
        addressLine1: "789 Supplier Avenue",
        city: "Jakarta",
        country: "Indonesia",
        isActive: true,
      },
    });
  }

  console.log(`✨ Completed seeding business: ${name}\n`);
}

async function main() {
  console.log("🚀 Starting multi-business seed...");

  // Business 1: Default
  await seedBusiness({
    code: "DEFAULT",
    name: "Default Business",
    description: "Default business for development",
    ownerUsername: "owner",
    ownerEmail: "owner@pos-system.local",
    outletCode: "MAIN",
    outletName: "Main Outlet",
    warehouseCode: "WH-MAIN",
    products: [
      {
        sku: "PROD-001",
        barcode: "1234567890001",
        name: "Sample Product 1",
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
        category: "Electronics",
        unit: "pcs",
        basePrice: 250000,
        costPrice: 180000,
        taxRate: 11,
      },
    ],
    supplierName: "ABC Suppliers Inc.",
    supplierEmail: "supplier@abc.com",
    customerName: "John Doe",
    customerEmail: "customer@example.com",
  });

  // Business 2: Retail Corp (Testing Isolation)
  await seedBusiness({
    code: "RETAIL_CORP",
    name: "Retail Corp",
    description: "Second business for isolation testing",
    ownerUsername: "retail_owner",
    ownerEmail: "owner@retail-corp.local",
    outletCode: "RET-01",
    outletName: "Retail Store 1",
    warehouseCode: "WH-RET-01",
    products: [
      {
        sku: "RET-PROD-001",
        barcode: "9999999990001",
        name: "Retail Product 1",
        category: "Clothing",
        unit: "pcs",
        basePrice: 150000,
        costPrice: 80000,
        taxRate: 11,
      },
    ],
    supplierName: "Global Imports",
    supplierEmail: "info@globalimports.com",
    customerName: "Jane Smith",
    customerEmail: "jane@example.com",
  });

  console.log("🎉 All seeds completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
