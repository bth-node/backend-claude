# Socket.io

Real-time communication with Socket.io — two-way communication between server and client.

**Relevant from**: issue 08 (Socket.io) | **See also**: [SSE.md](SSE.md) for one-way communication

---

## What is Socket.io?

Socket.io provides two-way real-time communication between server and client. Unlike regular HTTP requests (request → response), either side can send messages at any time.

```
Client  ←──── message ────→  Server
        ←──── users ───────
        ──── join ─────────→
        ←──── message ────→
```

This course uses Socket.io for a chat feature — messages are **not** stored in the database, they only live in memory.

---

## The server side

### Setup

Socket.io is mounted on the HTTP server (not the Express app):

```js
import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer(app)
const io = new Server(httpServer)

setupSocket(io)

httpServer.listen(PORT)
```

**Why the HTTP server?** Socket.io needs access to WebSocket upgrades, which Express doesn't handle. `createServer(app)` creates an HTTP server that Express and Socket.io share.

### Event handling

```js
const onlineUsers = new Map()

export function setupSocket(io) {
  io.on('connection', (socket) => {
    // A new client connected

    socket.on('join', (username) => {
      onlineUsers.set(socket.id, username)
      socket.broadcast.emit('message', { user: username, text: 'joined', system: true })
      io.emit('users', [...onlineUsers.values()])
    })

    socket.on('message', ({ user, text }) => {
      io.emit('message', { user, text })
    })

    socket.on('disconnect', () => {
      const username = onlineUsers.get(socket.id)
      onlineUsers.delete(socket.id)
      if (username) {
        io.emit('message', { user: username, text: 'left', system: true })
        io.emit('users', [...onlineUsers.values()])
      }
    })
  })
}
```

### Events used in this course

| Event | Direction | Data | Purpose |
|---|---|---|---|
| `join` | client → server | `username` (string) | Register the user |
| `message` | both directions | `{ user, text, system? }` | Send/receive a chat message |
| `users` | server → client | `[username, ...]` (array) | List online users |
| `disconnect` | automatic | — | The client disconnected |

### emit vs broadcast

| Method | Recipients |
|---|---|
| `io.emit(event, data)` | All connected clients (including the sender) |
| `socket.broadcast.emit(event, data)` | Everyone *except* the sender |
| `socket.emit(event, data)` | Only the sender |

---

## The client side

### The browser

The Socket.io client library is loaded from the server:

```html
<script src="/socket.io/socket.io.js"></script>
```

Connecting and events:

```js
const socket = io()

socket.emit('join', username)

socket.on('message', (msg) => {
  // Show the message in the chat
})

socket.on('users', (userList) => {
  // Update the list of online users
})
```

### Terminal client

`scripts/chat.js` is a Socket.io client that runs in the terminal:

```bash
npm run chat
```

It connects to the server, asks for a username, and lets you send/receive messages from the terminal.

---

## In-memory vs database

The chat in this course is stored **only in memory** — messages disappear when the server restarts. That's deliberate:

| Channel | Storage | Technology | Purpose |
|---|---|---|---|
| Chat (Socket.io) | Memory | WebSocket | Real-time, no need for history |
| Messages (REST) | MongoDB | HTTP + SSE | Persistent, ownership, CRUD |

So the same application has two separate messaging systems with different properties.

---

## Lifecycle

```
1. Client connects        → io.on('connection')
2. Client sends 'join'    → onlineUsers.set(), broadcast 'joined'
3. Client sends a message → io.emit('message') to everyone
4. Client closes the tab  → 'disconnect', onlineUsers.delete(), broadcast 'left'
```

`onlineUsers` (a Map) keeps track of who's connected. `socket.id` is a unique ID Socket.io assigns to each connection.

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| The client doesn't connect | Socket.io isn't mounted on httpServer | Check that `new Server(httpServer)` runs |
| Events disappear | `io.emit` instead of `socket.broadcast.emit` (or vice versa) | Check who's supposed to receive it |
| The user list doesn't update | `io.emit('users', ...)` is missing after join/disconnect | Send a `users` event after every change |
| Messages are duplicated | The client is listening more than once (e.g. on hot reload) | Disconnect old listeners, or check `socket.connected` |
| `/socket.io/socket.io.js` returns 404 | Express serves static files but Socket.io isn't mounted | Make sure `new Server(httpServer)` runs in `index.js` |

### Testing with multiple users

Open several browser tabs (or Chrome + Firefox). Each tab is a separate connection with its own `socket.id`. You can also run `npm run chat` in the terminal alongside the browser.
