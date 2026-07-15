# Use the official Bun image for building
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package configurations
COPY package.json bun.lock ./
COPY packages/client/package.json ./packages/client/
COPY packages/server/package.json ./packages/server/

# Install all dependencies (including devDependencies needed for building)
RUN bun install --frozen-lockfile

# Copy the rest of the monorepo source files
COPY . .

# Build both the client and the server
RUN bun run build

# Use a slim Bun image for the final production runner stage
FROM oven/bun:1-slim AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy package descriptors and built artifacts from the builder
COPY --from=builder /app/package.json /app/bun.lock ./
COPY --from=builder /app/packages/client/package.json ./packages/client/
COPY --from=builder /app/packages/client/dist ./packages/client/dist
COPY --from=builder /app/packages/server/package.json ./packages/server/
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/prisma ./packages/server/prisma
COPY --from=builder /app/packages/server/node_modules ./packages/server/node_modules
COPY --from=builder /app/node_modules ./node_modules

# Expose port (Railway will override this with its own PORT environment variable)
EXPOSE 3001

# Command to start the server (runs database migration and starts the app)
CMD ["bun", "run", "--filter", "server", "start"]
