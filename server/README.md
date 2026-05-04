# Skinexs server (API v1 + SQLite)

## Запуск

```bash
cd server
npm install
npm start
```

Сайт открывайте с того же хоста и порта (например `http://localhost:3000`). В `js/admin-config.js` раскомментируйте `window.SKINEX_USE_SERVER_API = true`, чтобы вход и каталог шли через API.

## Переменные окружения

| Переменная | Назначение |
|------------|------------|
| `PORT` | Порт HTTP (по умолчанию 3000) |
| `SKINEX_DB_PATH` | Путь к файлу SQLite (по умолчанию `server/data/skinex.db`) |
| `SKINEX_SESSION_SECRET` | Секрет подписи cookie-сессии (**обязательно сменить в продакшене**) |
| `SKINEX_ADMIN_EMAIL` | Email администратора при первом seed (по умолчанию `admin@skinex.local`) |
| `SKINEX_ADMIN_PASSWORD` | Пароль администратора при первом seed |
| `SKINEX_STEAM_RETURN_HOSTS` | Через запятую: разрешённые hostname в `openid.return_to` |
| `SKINEX_RATE_LIMIT_MAX` | Лимит запросов к `/api/*` за 15 мин (по умолчанию 400) |
| `SKINEX_AUTH_RATE_LIMIT_MAX` | Лимит для `/api/v1/auth` и `/api/auth` (по умолчанию 60) |
| `SKINEX_SMTP_URL` | URL SMTP для nodemailer (если пусто — письма только в таблице `notifications`) |
| `SKINEX_MAIL_FROM` | Адрес отправителя |
| `SKINEX_SUPPORT_EMAIL` | Куда слать копии тикетов |
| `SKINEX_PAYMENT_WEBHOOK_SECRET` | Секрет для заголовка `X-SKINEX-Secret` у webhook оплаты |
| `YOOKASSA_SHOP_ID` | Идентификатор магазина в [ЮKassa](https://yookassa.ru/) (для пополнения баланса) |
| `YOOKASSA_SECRET_KEY` | Секретный ключ магазина |
| `SKINEX_PUBLIC_ORIGIN` | Публичный URL сайта без слэша в конце (например `https://skinex.example`), для `return_url` после оплаты. Если не задан — берётся из запроса |

В личном кабинете ЮKassa укажите URL HTTP-уведомлений:  
`https://<ваш-домен>/api/v1/payments/yookassa/webhook`

## API

- `GET /api/health` — проверка БД и uptime (для мониторинга).
- `GET /api/v1/catalog` — каталог из SQLite (после seed — копия `js/data.js`).
- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`
- `POST /api/v1/auth/steam/session` — Steam OpenID + сессия.
- Маркет, заказы, отзывы, тикеты, споры, аудит — см. `routes/apiV1.js`.
- `POST /api/v1/payments/yookassa/topup` — создать платёж на пополнение баланса (сессия, JSON `{ "amountRub": 1000 }`), ответ: `confirmationUrl` для редиректа.
- `POST /api/v1/payments/yookassa/complete-check` — проверить статус после возврата (JSON `{ "topupId": "tup_..." }`).
- `POST /api/v1/payments/yookassa/webhook` — уведомления ЮKassa о платеже (проверка статуса через API ЮKassa).
- `GET /api/v1/notifications` — in-app уведомления (колокол в шапке), сессия.
- `POST /api/v1/notifications/:id/read` — пометить прочитанным.
- `POST /api/v1/notifications/read-all` — пометить все прочитанными.
- `POST /api/v1/tickets/:id/messages` — сообщение в тикете (клиент или админ/менеджер); уведомление второй стороне.
- `POST /api/v1/admin/broadcast` — рассылка in-app (JSON: `title`, `body`, опционально `link`, `all`: true | `roles`: `["user","trader",…]`). Пустой `link` — без перехода при клике в колоколе.
- `POST /api/v1/payments/webhook` — заглушка под эквайринг (JSON body + секрет).
- `GET /api/v1/auth/me` — в объекте пользователя поле `balanceRub`; при настроенных ключах — флаг `yookassaTopup: true`.

## Резервное копирование

```bash
npm run backup-db
```

## Тесты

```bash
npm test
```
