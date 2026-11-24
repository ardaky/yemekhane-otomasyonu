# Yemekhane uygulaması · Node.js + Express
FROM node:22-alpine

# Container içinde çalışılacak klasör
WORKDIR /app

# Önce yalnızca paket listesini kopyala: kod değişse de bağımlılık katmanı önbellekten gelir
COPY package.json ./
RUN npm install --omit=dev

# Sonra uygulama kodunu kopyala
COPY src ./src

ENV NODE_ENV=production
EXPOSE 8000

CMD ["node", "src/sunucu.js"]
