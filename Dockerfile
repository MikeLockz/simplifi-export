FROM mcr.microsoft.com/playwright:v1.53.0-noble

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm install

# Copy the rest of your application
COPY . .

# Create exports directory
RUN mkdir -p /app/exports

# Keep container running (for development)
CMD ["tail", "-f", "/dev/null"]