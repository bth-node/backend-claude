import { io } from 'socket.io-client'
import { createInterface } from 'readline'

const HOST = process.env.HOST || 'localhost'
const PORT = process.env.PORT || 3000
const URL = `http://${HOST}:${PORT}`
const USERNAME = process.argv[2] || 'terminal'

console.log(`Connecting to ${URL} as "${USERNAME}"...`)

const socket = io(URL, { reconnection: false })

const rl = createInterface({ input: process.stdin, output: process.stdout })

socket.on('connect', () => {
  console.log('Connected. Type a message and press Enter. Ctrl+C to quit.\n')
  socket.emit('join', USERNAME)
})

socket.on('connect_error', (err) => {
  console.error(`Connection failed: ${err.message}`)
  console.error(`Is the server running at ${URL}?`)
  process.exit(1)
})

socket.on('message', ({ user, text, system }) => {
  if (system) {
    console.log(`* ${user} ${text}`)
  } else {
    console.log(`[${user}] ${text}`)
  }
})

socket.on('users', (list) => {
  console.log(`Online: ${list.join(', ')}`)
})

socket.on('disconnect', () => {
  console.log('Disconnected')
  process.exit(0)
})

rl.on('line', (text) => {
  const trimmed = text.trim()
  if (trimmed) socket.emit('message', { user: USERNAME, text: trimmed })
})

rl.on('close', () => {
  socket.disconnect()
  process.exit(0)
})
