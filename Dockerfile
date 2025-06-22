FROM mcr.microsoft.com/playwright:v1.41.0-jammy

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Install system dependencies as root (without browsers)
RUN npx playwright install-deps chromium

# Create exports directory and set ownership
RUN mkdir -p /app/exports && chown -R pwuser:pwuser /app

# Switch to pwuser
USER pwuser

# Install only the browser binary as pwuser (without system deps)
RUN npx playwright install chromium

# Keep container running
CMD ["tail", "-f", "/dev/null"]