FROM node:20-bookworm-slim
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

RUN pnpm install --no-frozen-lockfile
RUN pnpm prisma generate
RUN pnpm build

EXPOSE 3001
CMD ["pnpm","start:api:docker"]
