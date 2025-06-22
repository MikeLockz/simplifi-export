FROM mcr.microsoft.com/playwright:v1.52.0-noble

WORKDIR /app

# Copy package files and install dependencies (including Playwright)
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create exports directory
RUN mkdir -p /app/exports

# The browsers are already installed in the base image
# Keep container running
CMD ["tail", "-f", "/dev/null"]