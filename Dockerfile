# Multi-stage production Dockerfile for Presensi Siswa Frontend (Next.js)
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG NEXT_PUBLIC_API_BASE_URL
RUN test -n "$NEXT_PUBLIC_API_BASE_URL"
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN node -e "if (new URL(process.env.NEXT_PUBLIC_API_BASE_URL).protocol !== 'https:') process.exit(1)"
RUN npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --chown=nextjs:nodejs package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["npm", "start"]
