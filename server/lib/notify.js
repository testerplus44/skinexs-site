/**
 * Очередь email (nodemailer) + in-app уведомления в SQLite.
 */
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { getDb } = require("./db");

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  const url = process.env.SKINEX_SMTP_URL;
  if (!url) return null;
  try {
    transporter = nodemailer.createTransport(url);
    return transporter;
  } catch (e) {
    console.error("[notify] SMTP init failed:", e.message);
    return null;
  }
}

function enqueue(userId, channel, payloadObj) {
  const id = "ntf_" + crypto.randomBytes(12).toString("hex");
  const db = getDb();
  db.prepare(
    "INSERT INTO notifications (id, user_id, channel, payload, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(id, String(userId), String(channel), JSON.stringify(payloadObj || {}), Date.now());
  return id;
}

async function processOne(row) {
  const t = getTransporter();
  const payload = JSON.parse(row.payload || "{}");
  if (row.channel === "email" && t) {
    const to = payload.to;
    const subject = payload.subject || "Skinexs";
    const text = payload.text || "";
    if (to) {
      await t.sendMail({
        from: process.env.SKINEX_MAIL_FROM || "noreply@localhost",
        to,
        subject,
        text,
      });
    }
  }
  const db = getDb();
  db.prepare("UPDATE notifications SET sent_at = ?, error = NULL WHERE id = ?").run(Date.now(), row.id);
}

function startWorker(intervalMs) {
  const ms = Number(intervalMs) || 15000;
  setInterval(async () => {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM notifications WHERE sent_at IS NULL ORDER BY created_at ASC LIMIT 10")
      .all();
    for (const row of rows) {
      try {
        await processOne(row);
      } catch (e) {
        db.prepare("UPDATE notifications SET error = ? WHERE id = ?").run(String(e.message), row.id);
      }
    }
  }, ms);
}

/** In-app колокол: видно в UI без SMTP. */
function notifyInApp(userId, opts) {
  const o = opts || {};
  const id = "bin_" + crypto.randomBytes(12).toString("hex");
  const db = getDb();
  db.prepare(
    "INSERT INTO in_app_notifications (id, user_id, kind, title, body, link, read_at, created_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)",
  ).run(
    id,
    String(userId),
    String(o.kind || "system"),
    String(o.title || "Уведомление"),
    o.body != null ? String(o.body) : "",
    o.link != null && String(o.link).trim() !== "" ? String(o.link).trim() : null,
    Date.now(),
  );
  return id;
}

/** Админы и менеджеры поддержки. */
function notifyStaffInApp(opts) {
  const db = getDb();
  const rows = db.prepare("SELECT id FROM users WHERE role IN ('admin', 'manager')").all();
  const ids = [];
  for (let i = 0; i < rows.length; i++) ids.push(notifyInApp(rows[i].id, opts));
  return ids;
}

module.exports = { enqueue, startWorker, getTransporter, notifyInApp, notifyStaffInApp };
