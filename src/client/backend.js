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
}
