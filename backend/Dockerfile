FROM node:20-alpine

# Enable pnpm (corepack ships with Node 20)
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
