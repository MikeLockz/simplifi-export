FROM mcr.microsoft.com/playwright:v1.41.0-jammy

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create exports directory
RUN mkdir -p /app/exports

# Set proper ownership of the entire app directory
RUN chown -R pwuser:pwuser /app

# Switch to pwuser BEFORE installing browsers
USER pwuser

# Install browsers as pwuser so they're accessible to pwuser
RUN npx playwright install --with-deps chromium

# Keep container running
CMD ["tail", "-f", "/dev/null"]