#!/usr/bin/env node
/**
 * Памятка: что сделать вручную для выдачи ключей (Valve не даёт создать аккаунт через API).
 */
console.log(`
=== Skinexs: настройка Steam-бота для ключей ===

Бот уже в коде (server/steam-bot). Он стартует вместе с сайтом (npm start / pm2).

--- Что ВЫ делаете один раз ---

1) Создайте отдельный аккаунт Steam (не личный).
2) Установите Steam Mobile Authenticator (2FA) минимум на 15 дней для нормальных трейдов.
3) Положите в инвентарь TF2 ключи: Mann Co. Supply Crate Key.
4) Включите обмены в настройках Steam.

5) Экспортируйте shared_secret (SDA / SteamDesktopAuthenticator / maFile).

6) На сервере в server/.env (или PM2 env) добавьте:

   STEAM_BOT_ACCOUNT_NAME=логин_бота
   STEAM_BOT_PASSWORD=пароль
   STEAM_BOT_SHARED_SECRET=из_maFile
   SKINEX_STEAM_KEYS_WEBHOOK_SECRET=длинная_случайная_строка_32+_символов

   SKINEX_PUBLIC_ORIGIN=https://ваш-домен.ru
   YOOKASSA_SHOP_ID=...
   YOOKASSA_SECRET_KEY=...

   (SKINEX_STEAM_KEYS_WEBHOOK_URL можно не задавать — по умолчанию http://127.0.0.1:3847/deliver)

7) cd server && npm install && pm2 restart skinexs-staging

8) Проверка:
   curl http://127.0.0.1:3847/health

9) Тест без реального трейда: STEAM_BOT_DRY_RUN=1 — оплата пройдёт, ключи не уйдут.

--- Что прислать разработчику (без секретов) ---

Домен, что ЮKassa тест/бой, лог «pm2 logs» после тестовой оплаты 1 ключа.

`);