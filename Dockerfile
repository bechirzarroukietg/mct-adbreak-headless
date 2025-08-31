# Dockerfile for Puppeteer Scraper Project

# Use official Node.js image with Chromium dependencies
FROM node:18-slim

# Install necessary dependencies for Puppeteer/Chromium
RUN apt-get update && apt-get install -y --fix-missing \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --omit=dev

# Copy the rest of the project files
COPY . .

# Expose the Express server port
EXPOSE 3000

# Start the server
CMD ["node", "scraper.js"]
