ARG NODE_IMAGE
ARG BASE_IMAGE
FROM ${NODE_IMAGE} AS dependencies
WORKDIR /fixture
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
FROM ${BASE_IMAGE}
COPY --from=dependencies --chown=10001:10001 /fixture /opt/vulnerability-fixture
COPY --chown=10001:10001 exercise.cjs /opt/vulnerability-fixture/exercise.cjs
CMD ["sh", "-c", "node /opt/vulnerability-fixture/exercise.cjs && exec node src/index.js"]
