import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// The embedded canvas must not register a deprecated event blocked by
// Permissions-Policy: unload=(). Run after dependency installation.
const development = await readFile(
  new URL(
    '../node_modules/@excalidraw/excalidraw/dist/dev/index.js',
    import.meta.url
  ),
  'utf8'
)
const production = await readFile(
  new URL(
    '../node_modules/@excalidraw/excalidraw/dist/prod/index.js',
    import.meta.url
  ),
  'utf8'
)
assert.ok(!development.includes('addEventListener(window, "unload"'))
assert.ok(
  development.includes(
    'addEventListener(window, "pagehide", this.onUnload, false)'
  )
)
assert.ok(!production.includes('Ae(window,"unload",this.onUnload'))
assert.ok(production.includes('Ae(window,"pagehide",this.onUnload,!1)'))
console.log(
  'Canvas page lifecycle patch verified for development and production.'
)
