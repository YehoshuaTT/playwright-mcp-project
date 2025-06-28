FROM node:18-slim

# התקן דפדפנים עבור Playwright
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# העתק package.json
COPY server/package*.json ./

# התקן dependencies
RUN npm install

# התקן Playwright browsers
RUN npx playwright install chromium --with-deps

# העתק קוד השרת
COPY server/ .

# צור תיקיית screenshots
RUN mkdir -p /app/screenshots

EXPOSE 3000

# הרצת השרת
CMD ["node", "server.js"]