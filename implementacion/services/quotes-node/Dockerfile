ARG NODE_IMAGE=node:24.21.0-alpine3.24@sha256:83f1c388c31fb2e51f7cbd4dea949b96260798c98f206e8e4696bc93bd964e3a
FROM ${NODE_IMAGE}
# This dependency-free service only needs Node at runtime, not package managers.
RUN rm -rf /usr/local/lib/node_modules /opt/yarn-* \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn /usr/local/bin/yarnpkg
ARG BUILD_COMMIT=unknown
LABEL org.opencontainers.image.title="quotes-node" \
      org.opencontainers.image.description="Synthetic insurance quotes for the Golden Path laboratory" \
      org.opencontainers.image.revision="${BUILD_COMMIT}"
ENV NODE_ENV=production PORT=3000 BUILD_COMMIT=${BUILD_COMMIT}
WORKDIR /app
COPY --chown=10001:10001 package.json package-lock.json ./
COPY --chown=10001:10001 src/ ./src/
USER 10001:10001
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "const http=require('node:http'); const r=http.get('http://127.0.0.1:3000/healthz',s=>{s.resume(); process.exit(s.statusCode===200?0:1)}); r.setTimeout(2000,()=>r.destroy()); r.on('error',()=>process.exit(1));"]
CMD ["node", "src/index.js"]
