import { createServer } from "http";
import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 8080;

// HTTP server — needed for Railway/Render health checks + WS upgrade
const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("lets-bonk relay ok");
});

const wss = new WebSocketServer({ server });
const rooms = new Map(); // code -> { host, guest }
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
  let code;
  do {
    code = Array.from({ length: 4 }, () => CHARS[Math.random() * CHARS.length | 0]).join("");
  } while (rooms.has(code));
  return code;
}

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

wss.on("connection", (ws) => {
  let myRoom = null;
  let myRole = null;

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === "create") {
      const code = makeCode();
      rooms.set(code, { host: ws, guest: null });
      myRoom = code;
      myRole = "host";
      send(ws, { type: "created", room: code });
      return;
    }

    if (msg.type === "join") {
      const room = rooms.get(msg.room);
      if (!room || room.guest) {
        send(ws, { type: "error", message: "Room not found or full" });
        return;
      }
      room.guest = ws;
      myRoom = msg.room;
      myRole = "guest";
      send(ws, { type: "joined" });
      send(room.host, { type: "peer_joined" });
      return;
    }

    // Forward everything else to the other peer
    if (!myRoom) return;
    const room = rooms.get(myRoom);
    if (!room) return;
    const peer = myRole === "host" ? room.guest : room.host;
    if (peer && peer.readyState === 1) peer.send(raw.toString());
  });

  ws.on("close", () => {
    if (!myRoom) return;
    const room = rooms.get(myRoom);
    if (!room) return;
    const peer = myRole === "host" ? room.guest : room.host;
    if (peer) send(peer, { type: "peer_left" });
    rooms.delete(myRoom);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Relay server listening on port ${PORT}`);
});
