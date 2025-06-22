FROM node:20-bookworm

WORKDIR /app

COPY package*.json ./

# Install project dependencies first (including Playwright)
RUN npm ci --only=production

# Then install browsers with system dependencies
RUN npx playwright install --with-deps

COPY . .
RUN mkdir -p /app/exports

CMD ["tail", "-f", "/dev/null"]