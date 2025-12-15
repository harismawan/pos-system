# POS System - Modular Monorepo

A comprehensive **Point of Sale (POS)** system built with a modular monorepo architecture, featuring multi-outlet support, advanced inventory management, tiered pricing, and Redis-based background workers.

## 🚀 Features

- **Multi-Outlet Management**: Support for multiple branches/outlets with separate warehouses
- **Tiered Pricing**: Customer-specific, outlet-specific, and global pricing tiers
- **Inventory Management**: Real-time stock tracking with automated movements
- **Purchase Orders**: Complete procurement workflow from ordering to receiving
- **POS Operations**: Full sales transaction flow with multiple payment methods
- **Background Workers**: Redis-based job queue for audit logs, emails, and reports
- **Role-Based Access Control**: User permissions at global and outlet levels

## 📁 Project Structure

```
pos-system/
├── backend/              # Elysia + Bun API server
│   ├── src/
│   │   ├── modules/      # Domain modules (auth, products, sales, etc.)
│   │   ├── libs/         # Shared libraries (logger, prisma, redis, auth, metrics)
│   │   └── config/       # Configuration
│   ├── prisma/           # Database schema and migrations
│   ├── tests/            # Unit and integration tests
│   └── k8s/              # Kubernetes manifests (Kustomize)
├── frontend/             # React + Vite SPA
│   └── src/
│       ├── pages/        # Page components
│       ├── store/        # Zustand state management
│       ├── api/          # API client modules
│       └── layouts/      # Layout components
│   └── k8s/              # Kubernetes manifests (Kustomize)
├── worker/               # Redis queue consumer
│   └── src/
│       ├── jobs/         # Job handlers
│       └── libs/         # Shared utilities
│   ├── tests/            # Unit tests
│   └── k8s/              # Kubernetes manifests (Kustomize)
├── k6/                   # Performance testing suite
│   ├── tests/            # API test scripts (15 modules)
│   ├── scenarios/        # Smoke, load, stress scenarios
│   └── helpers/          # Auth and HTTP utilities
├── monitoring/           # Observability stack configs
│   ├── grafana/          # Dashboards and provisioning
│   ├── prometheus/       # Prometheus config
│   └── loki/             # Loki log aggregation config
├── .github/workflows/    # CI/CD pipelines
└── docker-compose.yml    # Dev services (PostgreSQL, Redis, Prometheus, Grafana, Loki)
```

## 🛠️ Tech Stack

### Backend

- **Runtime**: Bun (JavaScript)
- **Framework**: Elysia
- **Metrics**: Prometheus (prom-client)
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Queue**: Redis (ioredis)
- **Auth**: JWT (access + refresh tokens)
- **Logging**: Pino (structured JSON logs)

### Frontend

- **Framework**: React 18
- **Build Tool**: Vite
- **State Management**: Zustand
- **Routing**: React Router v6
- **Styling**: CSS (no framework)
- **Charting**: Chart.js with react-chartjs-2

### Worker

- **Runtime**: Bun (JavaScript)
- **Queue**: Redis (BRPOP pattern)
- **Metrics**: Prometheus (prom-client)
- **Jobs**: Audit logs, email notifications, report generation

## 📋 Prerequisites

- [Bun](https://bun.sh/) >= 1.0.0
- [Docker](https://www.docker.com/) and Docker Compose (for databases)
- [Node.js](https://nodejs.org/) >= 18 (optional, Bun can replace it)

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd pos-system
```

### 2. Install dependencies

From the root directory:

```bash
bun install

# Install backend dependencies
cd backend && bun install

# Install frontend dependencies
cd ../frontend && bun install

# Install worker dependencies
cd ../worker && bun install

cd ..
```

### 3. Set up environment variables

Each component has its own environment configuration:

```bash
# Backend
cp backend/.env.example backend/.env

# Worker
cp worker/.env.example worker/.env

# Frontend
cp frontend/.env.example frontend/.env
```

Edit each `.env` file with your configuration:

**backend/.env**:

```env
DATABASE_URL="postgresql://pos_user:pos_password@localhost:5432/pos_db?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key-change-this-in-production"
# ... see backend/.env.example for all variables
```

**worker/.env**:

```env
DATABASE_URL="postgresql://pos_user:pos_password@localhost:5432/pos_db?schema=public"
REDIS_URL="redis://localhost:6379"
SMTP_HOST="smtp.example.com"
# ... see worker/.env.example for all variables
```

**frontend/.env**:

```env
VITE_API_URL="http://localhost:3000"
```

### 4. Start Development Services

Using Docker Compose:

```bash
docker-compose up -d
```

This will start:

- **PostgreSQL** on `localhost:5432`
- **Redis** on `localhost:6379`
- **Prometheus** on `localhost:9091`
- **Grafana** on `localhost:3001` (admin/admin)
- **Loki** on `localhost:3100`

### 5. Run database migrations and seed

```bash
cd backend
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

The seed script creates:

- Default owner user (username: `owner`, password: `password123`)
- Main outlet with warehouse
- Sample products with inventory
- Price tiers (Retail, Wholesale, Member)
- Sample customer and supplier

## 🏃 Running the Application

### Development Mode

From the root directory, you can run all services concurrently:

```bash
bun run dev
```

This starts:

- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:5173
- **Worker**: Running in background

Or run each service individually:

```bash
# Backend
bun run backend:dev

# Frontend
bun run frontend:dev

# Worker
bun run worker:dev
```

### Production Mode

```bash
# Build frontend
bun run frontend:build

# Start backend
bun run backend:start

# Start worker
bun run worker:start

# Serve frontend
bun run frontend:preview
```

## 📱 Using the Application

### 1. Login

Navigate to http://localhost:5173 and login with:

- **Username**: `owner`
- **Password**: `password123`

### 2. Select Outlet

After login, select an outlet from the dropdown in the header. The system will use this outlet for all subsequent operations.

### 3. POS Flow

1. Go to **POS** from the sidebar
2. Click on products to add them to the cart
3. Adjust quantities if needed
4. Select a payment method
5. Click **Complete Order**

The system will:

- Create the order
- Add payment
- Update inventory automatically
- Enqueue background jobs (audit log, email receipt)

### 4. View Products

Navigate to **Products** to view, create, edit, or deactivate products.

## 📚 API Documentation

Complete API reference is available in **[API.md](./API.md)**

Quick links to endpoints:

- [Authentication](./API.md#authentication) - Login, refresh, logout
- [Products](./API.md#products) - Product management
- [Pricing](./API.md#pricing) - Tiered pricing system
- [Customers](./API.md#customers) - Customer management
- [Outlets](./API.md#outlets) - Multi-outlet management & user assignments
- [Warehouses](./API.md#warehouses) - Warehouse operations
- [Inventory](./API.md#inventory) - Stock adjustments & transfers
- [Suppliers](./API.md#suppliers) - Supplier management
- [Purchase Orders](./API.md#purchase-orders) - Procurement workflow
- [POS / Sales](./API.md#pos--sales) - Point of sale operations

See [API.md](./API.md) for detailed request/response examples.

## 🔧 Database Schema

The Prisma schema includes comprehensive models:

- **User & Auth**: `User`, `OutletUser` (multi-outlet role mappings)
- **Locations**: `Outlet`, `Warehouse`, `PosRegister`
- **Products & Pricing**: `Product`, `PriceTier`, `ProductPriceTier`
- **Customers**: `Customer` (with price tier assignment)
- **Inventory**: `Inventory`, `StockMovement`
- **Procurement**: `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`
- **Sales**: `PosOrder`, `PosOrderItem`, `Payment`
- **Audit**: `AuditLog`

### Pricing Resolution Logic

Prices are resolved in this order:

1. **Determine effective price tier**:
   - Customer's assigned price tier
   - Outlet's default price tier
   - Global default price tier

2. **Query for price**:
   - Outlet-specific price for the tier
   - Global price for the tier
   - Product's base price (fallback)

## 🛠️ API Endpoints

Base URL: `http://localhost:3000/api`

### Authentication

- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `POST /auth/refresh` - Refresh token
- `GET /auth/me` - Get current user profile
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password
- `POST /auth/change-password` - Change password

### Users

- `GET /users` - List users
- `POST /users` - Create user
- `GET /users/:id` - Get user details
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Deactivate user
- `POST /users/:id/outlets` - Assign user to outlet
- `DELETE /users/:id/outlets/:outletId` - Remove user from outlet

### Products

- `GET /products` - List products
- `POST /products` - Create product
- `GET /products/:id` - Get product details
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Soft delete product
- `POST /products/:id/reactivate` - Reactivate product

### Pricing

- `GET /pricing/tiers` - List price tiers
- `POST /pricing/tiers` - Create price tier
- `PUT /pricing/tiers/:id` - Update price tier
- `DELETE /pricing/tiers/:id` - Delete price tier
- `GET /pricing/quote` - Calculate price for context
- `GET /pricing/products/:productId` - Get product prices
- `PUT /pricing/products/:productId` - Update product prices

### Inventory

- `GET /inventory` - Get inventory levels
- `GET /inventory/low-stock` - Get low stock alerts
- `GET /inventory/movements` - View stock movement history
- `POST /inventory/adjustments` - Adjust stock quantity
- `POST /inventory/transfers` - Transfer stock between warehouses
- `POST /inventory/stock-take` - Submit stock count

### Sales / POS

- `GET /sales/orders` - List sales orders
- `POST /sales/orders` - Create order
- `GET /sales/orders/:id` - Get order details
- `POST /sales/orders/:id/complete` - Finalize order
- `POST /sales/orders/:id/cancel` - Void order
- `POST /sales/orders/:id/payments` - Add payment

### Customers

- `GET /customers` - List customers
- `POST /customers` - Create customer
- `GET /customers/:id` - Get customer details
- `PUT /customers/:id` - Update customer
- `DELETE /customers/:id` - Delete customer

### Suppliers

- `GET /suppliers` - List suppliers
- `POST /suppliers` - Create supplier
- `GET /suppliers/:id` - Get supplier details
- `PUT /suppliers/:id` - Update supplier
- `DELETE /suppliers/:id` - Delete supplier

### Purchase Orders

- `GET /purchase-orders` - List POs
- `POST /purchase-orders` - Create PO
- `GET /purchase-orders/:id` - Get PO details
- `PUT /purchase-orders/:id` - Update PO
- `POST /purchase-orders/:id/receive` - Receive items
- `POST /purchase-orders/:id/cancel` - Cancel PO

### Reports

- `GET /reports/sales-trend` - Sales analytics
- `GET /reports/hourly-heatmap` - Peak hour analysis
- `GET /reports/top-products` - Best sellers
- `GET /reports/inventory-valuation` - Stock value
- `GET /reports/stock-movements` - Movement report
- `GET /reports/order-history` - Sales history

### Outlets & Warehouses

- `GET /outlets` - List outlets
- `GET /warehouses` - List warehouses
- `GET /warehouses/:id/inventory` - Warehouse stock

## 🔨 Background Jobs

The worker processes three types of jobs from Redis queues:

### 1. Audit Log Jobs

- Persist audit events to database
- Track: user logins, sales, procurement, etc.

### 2. Email Notifications

- Send order receipts to customers
- Procurement notifications
- System alerts

### 3. Report Generation

- Sales summaries (revenue, top products)
- Stock reports (low stock alerts)
- Heavy/async report processing

Jobs are enqueued from the backend and consumed by the worker using Redis `BRPOP` (blocking pop) pattern with retry logic.

## 🧪 Performance Testing (K6)

Comprehensive load testing suite with 15+ API test modules.

### Quick Start

```bash
# Install k6 (macOS)
brew install k6

# Run tests from project root
bun run k6:smoke    # Quick validation (1 VU, 30s)
bun run k6:load     # Normal load (50 VUs, 5min)
bun run k6:stress   # Stress test (200 VUs, 10min)
```

### Test Scenarios

| Scenario | VUs    | Duration | Purpose                |
| -------- | ------ | -------- | ---------------------- |
| Smoke    | 1      | 30s      | Quick validation       |
| Load     | 10→50  | 5min     | Normal load simulation |
| Stress   | 50→200 | 10min    | Find breaking points   |

### API Coverage

Covers ~90 endpoints across 15 modules: Auth, Users, Products, Pricing, Customers, Outlets, Warehouses, Inventory, Suppliers, Purchase Orders, POS/Sales, Reports, Audit Logs, Super Admin, and Invitations.

See [k6/README.md](./k6/README.md) for detailed documentation.

## 📊 Observability Stack

Integrated monitoring with Prometheus, Grafana, and Loki.

### Components

| Service    | Port | Purpose                    |
| ---------- | ---- | -------------------------- |
| Prometheus | 9091 | Metrics collection         |
| Grafana    | 3001 | Dashboards & visualization |
| Loki       | 3100 | Log aggregation            |

### Pre-configured Dashboards

- **Backend Performance**: Request rates, latencies, error codes, endpoint breakdown
- **Worker Performance**: Job processing rates, queue depths, job durations

### Accessing Grafana

1. Navigate to http://localhost:3001
2. Login with `admin` / `admin`
3. Dashboards are auto-provisioned in the "POS System" folder

### Prometheus Metrics Endpoints

- **Backend**: `http://localhost:3000/metrics`
- **Worker**: `http://localhost:3002/metrics`

## 🔄 CI/CD Pipeline

The project includes automated CI/CD using GitHub Actions with deployment to microk8s.

### Workflows

| Workflow                            | Trigger                                               | Description                                            |
| ----------------------------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| **CI** (`.github/workflows/ci.yml`) | Push to `main`/`develop`, PRs to `main`               | Runs tests, builds and pushes Docker images to ghcr.io |
| **CD** (`.github/workflows/cd.yml`) | Auto-triggered after CI on `main`, or manual dispatch | Deploys to microk8s cluster via Kubernetes API         |

### Required GitHub Secrets

Configure these in **Settings → Secrets and variables → Actions**:

| Secret            | Description                                   |
| ----------------- | --------------------------------------------- |
| `KUBECONFIG_DATA` | Base64-encoded kubeconfig for microk8s access |

The `GITHUB_TOKEN` is automatically provided for pushing to ghcr.io.

### Repository Variables

Configure in **Settings → Secrets and variables → Actions → Variables**:

| Variable       | Description                                                               |
| -------------- | ------------------------------------------------------------------------- |
| `VITE_API_URL` | Backend API URL for frontend builds (e.g., `https://api.pos.example.com`) |

### Getting KUBECONFIG_DATA

```bash
# On your microk8s server
microk8s config | base64 -w 0

# Copy the output and set as KUBECONFIG_DATA secret
```

### Manual Deployment

Trigger deployment manually from the GitHub Actions UI:

1. Go to **Actions → CD → Run workflow**
2. Optionally specify an image tag (defaults to `latest`)
3. Click **Run workflow**

### Docker Images

Images are pushed to GitHub Container Registry:

- `ghcr.io/<owner>/pos-backend`
- `ghcr.io/<owner>/pos-frontend`
- `ghcr.io/<owner>/pos-worker`

Tags: `latest`, `<commit-sha>`, `v*` (semantic version tags)

### Kubernetes Deployment (Kustomize)

Each service includes Kubernetes manifests with Kustomize:

```bash
# Deploy all services to kubectl-configured cluster
bun run deploy:k8s

# Or individually
bun run deploy:k8s:backend
bun run deploy:k8s:frontend
bun run deploy:k8s:worker

# For microk8s
bun run deploy:microk8s
```

## 🧪 Database Tools

```bash
# Open Prisma Studio (GUI for database)
bun run db:studio

# Create a new migration
cd backend
npx prisma migrate dev --name your_migration_name

# Deploy migrations in production
npx prisma migrate deploy

# Re-seed database
npx prisma db seed
```

## 📊 Logs & Debugging

### Application Logs

All services use Pino for structured logging:

```bash
# Backend logs (pretty-printed in development)
bun run backend:dev

# Worker logs
bun run worker:dev
```

Logs are also shipped to Loki for centralized viewing in Grafana.

### Database

View data with Prisma Studio:

```bash
bun run db:studio
```

### Redis

Monitor queues:

```bash
docker exec -it pos-redis redis-cli

# Check queue sizes
LLEN queue:audit_log
LLEN queue:email_notification
LLEN queue:report_generation

# View keys
KEYS *
```

## 🔗 Pre-commit Hooks (Husky)

The project uses Husky for Git hooks:

```bash
# Hooks are automatically installed via `bun install`
# To manually set up:
bun run prepare
```

Configured hooks ensure code quality before commits.

## 🚧 Development Notes

### Adding a New Module

1. Create directory in `backend/src/modules/your-module/`
2. Add `service.js`, `controller.js`, `routes.js`, `schemas.js`
3. Import and register routes in `backend/src/app.js`

### Adding a New Job Type

1. Create job handler in `worker/src/jobs/yourJob.job.js`
2. Add queue name in `backend/src/libs/jobs.js`
3. Add enqueue helper function
4. Register handler in `worker/src/index.js`

### Adding a Frontend Page

1. Create page component in `frontend/src/pages/`
2. Add route in `frontend/src/routes/index.jsx`
3. Add API methods in `frontend/src/api/` if needed

## 🤝 Contributing

This is a comprehensive POS system template. Key areas for extension:

- [x] Complete remaining backend modules (outlets, customers, warehouses, inventory, suppliers, purchase orders, reports)
- [x] Add frontend pages for all modules
- [x] Implement comprehensive validation schemas
- [x] Add unit and integration tests
- [x] Implement token refresh logic in frontend
- [x] Implement advanced reporting with charts
- [x] Implement receipt printing
- [x] Add CI/CD pipeline (GitHub Actions)
- [x] Kubernetes deployment manifests (Kustomize)
- [x] Performance testing suite (K6)
- [x] Observability stack (Prometheus, Grafana, Loki)
- [ ] Add WebSocket support for real-time updates
- [ ] Add barcode scanning support

## 📝 License

MIT License - feel free to use this as a template for your projects.

## 🙏 Acknowledgements

Built with:

- [Bun](https://bun.sh/)
- [Elysia](https://elysiajs.com/)
- [Prisma](https://www.prisma.io/)
- [React](https://react.dev/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [Vite](https://vitejs.dev/)

---

**Happy Building! 🚀**
