FROM mcr.microsoft.com/playwright:v1.53.1-noble

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of your application
COPY . .

# Create exports directory
RUN mkdir -p /app/exports

# Keep container running (for development)
CMD ["tail", "-f", "/dev/null"]