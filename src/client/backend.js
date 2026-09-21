// BackendCommands — TUI client for the backend API.
// See: issues/04e-client.md

import { BaseCommand } from '@dbwebb/tui'

const HOST = process.env.HOST || 'localhost'
const PORT = process.env.PORT || 3000
const BASE_URL = `http://${HOST}:${PORT}`

export class BackendCommands extends BaseCommand {
  static descriptions = {
    hello: 'hello   Say hello (example command)',
    // TODO: add health and doc commands here
  }

  constructor(shell) {
    super()
    this.shell = shell
  }

  async hello() {
    return `Hello from ${BASE_URL}`
  }

  // TODO: implement health()
  // Call GET /health and display the status code and response body.

  // TODO: implement doc(search)
  // Call GET /api/doc and display the endpoint list.
  // If search is provided, filter the results.
}
