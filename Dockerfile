FROM mcr.microsoft.com/playwright:v1.41.0-jammy

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Install browsers with system dependencies and debug
RUN npx playwright install --with-deps chromium
RUN echo "=== Checking if browser was installed ===" && \
    find /root/.cache/ms-playwright -name "headless_shell" 2>/dev/null || echo "No headless_shell found" && \
    ls -la /root/.cache/ms-playwright/ 2>/dev/null || echo "No playwright cache found"

# Create exports directory
RUN mkdir -p /app/exports

# Keep container running
CMD ["tail", "-f", "/dev/null"]