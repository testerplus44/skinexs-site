/**
 * Учётные данные администратора (только клиент — смените перед публикацией).
 * Вход на auth.html тем же email и паролем.
 */
window.SKINEX_ADMIN_EMAIL = "admin@skinex.local";
window.SKINEX_ADMIN_PASSWORD = "SkinexsAdmin2026";
window.SKINEX_ADMIN_SESSION_HOURS = 12;

/**
 * Steam: полный URL POST /api/auth/steam/verify (пусто = тот же origin).
 * На проде можно указать отдельный API-домен.
 */
window.SKINEX_STEAM_VERIFY_URL = "";

/**
 * Только для отладки без backend: при сбое verify разбирать query в браузере (небезопасно).
 * В продакшене оставьте false.
 */
window.SKINEX_STEAM_ALLOW_INSECURE_PARSE = false;

/**
 * Серверный режим по умолчанию true (см. server-config.js). ЮKassa — только при запущенном API.
 * Раскомментируйте строку ниже, если открываете HTML без Node (демо в браузере без оплаты).
 */
// window.SKINEX_USE_SERVER_API = false;
