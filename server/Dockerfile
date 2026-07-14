FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Build
FROM base AS build
COPY package.json package-lock.json* tsconfig.json ./
RUN npm ci
COPY src/ src/
COPY drizzle/ drizzle/
RUN npx tsc

# Production
FROM base AS runner
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY package.json ./

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3000
CMD ["node", "dist/index.js"]
