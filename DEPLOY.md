# Инструкция по деплою

## Локальный запуск с Docker

```bash
docker-compose up -d --build
```

Приложение будет доступно на http://localhost

## Настройка автоматического деплоя через GitHub Actions

### 1. Подготовка сервера

На вашем сервере (chat.it4.iktim.no):

```bash
# Установите Docker и Docker Compose
sudo apt update
sudo apt install docker.io docker-compose -y

# Добавьте пользователя в группу docker (чтобы не использовать sudo)
sudo usermod -aG docker $USER
# Перелогиньтесь после этого!

# Клонируйте репозиторий
cd /var/www  # или любая другая папка
git clone https://github.com/ваш-username/proveeksamen.git
cd proveeksamen

# Создайте .env файл для продакшена (если нужно)
nano .env.production
```

### 2. Настройка GitHub Secrets

В вашем репозитории на GitHub:
1. Перейдите в **Settings** → **Secrets and variables** → **Actions**
2. Добавьте следующие секреты:

**Обязательные:**
- `SERVER_HOST` = `chat.it4.iktim.no`
- `SERVER_USER` = ваш SSH пользователь (например, `root` или `ubuntu`)
- `SSH_PRIVATE_KEY` = содержимое вашего приватного SSH ключа (cat ~/.ssh/id_rsa)
- `APP_PATH` = путь к приложению на сервере (например, `/var/www/proveeksamen`)

**Для варианта с Docker Hub (необязательно):**
- `DOCKER_USERNAME` = ваш username на Docker Hub
- `DOCKER_PASSWORD` = токен доступа Docker Hub

### 3. Генерация SSH ключа (если нет)

На вашем компьютере:
```bash
ssh-keygen -t rsa -b 4096 -C "github-actions"
# Сохраните в ~/.ssh/github_actions

# Скопируйте публичный ключ на сервер
ssh-copy-id -i ~/.ssh/github_actions.pub user@chat.it4.iktim.no

# Скопируйте приватный ключ в GitHub Secret SSH_PRIVATE_KEY
cat ~/.ssh/github_actions
```

### 4. Деплой

Теперь при каждом push в ветку `main`:
1. GitHub Actions автоматически подключится к серверу
2. Обновит код из репозитория
3. Пересоберёт Docker образы
4. Перезапустит контейнеры

## Структура

- **Dockerfile** - сборка приложения (фронтенд + бэкенд)
- **nginx.conf** - конфигурация nginx (проксирование Socket.IO)
- **docker-compose.yml** - оркестрация контейнеров
- **.github/workflows/deploy.yml** - автоматический деплой

## Проверка работы

После деплоя проверьте:
```bash
docker ps  # должны быть запущены chat-app и chat-nginx
docker logs chat-app  # логи бэкенда
docker logs chat-nginx  # логи nginx
```
