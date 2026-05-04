/**
 * SQLite: пользователи, каталог, лоты, заказы, отзывы, тикеты, аудит, уведомления, споры, платежи.
 */
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.SKINEX_DB_PATH || path.join(__dirname, "..", "data", "skinex.db");

let db;

function ensureDir(p) {
  const d = path.dirname(p);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function migrate() {
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      display_name TEXT,
      steam_id TEXT UNIQUE,
      trader_banned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS catalog_items (
      id TEXT PRIMARY KEY,
      json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS market_offers (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      trader_user_id TEXT NOT NULL,
      price INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      hidden INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      trader_display_name TEXT,
      FOREIGN KEY (trader_user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_market_item ON market_offers(item_id);
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      order_number INTEGER,
      status TEXT NOT NULL,
      json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      action TEXT NOT NULL,
      detail TEXT,
      ip TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      payload TEXT NOT NULL,
      error TEXT,
      sent_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS in_app_notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'system',
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      link TEXT,
      read_at INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_in_app_user_created ON in_app_notifications (user_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS disputes (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      notes TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      external_id TEXT,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL,
      json TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS balance_topups (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount_rub INTEGER NOT NULL,
      yookassa_payment_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS trader_applications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      telegram_tag TEXT NOT NULL,
      steam_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      resolved_at INTEGER,
      resolved_by_user_id TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_trader_apps_user_pending ON trader_applications (user_id, status);
  `);
  try {
    db.prepare("SELECT balance_rub FROM users LIMIT 1").get();
  } catch (e) {
    db.exec("ALTER TABLE users ADD COLUMN balance_rub INTEGER NOT NULL DEFAULT 0");
  }
}

function open() {
  if (db) return db;
  ensureDir(DB_PATH);
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  migrate();
  return db;
}

function getDb() {
  if (!db) open();
  return db;
}

module.exports = {
  getDb,
  open,
  DB_PATH,
};
