# Stage 1: Build the Next.js application
FROM node:22-slim AS build

ENV COREPACK_ENABLE_STRICT=0
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
ENV NODE_OPTIONS="--max-old-space-size=1024"
RUN pnpm run build

# Stage 2: Production image with only what's needed to run
FROM node:22-slim

WORKDIR /app

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]