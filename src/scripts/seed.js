import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB')

  const users = await User.find()

  if (users.length === 0) {
    console.log('No users found — add users via MongoDB Compass first')
    process.exit(0)
  }

  let updated = 0

  for (const user of users) {
    if (user.password?.startsWith('$2b$') || user.password?.startsWith('$2a$')) {
      console.log(`${user.name}: already hashed, skipping`)
      continue
    }

    user.password = await bcrypt.hash(user.password ?? '', 10)
    await user.save()
    console.log(`${user.name}: password hashed`)
    updated++
  }

  console.log(`Done — ${updated} of ${users.length} users updated`)
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
