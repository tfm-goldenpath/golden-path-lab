ARG NODE_IMAGE
FROM ${NODE_IMAGE}
WORKDIR /opt/probe
COPY probe.mjs probe.test.mjs ./
RUN node --test probe.test.mjs
USER node
CMD ["node", "probe.mjs"]
