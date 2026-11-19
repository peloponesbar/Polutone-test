# POLUTONE — интернет-магазин

Next.js 16 + Payload CMS 3 + PostgreSQL + Tailwind 4. Фото — Timeweb S3.
Дизайн-правила: `../DESIGN_SYSTEM.md` (вне репозитория, рядом с брендбуком).

## Запуск локально

1. PostgreSQL 17 с базой `polutone`.
2. `cp .env.example .env` и заполнить значения (S3 можно оставить пустым — тогда фото сохраняются в `/media`).
3. ```
   npm install
   npm run dev
   ```
   Сайт — http://localhost:3000, админка — http://localhost:3000/admin.

## Команды

| Команда | Что делает |
|---|---|
| `npm run dev` | Dev-сервер |
| `npm run test:int` | Unit- и интеграционные тесты (Vitest, нужна база) |
| `npm run test:e2e` | E2E-тесты (Playwright) |
| `npm run screenshot -- [url] [label]` | Скриншоты 1440 и 390 px для проверки дизайна → `screenshots/` |
| `npm run generate:types` | Обновить типы Payload |

## Структура

- `src/app/(frontend)` — сайт (токены бренда в `globals.css`, шрифты в `fonts.ts`)
- `src/app/(payload)` — админка и API Payload
- `src/collections` — коллекции Payload
- `src/lib` — общие модули (`s3.ts` — подключение Timeweb S3)
- `tests/unit`, `tests/int`, `tests/e2e` — тесты

Ключи и пароли — только в `.env`, он не коммитится.

## Тестовый сайт на Vercel

Vercel собирает сайт из GitHub после каждого коммита (скрипт `vercel-build`: миграции базы → тестовые данные, если включены → `next build`).

Переменные окружения в Vercel (Settings → Environment Variables):

| Переменная | Значение |
|---|---|
| `DATABASE_URL` | Строка подключения Neon (pooled, `...-pooler...neon.tech/...?sslmode=require`) |
| `PAYLOAD_SECRET` | Длинная случайная строка, своя для этого сайта |
| `CATALOG_SOURCE` | `mock` |
| `SITE_PASSWORD` | Пароль на весь сайт (имя пользователя любое); пусто — сайт открыт |
| `SEED_TEST_DATA` | `true` — при сборке создать страницы «Информация», тестовый каталог и загрузить тестовые фото |
| `BLOB_READ_WRITE_TOKEN` | Добавится сам, когда подключите хранилище: Vercel → Storage → Create → Blob → Connect to project. Нужен для фото |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Уведомления о заказах (необязательно) |

База: в Vercel → Storage → Create Database → Neon — переменная `DATABASE_URL` добавится сама.

Тестовые данные создаются при сборке (`npm run seed:build`), если `SEED_TEST_DATA=true`: при первой сборке —
страницы «Информация» и 6 тестовых изделий (опубликованы); повторные сборки ничего не дублируют и не меняют
правки из админки.

Тестовые фото (AI-визуализации, не настоящие изделия) лежат в `test-data/photos` и загружаются в Vercel Blob при сборке, если хранилище подключено. Без него сборка их пропускает. Сайт с ними держите под паролем (`SITE_PASSWORD`). Локально: `npm run seed:photos`.
