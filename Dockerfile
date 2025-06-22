FROM mcr.microsoft.com/playwright:v1.41.0-jammy

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Install only the browser you need with system dependencies
RUN npx playwright install --with-deps chromium

# Create exports directory
RUN mkdir -p /app/exports

# Use node user for security (optional but recommended)
USER pwuser

# Keep container running
CMD ["tail", "-f", "/dev/null"]