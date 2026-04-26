import { createServer } from "http";
import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 8080;
const PING_INTERVAL = 20_000; // 20s keepalive
const ROOM_GRACE_PERIOD = 30_000; // 30s — room stays joinable after host disconnects

const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("lets-bonk relay ok");
});

const wss = new WebSocketServer({ server });
// rooms: code -> { host, guest, createdAt, cleanupTimer }
const rooms = new Map();
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

function cleanupRoom(code) {
  const room = rooms.get(code);
  if (!room) return;
  if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
  rooms.delete(code);
  console.log(`Room ${code} deleted`);
}

function scheduleCleanup(code, delay) {
  const room = rooms.get(code);
  if (!room) return;
  if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
  room.cleanupTimer = setTimeout(() => cleanupRoom(code), delay);
  console.log(`Room ${code} scheduled for cleanup in ${delay / 1000}s`);
}

// Ping all clients every 20s
const interval = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, PING_INTERVAL);

wss.on("close", () => clearInterval(interval));

wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });

  let myRoom = null;
  let myRole = null;

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === "create") {
      const code = makeCode();
      rooms.set(code, { host: ws, guest: null, createdAt: Date.now(), cleanupTimer: null });
      myRoom = code;
      myRole = "host";
      send(ws, { type: "created", room: code });
      console.log(`Room ${code} created`);
      return;
    }

    if (msg.type === "join") {
      const code = msg.room?.toUpperCase();
      const room = rooms.get(code);
      if (!room) {
        send(ws, { type: "error", message: "Room not found" });
        console.log(`Join failed: room ${code} not found`);
        return;
      }
      if (room.guest) {
        send(ws, { type: "error", message: "Room is full" });
        console.log(`Join failed: room ${code} full`);
        return;
      }

      // Cancel any pending cleanup
      if (room.cleanupTimer) {
        clearTimeout(room.cleanupTimer);
        room.cleanupTimer = null;
      }

      room.guest = ws;
      myRoom = code;
      myRole = "guest";
      send(ws, { type: "joined" });
      if (room.host && room.host.readyState === 1) {
        send(room.host, { type: "peer_joined" });
      }
      console.log(`Room ${code} guest joined`);
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

    if (myRole === "host") {
      room.host = null;
      // Don't delete immediately — keep room joinable for grace period
      if (!room.guest) {
        scheduleCleanup(myRoom, ROOM_GRACE_PERIOD);
      } else {
        // Guest is connected, notify them
        if (peer) send(peer, { type: "peer_left" });
        scheduleCleanup(myRoom, 5000); // shorter cleanup if guest is there
      }
    } else {
      room.guest = null;
      if (peer) send(peer, { type: "peer_left" });
      // If host is also gone, cleanup
      if (!room.host || room.host.readyState !== 1) {
        scheduleCleanup(myRoom, 5000);
      }
    }

    console.log(`Room ${myRoom} ${myRole} disconnected`);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Relay server listening on port ${PORT}`);
});
