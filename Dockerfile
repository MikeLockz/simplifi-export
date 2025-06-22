FROM mcr.microsoft.com/playwright:v1.41.0-jammy

# Switch to pwuser early
USER pwuser
WORKDIR /app

# Copy package files and install dependencies
COPY --chown=pwuser:pwuser package*.json ./
RUN npm ci --only=production

# Copy application code
COPY --chown=pwuser:pwuser . .

# Install browser as pwuser
RUN npx playwright install --with-deps chromium

# Create exports directory
RUN mkdir -p /app/exports

# Keep container running
CMD ["tail", "-f", "/dev/null"]