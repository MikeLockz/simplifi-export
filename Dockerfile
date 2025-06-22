FROM mcr.microsoft.com/playwright:v1.53.0-noble

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN mkdir -p /app/exports

CMD ["tail", "-f", "/dev/null"]