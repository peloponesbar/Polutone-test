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
