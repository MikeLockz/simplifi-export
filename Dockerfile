FROM node:18-alpine

# Install system dependencies (cached unless you change this layer)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy package files first (only rebuilds if dependencies change)
COPY package*.json ./

# Install npm dependencies (cached unless package*.json changes)
RUN npm ci --only=production

# Don't use --with-deps on Alpine, we already installed dependencies above
RUN npx playwright install chromium

# Copy source code last
COPY . .

CMD ["tail", "-f", "/dev/null"]