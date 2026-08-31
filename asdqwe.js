const http2 = require("http2");
const WebSocket = require("ws");
const fs = require("fs");
const { TOTP } = require("totp-generator");

const TOKEN = "";
const GUILD_ID = "";
const client = http2.connect("https://discord.com");

function getMfa() {
  try {
    const s = fs.readFileSync("mfa.txt", "utf8").trim();
    return s ? TOTP.generate(s).otp : null;
  } catch { return null; }
}

function claim(vanity) {
  const mfa = getMfa();
  const headers = {
    ":method": "PATCH",
    ":path": `/api/v10/guilds/${GUILD_ID}/vanity-url`,
    authorization: TOKEN,
    "content-type": "application/json",
    "user-agent": "Discord-Android/210000; Samsung GT-I9300; Android 4.3"
  };
  if (mfa) headers["x-discord-mfa-authorization"] = mfa;

  const req = client.request(headers);
  req.on("response", (h) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => console.log(`[>] ${vanity} -> ${h[":status"]} ${d}`));
  });
  req.end(JSON.stringify({ code: vanity }));
}

const ws = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");

ws.on("message", (raw) => {
  const { op, t, d } = JSON.parse(raw);
  if (op === 10) {
    ws.send(JSON.stringify({ op: 1, d: null }));
    ws.send(JSON.stringify({
      op: 2,
      d: {
        token: TOKEN,
        properties: { os: "Android", browser: "Discord Android", device: "Samsung Galaxy S3 (GT-I9300) CLOUDFLARE BYPASS ACTIVATED" },
        intents: 1
      }
    }));
  } else if (t === "GUILD_UPDATE" && d?.vanity_url_code) {
    claim(d.vanity_url_code);
  }
});
ws.on("open", () => console.log("telepatia"));