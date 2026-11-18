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

Vercel собирает сайт из GitHub после каждого коммита (скрипт `vercel-build`: сначала `payload migrate`, потом `next build`).

Переменные окружения в Vercel (Settings → Environment Variables):

| Переменная | Значение |
|---|---|
| `DATABASE_URL` | Строка подключения Neon (pooled, `...-pooler...neon.tech/...?sslmode=require`) |
| `PAYLOAD_SECRET` | Длинная случайная строка, своя для этого сайта |
| `CATALOG_SOURCE` | `mock` |
| `SITE_PASSWORD` | Пароль на весь сайт (имя пользователя любое); пусто — сайт открыт |

Наполнение базы Neon тестовыми товарами и страницами «Информация» — с этого компьютера:
положить строку Neon в `.env` как `NEON_DATABASE_URL`, затем выполнить с `DATABASE_URL`, равным ей:
`npm run migrate`, `npm run seed:info`, `npm run seed:mock`. Фото (`seed:photos`) на тестовый сайт не загружаются.
