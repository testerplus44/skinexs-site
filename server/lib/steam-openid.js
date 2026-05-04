const https = require("https");
const { URL } = require("url");

const STEAM_OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";

function postSteamOpenIdCheck(bodyStr) {
  const u = new URL(STEAM_OPENID_ENDPOINT);
  return new Promise((resolve, reject) => {
    const buf = Buffer.from(bodyStr, "utf8");
    const req = https.request(
      {
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
          "Content-Length": buf.length,
          "User-Agent": "SkinexsOpenID/1.0",
          Accept: "text/plain,*/*",
        },
      },
      (steamRes) => {
        const chunks = [];
        steamRes.on("data", (c) => chunks.push(c));
        steamRes.on("end", () => {
          resolve({
            status: steamRes.statusCode,
            text: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
    req.write(buf);
    req.end();
  });
}

function allowedReturnHosts() {
  const raw = process.env.SKINEX_STEAM_RETURN_HOSTS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function returnToHostAllowed(hostname) {
  const list = allowedReturnHosts();
  if (list.length === 0) return true;
  const h = String(hostname || "").toLowerCase();
  return list.indexOf(h) >= 0;
}

/**
 * @returns {Promise<{ ok: boolean, steamId?: string, message?: string }>}
 */
async function verifySteamQueryString(q) {
  const clean = String(q || "").replace(/^\?/, "");
  const params = new URLSearchParams(clean);
  const mode = params.get("openid.mode");
  if (mode !== "id_res") {
    return { ok: false, message: mode ? "Некорректный режим OpenID." : "Нет ответа Steam." };
  }
  const returnTo = params.get("openid.return_to") || "";
  try {
    const ru = new URL(returnTo);
    if (!/^https?:$/.test(ru.protocol)) {
      return { ok: false, message: "Некорректный return_to." };
    }
    if (!returnToHostAllowed(ru.hostname)) {
      return { ok: false, message: "Домен return_to не разрешён." };
    }
  } catch (e) {
    return { ok: false, message: "Некорректный openid.return_to." };
  }

  const body = new URLSearchParams();
  params.forEach((value, key) => {
    if (key.startsWith("openid.")) body.set(key, value);
  });
  body.set("openid.mode", "check_authentication");

  const steamRes = await postSteamOpenIdCheck(body.toString());
  const text = steamRes.text || "";
  if (steamRes.status !== 200 || !/is_valid\s*:\s*true/i.test(text)) {
    return { ok: false, message: "Steam не подтвердил вход (is_valid)." };
  }

  const idStr = params.get("openid.claimed_id") || params.get("openid.identity");
  const m = idStr && String(idStr).match(/\/openid\/id\/(\d{5,20})$/);
  const steamId = m ? m[1] : null;
  if (!steamId) return { ok: false, message: "Не удалось извлечь Steam ID." };
  return { ok: true, steamId };
}

module.exports = { verifySteamQueryString, postSteamOpenIdCheck };
