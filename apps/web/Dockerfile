FROM node:20-alpine AS base
WORKDIR /app

# Copy monorepo packages (workspace deps)
FROM base AS deps
COPY tsconfig.base.json ./
COPY packages/types/package.json packages/types/
COPY packages/types/src/ packages/types/src/
COPY packages/api-client/package.json packages/api-client/
COPY packages/api-client/src/ packages/api-client/src/
COPY packages/design-tokens/package.json packages/design-tokens/
COPY packages/design-tokens/src/ packages/design-tokens/src/
COPY apps/web/package.json apps/web/
RUN cd apps/web && npm install

# Build
FROM base AS build
COPY --from=deps /app ./
COPY apps/web/ apps/web/

ARG NEXT_PUBLIC_API_URL=http://server:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN cd apps/web && npm run build

# Production — use standalone output
FROM base AS runner
ENV NODE_ENV=production

COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static apps/web/.next/static
COPY --from=build /app/apps/web/public apps/web/public/

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
