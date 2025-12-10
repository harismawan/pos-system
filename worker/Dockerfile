# Stage 1: Install dependencies
FROM oven/bun:1.3 AS deps
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
COPY prisma ./prisma/

# Install dependencies
RUN bun install --frozen-lockfile --production

# Generate Prisma client
RUN bun prisma generate

# Stage 2: Production image
FROM oven/bun:1.3-slim AS runner
WORKDIR /app

# Create non-root user for security
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --no-create-home bunjs

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy application code
COPY src ./src
COPY package.json ./

# Set ownership
RUN chown -R bunjs:nodejs /app

# Switch to non-root user
USER bunjs

# Start the worker
CMD ["bun", "run", "start"]
