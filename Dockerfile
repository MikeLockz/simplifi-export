FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

# Clone your repo (you'll need to provide the URL)
RUN git clone https://github.com/yourusername/your-financial-exporter-repo.git .

# Install dependencies
RUN npm ci --only=production

# Install Playwright browsers
RUN npx playwright install

# Create exports directory
RUN mkdir -p /app/exports

# Make your main script executable
RUN chmod +x /app/financial-exporter.js

# Keep container running for scheduled execution
CMD ["tail", "-f", "/dev/null"]