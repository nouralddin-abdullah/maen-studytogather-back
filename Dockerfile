# stage 1 -> dep
FROM node:25-alpine AS deps

WORKDIR /app

# copy package files
COPY package*.json ./

# install all dependencies (including dev for building)
RUN npm ci

# stage 2 -> builder
FROM node:25-alpine AS builder

WORKDIR /app

# copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# build the application
RUN npm run build

# prune dev dependencies
RUN npm prune --production

# stage 3 -> protection runner
FROM node:25-alpine AS runner

WORKDIR /app

# create non root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# set environment
ENV NODE_ENV=production
ENV PORT=3000

# copy only necessary files
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# switch to non-root user
USER nestjs

# expose port
EXPOSE 3000

# health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health/live || exit 1

# start the application
CMD ["node", "dist/main.js"]
