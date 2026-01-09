# Этап 1: Сборка фронтенда
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm ci

# Копируем исходники и собираем фронтенд
COPY . .
RUN npm run build

# Этап 2: Продакшн образ
FROM node:20-alpine

WORKDIR /app

# Устанавливаем только production зависимости
COPY package*.json ./
RUN npm ci --only=production

# Копируем собранный фронтенд и серверный код
COPY --from=builder /app/dist ./dist
COPY server ./server

# Открываем порт для Socket.IO сервера
EXPOSE 3001

# Запускаем сервер
CMD ["node", "server/index.js"]
