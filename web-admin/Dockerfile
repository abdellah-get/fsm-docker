# ==========================================
# ÉTAPE 1 : Installation des dépendances
# ==========================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
# Utilisation de npm ci avec prise en charge des conflits
RUN npm ci --legacy-peer-deps

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

# CORRECTIF SÉCURITÉ ULTIME : npm n'est pas nécessaire pour exécuter l'application standalone.
# On le supprime complètement pour éliminer toutes ses sous-dépendances vulnérables (dont tar).
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

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

# La commande finale pour démarrer l'app en production avec Node pur
CMD ["node", "server.js"]