# icomers documentation site (usectl / any Docker host)
# Storage: set DATABASE_URL (usectl Postgres addon) → answers and additions are shared and persistent.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY docs ./docs
COPY docs-site/build.mjs docs-site/server.mjs docs-site/storage.mjs ./docs-site/
COPY docs-site/src ./docs-site/src
USER node
EXPOSE 8080
CMD ["node", "docs-site/server.mjs"]
