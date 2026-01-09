# Решение частых проблем

## 1. GitHub Actions не может подключиться к серверу

**Ошибка:** `Permission denied (publickey)`

**Решение:**
```bash
# На сервере проверьте, что SSH ключ добавлен
cat ~/.ssh/authorized_keys

# Убедитесь, что SSH разрешает подключение по ключу
sudo nano /etc/ssh/sshd_config
# Проверьте: PubkeyAuthentication yes

# Перезапустите SSH
sudo systemctl restart sshd
```

## 2. Docker команды требуют sudo

**Ошибка:** `permission denied while trying to connect to the Docker daemon`

**Решение:**
```bash
# Добавьте пользователя в группу docker
sudo usermod -aG docker $USER

# Перелогиньтесь или выполните
newgrp docker

# Проверьте
docker ps
```

## 3. Порт уже занят

**Ошибка:** `bind: address already in use`

**Решение:**
```bash
# Найдите процесс на порту 80 или 3001
sudo lsof -i :80
sudo lsof -i :3001

# Остановите старые контейнеры
docker-compose down

# Или убейте процесс
sudo kill -9 <PID>
```

## 4. Нет места на диске

**Ошибка:** `no space left on device`

**Решение:**
```bash
# Очистите старые образы и контейнеры
docker system prune -af --volumes

# Проверьте место
df -h

# Очистите логи Docker
sudo truncate -s 0 /var/lib/docker/containers/*/*-json.log
```

## 5. Контейнер постоянно перезапускается

**Проверка:**
```bash
# Смотрите логи
docker logs chat-app
docker logs chat-nginx

# Проверьте статус
docker ps -a

# Запустите в интерактивном режиме для отладки
docker-compose up
```

## 6. Git pull выдаёт ошибку merge conflict

**Решение:**
```bash
cd /path/to/app
git reset --hard origin/main
git pull origin main
```

## 7. nginx не может подключиться к app контейнеру

**Проверка:**
```bash
# Убедитесь, что оба контейнера в одной сети
docker network ls
docker network inspect proveeksamen_chat-network

# Проверьте, что app контейнер работает
docker exec -it chat-app wget -O- http://localhost:3001
```

## 8. Тестирование локально

```bash
# Соберите и запустите локально
docker-compose up --build

# Откройте в браузере
http://localhost

# Проверьте логи
docker-compose logs -f
```

## 9. Полная переустановка

```bash
# Остановите всё
docker-compose down -v

# Удалите образы
docker rmi $(docker images -q chat-*)

# Пересоберите с нуля
docker-compose build --no-cache
docker-compose up -d
```

## 10. Проверка работы после деплоя

```bash
# Статус контейнеров
docker ps

# Логи последних сообщений
docker-compose logs --tail=100

# Тест подключения к Socket.IO
curl http://chat.it4.iktim.no/socket.io/

# Проверка nginx
curl -I http://chat.it4.iktim.no
```
