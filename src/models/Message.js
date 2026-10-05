// Message model — a text message owned by one user.
// See: issues/07b-messages.md

import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
  },
  { timestamps: true }
)

const Message = mongoose.model('Message', messageSchema)

export default Message
