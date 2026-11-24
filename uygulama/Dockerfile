FROM node:22-alpine

WORKDIR /app

# önce sadece paket dosyaları: kod değişince npm ci tekrar çalışmasın
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 8000
CMD ["node", "src/sunucu.js"]
