ARG JAVA_BUILDER_IMAGE=maven:3.10.0-eclipse-temurin-25-noble@sha256:b726d3a43d3de48046821dfbfdf55babb0a01474d1059ec6ce8ad4aebb07927f
ARG JAVA_RUNTIME_IMAGE=eclipse-temurin:25.0.5_8-jre-noble@sha256:41a70a160a5a157126929c1901e8dcf17ea4fd88eca1e7b9abf3cb1bb04df6c2
FROM ${JAVA_BUILDER_IMAGE} AS build
ENV MAVEN_OPTS="-Xmx256m -XX:ActiveProcessorCount=2"
WORKDIR /build
COPY pom.xml ./
COPY src/ ./src/
RUN mvn -B -ntp --strict-checksums -Dmaven.repo.local=/build/repository verify \
    && find repository -type f \( -name '*.jar' -o -name '*.pom' \) -print0 | sort -z | xargs -0 sha256sum > build-artifacts.sha256
FROM ${JAVA_RUNTIME_IMAGE}
# Noble security fix for CVE-2026-109518; retain signed, dated archive inputs.
# Disable retries while bootstrapping the affected APT implementation.
RUN apt-get -o Acquire::Retries=0 update --snapshot 20261109T000000Z \
    && apt-get -o Acquire::Retries=0 install --snapshot 20261109T000000Z -y --no-install-recommends --only-upgrade \
       apt=2.8.4ubuntu0.1 libapt-pkg6.0t64=2.8.4ubuntu0.1 \
    && rm -rf /var/lib/apt/lists/*
ARG BUILD_COMMIT=unknown
LABEL org.opencontainers.image.title="independent-java" \
      org.opencontainers.image.description="Bounded independent Java HTTP consumer" \
      org.opencontainers.image.revision="${BUILD_COMMIT}"
ENV BUILD_COMMIT=${BUILD_COMMIT}
WORKDIR /app
COPY --from=build --chown=10001:10001 /build/target/independent-java.jar ./application.jar
# Build/test artifact inventory only; these dependencies are absent from runtime.
COPY --from=build --chown=10001:10001 /build/build-artifacts.sha256 ./build-artifacts.sha256
USER 10001:10001
EXPOSE 3000
ENTRYPOINT ["java", "-Xms16m", "-Xmx64m", "-Xss256k", "-XX:MaxMetaspaceSize=48m", "-XX:ReservedCodeCacheSize=24m", "-XX:+UseSerialGC", "-XX:ActiveProcessorCount=2", "-XX:-UsePerfData", "-jar", "/app/application.jar"]
