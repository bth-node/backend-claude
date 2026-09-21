# Mongoose

Mongoose ODM — schemas, models, queries, and populate.

**Relevant from**: issue 05 (MongoDB) | **See also**: [MONGODB.md](MONGODB.md) for raw mongosh commands

---

## What is Mongoose?

Mongoose is an ODM (Object Document Mapper) that adds structure on top of MongoDB. Instead of writing raw queries, you define schemas and work with JavaScript objects.

```
MongoDB (documents)  ←→  Mongoose (models)  ←→  Express (routes)
```

**Without Mongoose**: `db.users.findOne({ email })` → you get a raw object, no validation.

**With Mongoose**: `User.findOne({ email })` → you get a Mongoose document with methods, validation, and type checking.

---

## Schema and model

### Defining a schema

```js
import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name:      String,
  email:     { type: String, unique: true },
  password:  String,
  avatar:    String,
  createdAt: { type: Date, default: Date.now },
})

const User = mongoose.model('User', userSchema)
export default User
```

| Part | Purpose |
|---|---|
| `Schema` | Defines field names, types, and rules |
| `model()` | Creates a class tied to a MongoDB collection |
| `'User'` | Mongoose automatically creates the `users` collection (lowercase, plural) |

### Schema types

| Type | Example |
|---|---|
| `String` | `name: String` |
| `Number` | `age: Number` |
| `Boolean` | `active: Boolean` |
| `Date` | `createdAt: { type: Date, default: Date.now }` |
| `ObjectId` | `userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }` |

### Unique fields

```js
email: { type: String, unique: true }
```

Creates a unique index in MongoDB. Trying to create a duplicate produces error code `11000`:

```js
try {
  await User.create({ name, email, password: hash })
} catch (err) {
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Email already registered' })
  }
  throw err
}
```

---

## Timestamps

Mongoose can manage `createdAt` and `updatedAt` automatically:

```js
const messageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
  },
  { timestamps: true }
)
```

`{ timestamps: true }` → Mongoose adds `createdAt` and `updatedAt` automatically on create/update.

---

## Common queries

### Fetch all

```js
const users = await User.find()
```

### Fetch with a filter

```js
const users = await User.find({ name: { $regex: name, $options: 'i' } })
```

`$regex` matches a partial match, `$options: 'i'` makes it case-insensitive.

### Fetch one

```js
const user = await User.findById(req.params.id)
const user = await User.findOne({ email })
```

### Create

```js
const user = await User.create({ name, email, password: hash })
```

### Update

```js
const message = await Message.findOneAndUpdate(
  { _id: req.params.id, userId: req.user._id },
  { text: req.body.text },
  { new: true }
)
```

`{ new: true }` → return the updated document (not the old one).

### Delete

```js
const message = await Message.findOneAndDelete({
  _id: req.params.id,
  userId: req.user._id,
})
```

---

## Select — excluding fields

The password hash should never be sent to the client:

```js
const users = await User.find().select('-password')
const user = await User.findById(id).select('-password')
```

`'-password'` excludes the `password` field from the result. The minus sign means "exclude".

---

## Sorting

```js
const messages = await Message.find({ userId: req.user._id })
  .sort({ createdAt: -1 })    // Newest first
```

`-1` = descending (newest first), `1` = ascending (oldest first).

---

## References and populate

Mongoose can link documents across collections with `ref`:

```js
// In the Message schema:
userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
```

`ref: 'User'` says that `userId` points to a document in the User collection. You can use `populate()` to automatically fetch the related document:

```js
const messages = await Message.find()
  .populate('userId', 'name avatar')   // Fetch only name and avatar from User
```

**Without populate**: `userId` is just an ObjectId (`"6834abc..."`).
**With populate**: `userId` is replaced with the whole User object (or the fields you specify).

---

## Connecting

```js
import mongoose from 'mongoose'

await mongoose.connect(process.env.MONGODB_URI)
```

The connection string is configured in `.env`:

```
MONGODB_URI=mongodb://localhost:27017/node
```

Mongoose handles connection pooling automatically — you only need to call `connect()` once.

### Closing the connection

```js
await mongoose.disconnect()
```

Call this on shutdown (see [EXPRESS.md](EXPRESS.md) — Graceful shutdown).

---

## Mongoose vs mongosh

| Task | Mongoose (in your app) | mongosh (in the terminal) |
|---|---|---|
| Fetch all users | `User.find()` | `db.users.find()` |
| Fetch one user | `User.findById(id)` | `db.users.findOne({ _id: ObjectId(id) })` |
| Create | `User.create({ ... })` | `db.users.insertOne({ ... })` |
| Update | `User.findByIdAndUpdate(id, { ... })` | `db.users.updateOne({ _id: ... }, { $set: { ... } })` |
| Delete | `User.findByIdAndDelete(id)` | `db.users.deleteOne({ _id: ... })` |

Mongoose adds validation, types, and methods. mongosh talks directly to the database — good for troubleshooting and inspecting data.
