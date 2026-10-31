# Multi-stage production Dockerfile for Presensi Siswa Backend API
FROM node:22-alpine AS builder

WORKDIR /app

RUN mkdir -p /app/data && chown 1001:1001 /app/data && chmod 700 /app/data

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

COPY . .
RUN npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --chown=nestjs:nodejs package*.json ./
COPY --chown=nestjs:nodejs prisma ./prisma/

RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=nestjs:nodejs --from=builder /app/dist ./dist
COPY --chown=nestjs:nodejs --from=builder /app/scripts ./scripts
COPY --chown=nestjs:nodejs --from=builder /app/node_modules/.prisma ./node_modules/.prisma

RUN mkdir -p /app/uploads /app/data && chown -R nestjs:nodejs /app/uploads /app/data && chmod 700 /app/data

USER nestjs

EXPOSE 4000

ENV PORT=4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:4000/api/v1/health/db').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/main.js"]
