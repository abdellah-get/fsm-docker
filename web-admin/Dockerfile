# ==========================================
# ÉTAPE 1 : Installation des dépendances
# ==========================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
# On utilise 'npm ci' qui est plus rapide et strict que 'npm install' en production
RUN npm ci

# ==========================================
# ÉTAPE 2 : Construction (Build)
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# On désactive la télémétrie Next.js pour gagner du temps
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ==========================================
# ÉTAPE 3 : L'image finale ultra-légère (Runner)
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

# CORRECTIF SÉCURITÉ : Utilisation de npm@10 (compatible avec Node 20) pour écraser tar
RUN npm install -g npm@10 tar@7.5.19

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Création d'un utilisateur non-root pour la sécurité
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# On copie UNIQUEMENT ce qui est nécessaire pour faire tourner le site
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# On bascule sur l'utilisateur sécurisé
USER nextjs

EXPOSE 3000
ENV PORT=3000

# La commande finale pour démarrer l'app en production
CMD ["node", "server.js"]