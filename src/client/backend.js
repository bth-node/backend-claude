// BackendCommands — TUI client for the backend API.
// See: issues/04e-client.md

import { BaseCommand } from '@dbwebb/tui'

const HOST = process.env.HOST || 'localhost'
const PORT = process.env.PORT || 3000
const BASE_URL = `http://${HOST}:${PORT}`

export class BackendCommands extends BaseCommand {
  static descriptions = {
    hello: 'hello          Say hello (example command)',
    health: 'health         Show server health status',
    doc: 'doc [search]   List API endpoints, optionally filtered by search term',
  }

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
}
