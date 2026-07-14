# ==========================================
# ÉTAPE 1 : Installation des dépendances
# ==========================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copier uniquement les fichiers de web-admin
COPY web-admin/package*.json ./
RUN npm install

# ==========================================
# ÉTAPE 2 : Construction (Build)
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY web-admin/ . 

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ==========================================
# ÉTAPE 3 : L'image finale (Runner)
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# On copie les éléments depuis le builder (qui est déjà dans le dossier web-admin)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]