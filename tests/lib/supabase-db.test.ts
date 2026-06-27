import assert from 'node:assert/strict'
import { test } from 'node:test'
import { z } from 'zod'
import { loadDotEnv, requireEnv } from './env.ts'

loadDotEnv()

const zSmokePayload = z.object({
  testRunId: z.string().uuid(),
  purpose: z.literal('supabase-connect'),
  profile: z.object({
    targetCountry: z.string(),
    level: z.literal('undergraduate'),
    gapFlags: z.array(z.string()).min(1),
  }),
})

const zSmokeRow = z
  .object({
    id: z.string().uuid(),
    kind: z.literal('codex-live-smoke'),
    payload: zSmokePayload,
    created_at: z.string().optional(),
  })
  .passthrough()

test('live Supabase REST inserts and reads a typed smoke row', async () => {
  const supabaseUrl = requireEnv('SUPABASE_URL').replace(/\/$/, '')
  const anonKey = requireEnv('SUPABASE_ANON_KEY')
  const table = process.env.SUPABASE_SMOKE_TABLE ?? 'sopilot_smoke_tests'

  assert.match(
    table,
    /^[a-z_][a-z0-9_]*$/,
    'SUPABASE_SMOKE_TABLE must be a simple public table name.',
  )

  const row = zSmokeRow.parse({
    id: crypto.randomUUID(),
    kind: 'codex-live-smoke',
    payload: {
      testRunId: crypto.randomUUID(),
      purpose: 'supabase-connect',
      profile: {
        targetCountry: 'United States',
        level: 'undergraduate',
        gapFlags: ['Needs sharper personal contribution detail'],
      },
    },
  })

  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
  }

  const insertResponse = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  })

  assert.equal(
    insertResponse.ok,
    true,
    await formatSupabaseError('insert', insertResponse, table),
  )

  const insertedRows = z.array(zSmokeRow).min(1).parse(await insertResponse.json())
  assert.equal(insertedRows[0]?.id, row.id)

  const selectUrl = new URL(`${supabaseUrl}/rest/v1/${table}`)
  selectUrl.searchParams.set('select', 'id,kind,payload,created_at')
  selectUrl.searchParams.set('id', `eq.${row.id}`)

  const selectResponse = await fetch(selectUrl, { headers })

  assert.equal(
    selectResponse.ok,
    true,
    await formatSupabaseError('select', selectResponse, table),
  )

  const selectedRows = z.array(zSmokeRow).length(1).parse(await selectResponse.json())
  assert.deepEqual(selectedRows[0]?.payload, row.payload)
})

async function formatSupabaseError(
  operation: string,
  response: Response,
  table: string,
): Promise<string> {
  const text = await response.text()
  const hint =
    response.status === 401
      ? 'Check that SUPABASE_URL and SUPABASE_ANON_KEY belong to the same project.'
      : response.status === 404
        ? `Create public.${table} first; see docs/supabase-smoke-test.sql.`
        : 'Check table RLS policies for anon insert/select.'

  return `Supabase ${operation} failed (${response.status} ${response.statusText}) on ${table}. ${hint} Body: ${text.slice(0, 500)}`
}
