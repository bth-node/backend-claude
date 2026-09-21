# Server-Sent Events (SSE)

SSE — live updates from server to client over HTTP.

**Relevant from**: issue 09 (SSE) | **See also**: [SOCKETIO.md](SOCKETIO.md) for two-way communication

---

## What is SSE?

Server-Sent Events is a protocol for pushing data from the server to the client. The client opens an HTTP connection that's kept open — the server sends data whenever it wants.

```
Client  ───── GET /api/messages/stream ─────→  Server
        ←──── data: {"text":"Hi"}\n\n ───────
        ←──── data: {"text":"New!"}\n\n ─────
        ←──── (the connection stays alive) ──
```

**SSE vs WebSocket (Socket.io)**: SSE is one-way communication (server → client). Socket.io is two-way. SSE is enough when the client only needs to listen — like a live feed of new messages.

---

## The server side

### Basic structure

```js
const clients = new Set()

router.get('/api/messages/stream', authMiddleware, (req, res) => {
  // 1. Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  // 2. Save the client
  clients.add(res)

  // 3. Clean up when the client disconnects
  req.on('close', () => {
    clients.delete(res)
  })
})
```

### Headers

| Header | Purpose |
|---|---|
| `Content-Type: text/event-stream` | Tells the client the response is an SSE stream |
| `Cache-Control: no-cache` | Prevents proxies/browsers from buffering |
| `Connection: keep-alive` | Keeps the TCP connection open |

`res.flushHeaders()` sends the headers immediately — without waiting for the body.

### Sending events

The SSE format: `data: <content>\n\n` (a double newline ends an event).

```js
// Broadcast to every connected client
const payload = `data: ${JSON.stringify(message)}\n\n`
for (const client of clients) {
  client.write(payload)
}
```

### Filtering recipients

In this course, new messages are sent to everyone *except* the sender:

```js
for (const client of clients) {
  if (client.userId !== req.user._id.toString()) {
    client.write(payload)
  }
}
```

---

## The client side

### EventSource (the browser)

```js
const source = new EventSource('/api/messages/stream', {
  withCredentials: true    // Send cookies
})

source.onmessage = (event) => {
  const message = JSON.parse(event.data)
  // Show the message in the UI
}

source.onerror = () => {
  // The browser automatically tries to reconnect
}
```

`EventSource` handles automatic reconnection — if the connection drops, the browser tries again after a few seconds.

### Terminal client

`scripts/stream.js` is an SSE client that runs in the terminal:

```bash
npm run stream
```

It logs in as a test user, opens the SSE stream, and prints messages in the terminal.

---

## The SSE protocol

### Basic format

```
data: Hello\n\n
```

Every event ends with `\n\n`. The `data:` field holds the payload.

### Named events

```
event: new-message\n
data: {"text":"Hi"}\n\n
```

The client listens with `source.addEventListener('new-message', ...)`.

### Event ID and reconnection

```
id: 42\n
data: {"text":"Hi"}\n\n
```

If the client loses the connection, the browser sends `Last-Event-ID: 42` on the next request. The server can then send all the missed events.

This course uses the simpler format without an ID — on reconnection, the client fetches the full message list instead.

---

## The Observer pattern

The SSE implementation follows the Observer pattern (Publish-Subscribe):

```
New POST /api/messages
    ↓
Save to MongoDB
    ↓
Broadcast to every client (a Set)
    ↓
Each client (SSE connection) receives the payload
```

`clients` (a Set) = the list of subscribers. `client.write()` = notify. The sender (the POST route) doesn't know who or how many clients are listening.

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| No events arrive | `flushHeaders()` is missing | Add `res.flushHeaders()` after setting the headers |
| `401` on connect | The cookie isn't sent | Use `EventSource` with `withCredentials: true` |
| The connection drops immediately | A proxy/load balancer closes idle connections | Send heartbeat events periodically |
| Events are buffered | `Cache-Control` is missing | Add `Cache-Control: no-cache` |
| Memory leak | Clients aren't removed on disconnect | Listen for `req.on('close', ...)` |
