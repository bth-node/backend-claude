const HOST = process.env.HOST || 'localhost'
const PORT = process.env.PORT || 3000
const BASE_URL = `http://${HOST}:${PORT}`

const EMAIL = process.argv[2] || 'alice@example.com'
const PASSWORD = process.argv[3] || 'alice'

console.log(`Logging in as ${EMAIL}...`)

const loginRes = await fetch(`${BASE_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
})

if (!loginRes.ok) {
  console.error(`Login failed: ${loginRes.status} ${loginRes.statusText}`)
  process.exit(1)
}

const setCookie = loginRes.headers.get('set-cookie')
const token = setCookie?.match(/token=([^;]+)/)?.[1]

if (!token) {
  console.error('No token received — is the login route returning a cookie?')
  process.exit(1)
}

console.log(`Logged in. Connecting to ${BASE_URL}/api/messages/stream...\n`)

const streamRes = await fetch(`${BASE_URL}/api/messages/stream`, {
  headers: { Cookie: `token=${token}` },
})

if (!streamRes.ok) {
  console.error(`Stream failed: ${streamRes.status} ${streamRes.statusText}`)
  process.exit(1)
}

console.log('Connected — waiting for messages. Ctrl+C to quit.\n')

const decoder = new TextDecoder()
let buffer = ''

try {
  for await (const chunk of streamRes.body) {
    buffer += decoder.decode(chunk, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const message = JSON.parse(line.slice(6))
          console.log(`[${new Date(message.createdAt).toLocaleTimeString()}] ${message.text}`)
        } catch {
          // ignore malformed lines
        }
      }
    }
  }
} catch {
  // fetch's underlying connection closes itself after a period of inactivity
}

console.log('\nConnection closed. Run "npm run stream" again to reconnect.')
