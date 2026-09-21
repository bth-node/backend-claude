# MongoDB

mongosh reference — connecting, commands, and troubleshooting.

**Relevant from**: issue 05 (MongoDB) | **See also**: [MONGOOSE.md](MONGOOSE.md) for the Mongoose ODM, [DOCKER.md](DOCKER.md) for Docker Compose

---

## Configuration

MongoDB runs via Docker Compose. No authentication — open for local development.

| Variable | Default | Description |
|---|---|---|
| `MONGO_PORT` | `27017` | Port (exposed to the host) |
| `MONGODB_URI` | `mongodb://localhost:27017/node` | Connection string for the Node app |

The connection string is configured in `.env`. Data is stored in the `mongo-data` Docker volume.

---

## Start

```bash
docker compose up -d
```

---

## Connect with mongosh

```bash
docker compose exec mongodb mongosh node
```

`node` is the database name (matches `MONGODB_URI`).

---

## Basic commands

```javascript
// Show all databases
show dbs

// Switch to the node database
use node

// Show all collections
show collections

// Count documents
db.users.countDocuments()
db.messages.countDocuments()
```

---

## Users

### List all users

```javascript
db.users.find({}, { name: 1, email: 1, avatar: 1, createdAt: 1 }).pretty()
```

### Find a specific user

```javascript
db.users.findOne({ email: "alice@example.com" })
```

### Delete a user

```javascript
db.users.deleteOne({ email: "alice@example.com" })
```

### Show without the password

```javascript
db.users.find({}, { password: 0 }).pretty()
```

---

## Messages

### Show all messages

```javascript
db.messages.find().sort({ createdAt: -1 }).pretty()
```

### Show messages for one user

```javascript
// Find the user's _id first
const user = db.users.findOne({ email: "alice@example.com" })

// Show their messages
db.messages.find({ userId: user._id }).pretty()
```

### Delete all messages

```javascript
db.messages.deleteMany({})
```

---

## Resetting the database

### Delete all data (keep the volume)

```javascript
db.users.deleteMany({})
db.messages.deleteMany({})
```

### Remove the volume entirely

```bash
docker compose down
docker volume rm backend_mongo-data
docker compose up -d
```

After resetting: register new users through the frontend (passwords are hashed automatically), or re-insert them via Compass with plaintext passwords and run `npm run seed` to hash them in place — `npm run seed` only hashes existing users, it does not create any.

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `mongosh: command not found` | mongosh not installed locally | Run it via Docker: `docker compose exec mongodb mongosh node` |
| `MongoServerError: connection refused` | The MongoDB container isn't running | `docker compose up -d` |
| `MONGODB_URI` doesn't match the port | `MONGO_PORT` and `MONGODB_URI` out of sync | Check that the port in the URI matches `MONGO_PORT` |
| The database is empty after a restart | `docker compose down -v` removed the volume | Register users through the frontend, or re-insert them via Compass and run `npm run seed` |
