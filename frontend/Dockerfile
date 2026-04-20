# -------- Base --------

FROM node:20-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# -------- Dependencies --------

FROM base AS deps
COPY package.json ./
RUN npm install --legacy-peer-deps

# -------- Builder --------

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Enable standalone output

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# -------- Runner --------

FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy only necessary files (smaller image)

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
