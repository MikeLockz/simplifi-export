FROM node:20-bookworm

WORKDIR /app

COPY package*.json ./

# Install Playwright and browsers first
RUN npx -y playwright@1.53.1 install --with-deps

# Then install project dependencies
RUN npm ci --only=production

COPY . .
RUN mkdir -p /app/exports

CMD ["tail", "-f", "/dev/null"]FROM node:20-bookworm

WORKDIR /app

COPY package*.json ./

# Install Playwright and browsers first
RUN npx -y playwright@1.53.1 install --with-deps

# Then install project dependencies
RUN npm ci --only=production

COPY . .
RUN mkdir -p /app/exports

CMD ["tail", "-f", "/dev/null"]