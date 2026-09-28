// User model — Mongoose schema mapping user documents in MongoDB.
// See: issues/05-mongodb.md

import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    avatar: String,
    createdAt: { type: Date, default: Date.now },
  },
  { toJSON: { virtuals: true } }
)

const User = mongoose.model('User', userSchema)

export default User
