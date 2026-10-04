FROM oven/bun:1
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --production

COPY src ./src
COPY static ./static
COPY drizzle ./drizzle
COPY tsconfig.json ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["bun", "run", "src/index.tsx"]
