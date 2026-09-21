// TUI client entry point.
// See: issues/04e-client.md

import { CommandRegistry, TuiShell } from '@dbwebb/tui'
import { BackendCommands } from './backend.js'

const registry = new CommandRegistry()
const shell = new TuiShell(registry, { defaultGroup: 'backend' })
registry.register('backend', new BackendCommands(shell))

console.log('Backend Client — type "help" for available commands or "exit" to quit.')

shell.start()
