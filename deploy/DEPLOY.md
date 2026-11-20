# Деплой POLUTONE на Timeweb Cloud (вариант B)

Схема: Caddy (HTTPS) → app (Next.js + Payload) → db (Postgres), всё в Docker на одном сервере.
Фото — в S3 Timeweb. Секреты — только в `.env` на сервере.

## 0. Что нужно заранее
- Домен (например `polutone.ru`), доступ к его DNS.
- Сервер Timeweb Cloud: Ubuntu 24.04, MSK 50 (2 vCPU, 4 ГБ), публичный IP, автобэкапы.
- В панели при создании сервера добавить SSH-ключ: содержимое `~/.ssh/polutone_timeweb.pub`.
- S3-бакет (публичный) и его ключи доступа.

## 1. DNS
У регистратора: A-запись `@` → IP сервера, и A-запись `www` → тот же IP.

## 2. Первичная настройка сервера (один раз)
С вашего компьютера (PowerShell):

```powershell
scp -i $env:USERPROFILE\.ssh\polutone_timeweb deploy\server-setup.sh root@<IP>:/root/
ssh -i $env:USERPROFILE\.ssh\polutone_timeweb root@<IP>
```

На сервере:

```bash
bash server-setup.sh "ssh-ed25519 AAAA... polutone-timeweb"
```

Не закрывая эту сессию, в новом окне проверить вход: `ssh -i ... deploy@<IP>`. Только после этого закрывать root-сессию.

## 3. Код на сервер
Под пользователем `deploy`:

```bash
git clone https://github.com/peloponesbar/Polutone-test.git ~/polutone
cd ~/polutone
cp deploy/.env.production.example .env
nano .env        # заполнить; секреты: openssl rand -hex 32
```

Репозиторий приватный? Тогда нужен deploy-ключ или токен — решим на месте.

## 4. Запуск
```bash
docker compose up -d --build
docker compose run --rm migrate
docker compose ps
docker compose logs -f app
```

Открыть `https://<домен>`. Админка: `https://<домен>/admin`, первого админа создаёт Payload при первом входе.

## 5. Обновление сайта
```bash
cd ~/polutone && git pull
docker compose up -d --build
docker compose run --rm migrate
```

## 6. Бэкапы
- Автобэкапы сервера — включены в панели Timeweb.
- Дамп базы раз в сутки: `crontab -e` → `0 3 * * * cd ~/polutone && bash deploy/backup-db.sh`.
- Проверить восстановление один раз до запуска магазина.

## 7. Мониторинг
В панели Timeweb → сервер → графики CPU/RAM. Если CPU стабильно > 70% или RAM > 80% — пора увеличить тариф.

## Если что-то не так
- Сайт не открывается: `docker compose ps`, `docker compose logs caddy app`.
- Сертификат не выдаётся: проверить, что A-запись домена указывает на IP сервера и порты 80/443 открыты.
- Падает по памяти: `docker stats`, `free -h`.
