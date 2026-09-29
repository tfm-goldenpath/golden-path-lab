ARG BASE_IMAGE
FROM ${BASE_IMAGE}
# Explicit inventory fixture; the service does not import this module.
COPY --chown=10001:10001 is-number/ /app/node_modules/is-number/
