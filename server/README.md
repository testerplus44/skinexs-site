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
| `YOOKASSA_SHOP_ID` | Идентификатор магазина в [ЮKassa](https://yookassa.ru/) (пополнение баланса и **оплата ключей** на `steam-topup.html`) |
| `YOOKASSA_SECRET_KEY` | Секретный ключ магазина |
| `SKINEX_STEAM_KEYS_WEBHOOK_URL` | (Опционально) HTTPS URL вашего **Steam-бота**: после успешной оплаты заказа ключей сервер делает `POST` с JSON `{ orderId, userId, keyCount, tradeUrl, amountRub, yookassaPaymentId }`. Бот создаёт trade offer по `tradeUrl` и передаёт ключи. |
| `SKINEX_STEAM_KEYS_WEBHOOK_SECRET` | Если задан — тело запроса подписывается HMAC-SHA256 (hex) в заголовке `X-Skinex-Signature`. |
| `AVATARIX_AGENT_ID` | Идентификатор агента [Avatarix](https://apidoc.avatarix.net) (моментальное пополнение Steam) |
| `AVATARIX_AGENT_PASSWORD` | Пароль агента Avatarix |
| `AVATARIX_SERVICE_STEAM` | Числовой ID услуги Steam в кабинете Avatarix (выдаёт менеджер) |
| `AVATARIX_CURRENCY` | Валюта заявки (по умолчанию `RUB`) |
| `AVATARIX_BASE_URL` | Базовый URL API (без `/home/index`); если пусто — прод `https://processing.avatarix.net` |
| `AVATARIX_SANDBOX` | Если `1` или `true` — используется `https://processingdev.avatarix.net` (если не задан `AVATARIX_BASE_URL`) |
| `SKINEX_PUBLIC_ORIGIN` | Публичный URL сайта без слэша в конце (например `https://skinex.example`), для `return_url` после оплаты и **ссылки в письме сброса пароля**. Если не задан — берётся из запроса |
| `SKINEX_LOG_PASSWORD_RESET_LINK` | Если `1` — в лог сервера выводится полная ссылка сброса (только для отладки без SMTP) |

В личном кабинете ЮKassa укажите URL HTTP-уведомлений:  
`https://<ваш-домен>/api/v1/payments/yookassa/webhook`

## API

- `GET /api/health` — проверка БД и uptime (для мониторинга).
- `GET /api/v1/catalog` — каталог из SQLite (после seed — копия `js/data.js`).
- `GET /api/v1/public/steam-topup-settings` — публичные цифры для `steam-topup.html`: комиссия моментального пополнения (%), цена ключа (₽), профит клиента для оценки баланса Steam (%).
- `POST /api/v1/public/steam-topup/keys-intent` — намерение оплатить выгодное пополнение (для дашборда); JSON: `keyCount`, `amountSiteRub`, `amountSteamRub`, опционально `tradeUrl`, `payMethod`.
- `GET /api/v1/admin/steam-topup-settings`, `PUT /api/v1/admin/steam-topup-settings` — чтение/сохранение настроек Steam (админ). Таблица `steam_topup_settings`.
- `GET /api/v1/admin/steam-topup-events` — выборка событий пополнений для дашборда: query `from`, `to` (unix ms), `method` (`all` \| `instant` \| `keys`), `limit`, `offset`. Таблица `steam_topup_events`.
- `GET /api/v1/admin/steam-keys-orders` — последние заказы ключей (оплата ЮKassa): query `limit` (по умолчанию 200). Таблица `steam_keys_orders`.
- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`
- `POST /api/v1/auth/forgot-password` — JSON `{ "email" }`; письмо со ссылкой на `reset-password.html?token=…` (нужен **SKINEX_SMTP_URL**, иначе письмо остаётся в очереди `notifications`)
- `POST /api/v1/auth/reset-password` — JSON `{ "token", "password" }` (мин. 6 символов); после успеха можно войти с новым паролем
- `POST /api/v1/auth/steam/session` — Steam OpenID + сессия.
- Маркет, заказы, отзывы, тикеты, споры, аудит — см. `routes/apiV1.js`.
- `POST /api/v1/payments/yookassa/topup` — создать платёж на пополнение баланса (сессия, JSON `{ "amountRub": 1000 }`), ответ: `confirmationUrl` для редиректа.
- `POST /api/v1/payments/yookassa/complete-check` — проверить статус после возврата (JSON `{ "topupId": "tup_..." }`).
- `POST /api/v1/payments/yookassa/steam-keys/create` — заказ TF2-ключей (выгодное пополнение): сессия, JSON `{ "keyCount": 1, "tradeUrl": "https://steamcommunity.com/tradeoffer/new/?partner=…&token=…", "payMethod"?: "sbp"|"card" }`. Сумма считается на сервере из настроек (`keys_price_rub` × `keyCount`). Ответ: `confirmationUrl`, `steamKeysOrderId`.
- `POST /api/v1/payments/yookassa/steam-keys/complete-check` — после возврата с ЮKassa (JSON `{ "steamKeysOrderId": "stk_..." }`).
- `POST /api/v1/payments/yookassa/webhook` — уведомления ЮKassa о платеже (проверка статуса через API ЮKassa).
- `POST /api/v1/partner/avatarix/steam/pay` — моментальное пополнение Steam (Avatarix): JSON `{ "steamLogin", "amountRub" }` (сумма к зачислению на Steam, 100–500000), опционально `transactionId` (до 15 символов), `payMethod` (`sbp` \| `card`). Нужны переменные `AVATARIX_*`. Событие пишется в `steam_topup_events`.
- `POST /api/v1/partner/avatarix/steam/status` — статус операции: JSON `{ "transactionId" }`.
- `GET /api/v1/notifications` — in-app уведомления (колокол в шапке), сессия.
- `POST /api/v1/notifications/:id/read` — пометить прочитанным.
- `POST /api/v1/notifications/read-all` — пометить все прочитанными.
- `POST /api/v1/tickets/:id/messages` — сообщение в тикете (клиент или админ/менеджер); уведомление второй стороне.
- `POST /api/v1/admin/broadcast` — рассылка in-app (JSON: `title`, `body`, опционально `link`, `all`: true | `roles`: `["user","trader",…]`). Пустой `link` — без перехода при клике в колоколе.
- `POST /api/v1/payments/webhook` — заглушка под эквайринг (JSON body + секрет).
- `GET /api/v1/auth/me` — в объекте пользователя поле `balanceRub`; при настроенных ключах ЮKassa — флаги `yookassaTopup: true` и `yookassaSteamKeys: true`.

## Резервное копирование

```bash
npm run backup-db
```

## Тесты

```bash
npm test
```
