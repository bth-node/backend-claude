import mongoose from 'mongoose'
import User from '../models/User.js'
import Message from '../models/Message.js'

const USERS = [
  { name: 'Alice Johansson', email: 'alice@example.com', password: 'alice', avatar: 'alice.svg' },
  { name: 'Bob Lindqvist', email: 'bob@example.com', password: 'bob', avatar: 'bob.svg' },
  { name: 'Clara Eriksson', email: 'clara@example.com', password: 'clara', avatar: 'clara.svg' },
]

async function resetDb() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB')

  const { deletedCount: messagesDeleted } = await Message.deleteMany({})
  const { deletedCount: usersDeleted } = await User.deleteMany({})
  console.log(`Cleared ${usersDeleted} user(s) and ${messagesDeleted} message(s)`)

  await User.insertMany(USERS)
  console.log(`Inserted ${USERS.length} user(s): ${USERS.map((u) => u.name).join(', ')}`)

  console.log('Passwords are plaintext — run "npm run seed" next to hash them')
  process.exit(0)
}

resetDb().catch((err) => {
  console.error(err)
  process.exit(1)
})
