# This Dockerfile is not supposed to be used to produce official images but to
# serve as a proof-of-concept for building frontend libraries with multiplatform
# support (see https://github.com/WrenSecurity/wrenidm/issues/148).
FROM --platform=$BUILDPLATFORM debian:bullseye-slim AS project-build

RUN \
  apt-get update && \
  apt-get install -y --no-install-recommends openjdk-17-jdk maven unzip

# https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#chrome-doesnt-launch-on-linux
RUN \
  apt-get install -y --no-install-recommends \
  ca-certificates \
  fonts-liberation  \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils

# Make sure NPM and others know they're being run in CI environment
ENV CI=true

COPY . .
RUN \
  --mount=type=cache,target=/root/.m2 \
  --mount=type=cache,target=/root/.npm \
  mvn verify
