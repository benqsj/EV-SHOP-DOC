# icomers docs site (hosted version: answers are shared between everyone)
# build from the repository root:  docker build -f docs-site/Dockerfile -t icomers-docs .
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080 DOCS_DIR=/app/docs DATA_DIR=/data
COPY docs-site/build.mjs docs-site/server.mjs ./docs-site/
COPY docs-site/src ./docs-site/src
COPY docs ./docs
RUN mkdir -p /data && chown -R node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
CMD ["node", "docs-site/server.mjs"]
