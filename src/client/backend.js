// BackendCommands — TUI client for the backend API.
// See: issues/04e-client.md

import { BaseCommand } from '@dbwebb/tui'

const HOST = process.env.HOST || 'localhost'
const PORT = process.env.PORT || 3000
const BASE_URL = `http://${HOST}:${PORT}`

export class BackendCommands extends BaseCommand {
  static descriptions = {
    hello: 'hello                    Say hello (example command)',
    health: 'health                   Show server health status',
    doc: 'doc [search]             List API endpoints, optionally filtered by search term',
    login: 'login <email> <password> Log in and store the auth cookie',
    logout: 'logout                   Log out and clear the stored cookie',
    me: 'me                       Show the logged-in user profile',
    messages: 'messages                 List your messages (requires login)',
    post: 'post <text>              Create a new message (requires login)',
    stream: 'stream                   Watch the live message feed (requires login, Ctrl-C to stop)',
    chat: 'chat <username>          Join the Socket.io chat (Ctrl-C to disconnect)',
  }

  cookie = null

  constructor(shell) {
    super()
    this.shell = shell
  }

  async hello() {
    return `Hello from ${BASE_URL}`
  }

  async health() {
    const res = await fetch(`${BASE_URL}/health`)
    const body = await res.json()
    console.log(`Status: ${res.status}`)
    console.table(body)
  }

  async doc(search) {
    const res = await fetch(`${BASE_URL}/api/doc`)
    const body = await res.json()

    const endpoints = search
      ? body.endpoints.filter((ep) =>
          [ep.method, ep.path, ep.description]
            .join(' ')
            .toLowerCase()
            .includes(search.toLowerCase())
        )
      : body.endpoints

    console.log(`Status: ${res.status}`)
    console.table(endpoints)
  }

  async login(email, password) {
    if (!email || !password) {
      return 'Usage: login <email> <password>'
    }

    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const body = await res.json()

    console.log(`Status: ${res.status}`)

    if (!res.ok) {
      console.log(body.message)
      return
    }

    this.cookie = res.headers.get('set-cookie')
    console.log(`Cookie: ${this.cookie}`)
    console.log(`Logged in as ${body.user.name} <${body.user.email}>`)
  }

  async logout() {
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: this.cookie ? { Cookie: this.cookie } : {},
    })
    const body = await res.json()

    this.cookie = null
    console.log(`${res.status} — ${body.message}`)
  }

  async me() {
    if (!this.cookie) {
      return 'Not logged in — run: login <email> <password>'
    }

    const res = await fetch(`${BASE_URL}/api/me`, {
      headers: { Cookie: this.cookie },
    })
    const body = await res.json()

    console.log(`Status: ${res.status}`)
    console.table(body)
  }

  async messages() {
    if (!this.cookie) {
      return 'Not logged in — run: login <email> <password>'
    }

    const res = await fetch(`${BASE_URL}/api/messages`, {
      headers: { Cookie: this.cookie },
    })
    const body = await res.json()

    if (!res.ok) {
      return `${res.status} — ${body.message}`
    }

    console.table(body.map(({ text, createdAt }) => ({ text, createdAt })))
  }

  async post(...words) {
    const text = words.join(' ')

    if (!text.trim()) {
      return 'Usage: post <text>'
    }

    if (!this.cookie) {
      return 'Not logged in — run: login <email> <password>'
    }

    const res = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: this.cookie },
      body: JSON.stringify({ text }),
    })
    const body = await res.json()

    console.log(`Status: ${res.status}`)
    console.table(body)
  }

  async stream() {
    if (!this.cookie) {
      return 'Not logged in — run: login <email> <password>'
    }

    const signal = this.shell.cancelSignal()

    try {
      const res = await fetch(`${BASE_URL}/api/messages/stream`, {
        headers: { Cookie: this.cookie },
        signal,
      })

      if (!res.ok) {
        const body = await res.json()
        return `${res.status} — ${body.message}`
      }

      console.log('Listening for messages... (Ctrl-C to stop)')

      for await (const chunk of res.body) {
        for (const line of Buffer.from(chunk).toString().split('\n')) {
          if (!line.startsWith('data:')) {
            continue
          }

          try {
            const data = JSON.parse(line.slice(5))
            console.log(`[${data.user?.name ?? 'unknown'}] ${data.text}`)
          } catch {
            // A line split across two chunks fails to parse — skip it
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        throw err
      }
    }

    console.log('\nStream stopped.')
  }

  async chat(username) {
    if (!username) {
      return 'Usage: chat <username>'
    }

    const { io } = await import('socket.io-client')

    const socket = io(BASE_URL)

    const controller = new AbortController()
    this.shell.cancelSignal().addEventListener('abort', () => controller.abort())
    socket.on('disconnect', () => controller.abort())

    console.log(`Connecting as "${username}"... (Ctrl-C to disconnect)`)

    socket.on('connect', () => {
      socket.emit('join', username)
      console.log('Connected.')
    })

    socket.on('message', ({ user, text, system }) => {
      console.log(system ? `* ${user} ${text}` : `[${user}] ${text}`)
    })

    socket.on('users', (list) => {
      console.log(`Online: ${list.join(', ')}`)
    })

    while (!controller.signal.aborted) {
      let line
      try {
        line = await this.shell.ask('', { signal: controller.signal })
      } catch {
        break
      }

      if (line.trim()) {
        socket.emit('message', { user: username, text: line.trim() })
      }
    }

    socket.disconnect()
    console.log('\nDisconnected from chat.')
  }
}
