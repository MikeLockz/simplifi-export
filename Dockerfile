FROM mcr.microsoft.com/playwright:v1.41.0-jammy

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Install browsers with system dependencies
RUN npx playwright install --with-deps chromium

# Create exports directory
RUN mkdir -p /app/exports

# Keep container running (as root)
CMD ["tail", "-f", "/dev/null"]