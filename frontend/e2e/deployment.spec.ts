import { spawn, type ChildProcess } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test, type Page } from '@playwright/test'

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const PREVIEW_URL = 'http://127.0.0.1:8100'
// Spawn vite through node directly: an `npx` wrapper would be killed by
// stopPreview while its grandchild server survived, still holding the port.
const VITE_JS = join(FRONTEND_DIR, 'node_modules', 'vite', 'bin', 'vite.js')

// The production build names the view chunk `<prefix>-<hash>.js`. The response
// matcher and the build mutation both derive from this one prefix, so a view
// rename breaks the discovery (which fails loudly in beforeAll) before the
// matcher could ever stop matching silently.
const VIEW_CHUNK_PREFIX = 'GarageView'
const VIEW_CHUNK_URL_PATTERN = new RegExp(`\\/assets\\/${VIEW_CHUNK_PREFIX}-[^/]+\\.js$`)
const VIEW_CHUNK_NAME_PATTERN = new RegExp(`${VIEW_CHUNK_PREFIX}-[A-Za-z0-9_-]+\\.js`, 'g')

/**
 * The origin is exercised through three deployment states built from one
 * production build:
 *
 * - v1: the currently deployed build, healthy end to end.
 * - broken: a new deployment has replaced the assets, but the app shell the
 *   client holds (index.html plus entry chunk, byte-identical to v1 — like a
 *   cached iOS home-screen app) references a lazy view chunk the origin no
 *   longer serves. Loading that shell fails its lazy import.
 * - v2: the finished deployment, healthy end to end, with the renamed view
 *   chunk and a version marker on the document element.
 */
interface Deployment {
  rootDir: string
  v1Dir: string
  brokenDir: string
  v2Dir: string
  /** View chunk path that v1 references; absent from the broken origin. */
  staleChunkPath: string
  /** Renamed view chunk path that v2 serves. */
  freshChunkPath: string
}

let deployment: Deployment | undefined
interface PreviewProcess {
  child: ChildProcess
  exited: boolean
}

let preview: PreviewProcess | null = null
let previewLog = ''

function requireDeployment(): Deployment {
  if (deployment === undefined) throw new Error('Deployment not set up; did beforeAll fail?')
  return deployment
}

// The chunk URL as requested by the browser, from the preview origin.
function chunkUrl(path: string): string {
  return `${PREVIEW_URL}${path}`
}

// Counts the main frame's document loads (each a fresh fetch of the page)
// after the returned function is attached. The router's same-document history
// navigations (replaceState, no new document request) are not counted, so the
// count reflects exactly how many times the app's document was loaded: once
// per page load, and again on every automatic or manual reload.
function countDocumentLoads(page: Page): () => number {
  let count = 0
  page.on('request', (request) => {
    if (request.resourceType() === 'document' && request.frame() === page.mainFrame()) {
      count += 1
    }
  })
  return () => count
}

function runBuild(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [VITE_JS, 'build'], { cwd: FRONTEND_DIR, stdio: 'inherit' })
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`vite build exited with code ${code}`)),
    )
  })
}

async function buildDeploymentVersions(): Promise<Deployment> {
  const rootDir = mkdtempSync(join(tmpdir(), 'mileage-deployment-'))
  const v1Dir = join(rootDir, 'v1')
  const brokenDir = join(rootDir, 'broken')
  const v2Dir = join(rootDir, 'v2')
  cpSync(join(FRONTEND_DIR, 'dist'), v1Dir, { recursive: true })
  cpSync(v1Dir, brokenDir, { recursive: true })
  cpSync(v1Dir, v2Dir, { recursive: true })

  // The entry chunk lazy-loads the view chunk. Renaming the view chunk and
  // repointing the entry produces the new build; renaming it without
  // repointing reproduces the stale-shell state.
  const entryName = readFileSync(join(v2Dir, 'index.html'), 'utf8').match(
    /\/assets\/(index-[^"']+\.js)/,
  )?.[1]
  if (entryName === undefined) {
    throw new Error('Could not locate the entry chunk in the built index.html')
  }
  const entryPath = join(v2Dir, 'assets', entryName)
  let entry = readFileSync(entryPath, 'utf8')
  const chunkNames = [...new Set(entry.match(VIEW_CHUNK_NAME_PATTERN) ?? [])]
  if (chunkNames.length === 0) {
    throw new Error('Could not locate the view chunk in the built entry chunk')
  }
  let freshChunkPath = ''
  for (const chunkName of chunkNames) {
    const freshName = chunkName.replace(/\.js$/, '-v2.js')
    renameSync(join(v2Dir, 'assets', chunkName), join(v2Dir, 'assets', freshName))
    renameSync(join(brokenDir, 'assets', chunkName), join(brokenDir, 'assets', freshName))
    entry = entry.split(chunkName).join(freshName)
    freshChunkPath = `/assets/${freshName}`
  }
  writeFileSync(entryPath, entry)

  // A marker that the deployment switched versions. It lives on the document
  // element, not in document.title: the app rewrites the title from its i18n
  // catalog as soon as the entry chunk evaluates, so a title marker is only
  // observable for a few milliseconds and the assertion would race it.
  const indexHtmlPath = join(v2Dir, 'index.html')
  writeFileSync(
    indexHtmlPath,
    readFileSync(indexHtmlPath, 'utf8').replace('<html lang="en">', '<html lang="en" data-deployment="v2">'),
  )

  return {
    rootDir,
    v1Dir,
    brokenDir,
    v2Dir,
    staleChunkPath: `/assets/${chunkNames[0]}`,
    freshChunkPath,
  }
}

async function startPreview(outDir: string): Promise<void> {
  await stopPreview()
  previewLog = ''
  const child = spawn(
    process.execPath,
    [VITE_JS, 'preview', '--port', '8100', '--strictPort', '--host', '127.0.0.1', '--outDir', outDir],
    { cwd: FRONTEND_DIR, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  const entry: PreviewProcess = { child, exited: false }
  // Liveness is tracked through the exit event: in this Node build the
  // ChildProcess instance properties (exitCode, signalName) are never
  // maintained, so they cannot be relied on.
  entry.child.on('exit', () => {
    entry.exited = true
  })
  entry.child.stdout?.on('data', (chunk: Buffer) => {
    previewLog += chunk.toString()
  })
  entry.child.stderr?.on('data', (chunk: Buffer) => {
    previewLog += chunk.toString()
  })
  preview = entry
}

async function stopPreview(): Promise<void> {
  const entry = preview
  if (entry === null) return
  preview = null
  const { child } = entry
  child.stdout?.removeAllListeners()
  child.stderr?.removeAllListeners()
  if (entry.exited) return
  // Wait for the exit, forcing the kill if the process ignores SIGTERM.
  await new Promise<void>((resolve) => {
    let settled = false
    const settle = () => {
      if (!settled) {
        settled = true
        resolve()
      }
    }
    child.once('exit', settle)
    child.kill('SIGTERM')
    setTimeout(() => {
      child.kill('SIGKILL')
      settle()
    }, 5_000)
  })
}

// A preview that dies before becoming ready (for example because the port is
// already taken by a leaked process from an earlier interrupted run) would
// otherwise be invisible: a foreign server on the port answers the poll and
// the crash goes unreported. Only accept a response while our child is alive.
async function waitForHttp(url: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    let ready = false
    try {
      const response = await fetch(url)
      ready = response.status < 400
    } catch {
      // The server is not up yet.
    }
    if (preview !== null && preview.exited) {
      throw new Error(`Preview exited before it became ready.\nPreview log:\n${previewLog}`)
    }
    if (ready) return
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${url}.\nPreview log:\n${previewLog}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
}

// Fails immediately when something else already holds the preview port, so a
// leaked process from an earlier interrupted run is caught before it poisons
// the whole suite with 404s from a deleted directory.
async function assertPortFree(): Promise<void> {
  try {
    const response = await fetch(`${PREVIEW_URL}/`, { signal: AbortSignal.timeout(2_000) })
    await response.body?.cancel()
    throw new Error(
      `Port 8100 is already in use (HTTP ${response.status}); ` +
        'a previous preview process was not stopped. Free the port and re-run.',
    )
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Port 8100')) throw error
    // A connection failure means the port is free.
  }
}

test.describe('Deployment', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    // Building and preparing the deployment states can outlast the default
    // hook timeout on slow machines.
    test.setTimeout(180_000)
    await assertPortFree()
    await runBuild()
    deployment = await buildDeploymentVersions()
    await startPreview(deployment.v1Dir)
    await waitForHttp(`${PREVIEW_URL}/`)
  })

  test.afterAll(async () => {
    await stopPreview()
    if (deployment !== undefined) {
      rmSync(deployment.rootDir, { recursive: true, force: true })
    }
  })

  test('recovers a stale session to the deployed version', async ({ page, context }, testInfo) => {
    testInfo.setTimeout(90_000)
    const d = requireDeployment()

    // A real deployment replaces the build on the origin; disable the HTTP
    // cache so the browser always sees what the deployed origin serves.
    const cdp = await context.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })

    const chunkResponses = new Map<string, number>()
    page.on('response', (response) => {
      if (VIEW_CHUNK_URL_PATTERN.test(response.url())) {
        chunkResponses.set(response.url(), response.status())
      }
    })

    // The deployed v1 build is healthy end to end.
    await page.goto(PREVIEW_URL)
    await expect(page).toHaveTitle('Mileage')
    await expect(page.getByRole('heading', { name: 'Garage' })).toBeVisible()
    await expect.poll(() => chunkResponses.get(chunkUrl(d.staleChunkPath))).toBe(200)

    const documentLoads = countDocumentLoads(page)

    // A new deployment replaces the assets. The shell the client holds still
    // references a chunk the origin no longer serves.
    await startPreview(d.brokenDir)
    await waitForHttp(`${PREVIEW_URL}/`)

    // The app re-opens: a fresh document runs the stale shell (like a cached
    // iOS home-screen app). Its own lazy import fails against the deployed
    // origin. The app recovers with one automatic reload; because the origin
    // still serves the stale shell, the reload fails the same way and the
    // recovery window bounds it to a single attempt plus a manual action.
    await page.goto(PREVIEW_URL, { waitUntil: 'domcontentloaded' })
    const fallback = page.locator('#app-recovery-fallback')
    await expect(fallback).toBeVisible({ timeout: 30_000 })
    await expect(fallback.locator('button')).toHaveText('Reload')
    await expect(page).toHaveTitle('Mileage')
    expect(chunkResponses.get(chunkUrl(d.staleChunkPath))).toBe(404)
    expect(documentLoads()).toBe(2)

    // The deployment finishes; the manual reload reaches the new version.
    await startPreview(d.v2Dir)
    await waitForHttp(`${PREVIEW_URL}/`)
    await fallback.locator('button').click()
    await expect(page.locator('html')).toHaveAttribute('data-deployment', 'v2', { timeout: 30_000 })
    await expect(page.getByRole('heading', { name: 'Garage' })).toBeVisible()
    await expect.poll(() => chunkResponses.get(chunkUrl(d.freshChunkPath))).toBe(200)
    await expect(page.locator('#app-recovery-fallback')).toHaveCount(0)
    expect(documentLoads()).toBe(3)
  })

  test('reports API failures with the app error UI without reloading', async ({ page }) => {
    const d = requireDeployment()
    await startPreview(d.v2Dir)
    await waitForHttp(`${PREVIEW_URL}/`)

    await page.route('**/api/**', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'boom' }),
      }),
    )

    const documentLoads = countDocumentLoads(page)

    await page.goto(PREVIEW_URL)
    await expect(page.getByText('Could not load the garage')).toBeVisible()
    await expect(page.getByText('boom', { exact: true })).toBeVisible()

    // An API failure is not a stale-asset failure: no reload, no fallback.
    expect(documentLoads()).toBe(1)
    await expect(page.locator('#app-recovery-fallback')).toHaveCount(0)
  })
})
