# Docker Compose

Docker Compose runs MongoDB as a supporting service. Your Express server runs locally with `npm run dev` — not in Docker during development.

**Relevant from**: issue 05 (MongoDB)

---

## Services

| Service | Image | Port | Description |
|---|---|---|---|
| `mongodb` | `mongo:8` | 27017 | Database |

The container has no fixed name — Docker Compose names it automatically after the directory the repo lives in (e.g. `backend-mongodb-1`). That means several checkouts of the same repo (e.g. your own repo and a student's) can run MongoDB at the same time without container names colliding.

---

## Common commands

### Start

```bash
docker compose up -d              # Start MongoDB in the background
```

### Stop

```bash
docker compose down               # Stop, keep volumes (data is preserved)
docker compose down -v            # Stop, remove volumes (all data is deleted)
```

### Logs

```bash
docker compose logs mongodb       # Show logs
docker compose logs -f mongodb    # Follow logs in real time
```

### Status

```bash
docker compose ps                 # Show running containers
docker compose ps -a              # Show all (including stopped)
```

---

## Ports

| Port | Service | Configured by |
|---|---|---|
| 3000 | Your Express server | `PORT` in `.env` |
| 27017 | MongoDB | `MONGO_PORT` in `.env` / `docker-compose.yml` |

The MongoDB port is controlled by the `MONGO_PORT` environment variable, defaulting to `27017`:

```yaml
ports:
  - "${MONGO_PORT:-27017}:27017"
```

If a port is blocked, see [FAQ.md](FAQ.md).

---

## Volumes

| Volume | Service | Content |
|---|---|---|
| `mongo-data` | MongoDB | All database data |

Volumes survive `docker compose down` — the data is still there next time you start it. Use `docker compose down -v` to remove them.

---

## Resetting MongoDB

### Option 1: remove the volume (deletes all data)

```bash
docker compose down
docker volume rm backend_mongo-data
docker compose up -d
```

### Option 2: clear it from inside mongosh (keep the volume)

```bash
docker compose exec mongodb mongosh node
```

```javascript
db.users.deleteMany({})
db.messages.deleteMany({})
```

See [MONGODB.md](MONGODB.md) for more mongosh commands.

---

## Common problems

**Container won't start (network not found)**: the Docker network is stale:

```bash
docker compose down
docker compose up -d
```

**Port already in use**: another process is using port 27017. See [FAQ.md](FAQ.md).

**The volume is corrupted**: remove the volume and start over:

```bash
docker compose down -v
docker compose up -d
```
