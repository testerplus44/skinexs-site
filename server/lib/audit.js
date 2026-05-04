const { getDb } = require("./db");

function audit(req, action, detail) {
  try {
    const d = getDb();
    const uid = req.session && req.session.userId ? String(req.session.userId) : null;
    const ip = req.ip || (req.connection && req.connection.remoteAddress) || "";
    d.prepare(
      "INSERT INTO audit_log (user_id, action, detail, ip, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(uid, String(action || ""), detail != null ? String(detail) : "", String(ip), Date.now());
  } catch (e) {
    console.error("[audit]", e.message);
  }
}

module.exports = { audit };
