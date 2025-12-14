# K6 Performance Tests

Performance and load testing suite for the POS System backend API using [k6](https://k6.io/).

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Other platforms
# See: https://grafana.com/docs/k6/latest/set-up/install-k6/
```

## Directory Structure

```
k6/
├── config.js              # Environment configuration
├── helpers/
│   ├── auth.js            # Authentication helpers
│   └── http.js            # HTTP request utilities
├── tests/                 # Individual API test files
│   ├── auth.k6.js
│   ├── users.k6.js
│   ├── products.k6.js
│   ├── pricing.k6.js
│   ├── customers.k6.js
│   ├── outlets.k6.js
│   ├── warehouses.k6.js
│   ├── inventory.k6.js
│   ├── suppliers.k6.js
│   ├── purchase-orders.k6.js
│   ├── pos.k6.js
│   ├── reports.k6.js
│   ├── audit-logs.k6.js
│   ├── super-admin.k6.js
│   └── invitations.k6.js
└── scenarios/
    ├── smoke.js           # Quick validation (1 VU, 30s)
    ├── load.js            # Normal load (50 VUs, 5min)
    └── stress.js          # Stress test (200 VUs, 10min)
```

## Usage

### Run Tests

```bash
# From project root

# Smoke test (quick validation)
bun run k6:smoke

# OR directly with k6
k6 run k6/scenarios/smoke.js

# Load test (normal load simulation)
bun run k6:load

# Stress test (find breaking points)
bun run k6:stress
```

### Environment Variables

```bash
# Override base URL
K6_BASE_URL=http://staging.example.com/api k6 run k6/scenarios/smoke.js

# Override test credentials
K6_USERNAME=testuser K6_PASSWORD=testpass k6 run k6/scenarios/smoke.js
```

## Test Scenarios

| Scenario | VUs    | Duration | Purpose                |
| -------- | ------ | -------- | ---------------------- |
| Smoke    | 1      | 30s      | Quick validation       |
| Load     | 10→50  | 5min     | Normal load simulation |
| Stress   | 50→200 | 10min    | Find breaking points   |

## Thresholds

Default performance thresholds:

- **HTTP Request Failed Rate**: < 1%
- **HTTP Request Duration P95**: < 500ms

## API Coverage

Covers ~90 endpoints across 15 API modules:

- Auth (login, logout, refresh, me, password flows)
- Users (CRUD, outlet assignment)
- Products (CRUD, reactivate)
- Pricing (tiers, quotes, product prices)
- Customers (CRUD)
- Outlets (CRUD, user management)
- Warehouses (CRUD, inventory)
- Inventory (list, adjust, transfer, movements, low-stock, stock-take)
- Suppliers (CRUD)
- Purchase Orders (CRUD, receive, cancel)
- POS/Sales (orders, payments, complete, cancel)
- Reports (sales-trend, hourly-heatmap, top-products, etc.)
- Audit Logs (list, event-types, entity-types)
- Super Admin (dashboard, businesses, users, sessions)
- Invitations (verify, accept, create, cancel, resend)

## Notes

- Tests use `.k6.js` file extension to avoid conflicts with bun tests
- Backend must be running before executing tests
- Some tests (Super Admin) may fail for non-admin users due to permissions
