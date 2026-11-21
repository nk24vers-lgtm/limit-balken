import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Limit } from '../types'

const limits = atom({ plugin: 'limit-balken', key: 'limits' } as const, [] as Limit[])

const NAMES: Record<string, string> = { five_hour: '5 Std', seven_day: 'Woche' }
const WIDTH = 8

const LABEL_COLOR: Record<string, string> = { five_hour: 'cyan', seven_day: 'magenta' }
const STEPS = ['#22c55e', '#4ade80', '#a3e635', '#facc15', '#fbbf24', '#fb923c', '#f97316', '#ef4444']

// Ordnet die Namen der Limit-Fenster zu, auch wenn sie leicht anders heißen
function norm(kind: string): string | null {
  const k = kind.toLowerCase()
  if (k === 'five_hour' || k.includes('five') || k.includes('5h') || k.includes('5_hour') || (k.includes('hour') && !k.includes('seven'))) return 'five_hour'
  if (k === 'seven_day' || k.includes('seven') || k.includes('week') || k.includes('7d') || k.includes('7_day')) return 'seven_day'
  return null
}

function pick(list: { kind: string; percentUsed: number; resetsAt?: string }[]): Limit[] {
  const out: Limit[] = []
  for (const l of list) {
    const kind = norm(l.kind)
    if (!kind) continue
    const old = out.find(o => o.kind === kind)
    if (old) {
      if (l.percentUsed > old.percentUsed) Object.assign(old, { percentUsed: l.percentUsed, resetsAt: l.resetsAt })
    } else out.push({ kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt })
  }
  return out
}

// Ein Fenster, das schon zurückgesetzt wurde, zählt wieder ab 0
function fresh(l: Limit, now: number): Limit {
  if (l.resetsAt && Date.parse(l.resetsAt) <= now) return { kind: l.kind, percentUsed: 0 }
  return l
}

function filled(p: number): number {
  return Math.max(0, Math.min(WIDTH, Math.round((p / 100) * WIDTH)))
}

function color(p: number): string {
  return p >= 90 ? 'red' : p >= 70 ? 'yellow' : 'green'
}

function resetText(iso: string | undefined, kind: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (kind === 'five_hour') return ` (frei ${time})`
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  return ` (frei ${days[d.getDay()]} ${time})`
}

export const register: Register = on => {

  // Neue Werte mit den alten zusammenführen: ein Fenster, das in einer Antwort fehlt, bleibt stehen
  const merge = (old: Limit[], neu: Limit[]): Limit[] =>
    ['five_hour', 'seven_day'].map(k => neu.find(l => l.kind === k) ?? old.find(l => l.kind === k)).filter((l): l is Limit => !!l)

  on('session.start', async ($, e, next) => {
    const r = await next(e)
    try {
      const u = await $.session.usage()
      await update($, limits, old => merge(old ?? [], pick(u.rateLimits)))
    } catch {}
    return r
  })

  on('session.measure', async ($, e, next) => {
    await update($, limits, old => merge(old ?? [], pick(e.rateLimits)))
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    try {
      const u = await $.session.usage()
      await update($, limits, old => merge(old ?? [], pick(u.rateLimits)))
    } catch {}
    return r
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, limits)
    if (e.props.hasSurvey) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const now = await $.clock.now()
    const order = ['five_hour', 'seven_day']
    const shown = order.map(k => {
      const l = list.find(x => x.kind === k)
      return l ? fresh(l, now) : { kind: k, percentUsed: -1 }
    })

    if (shown.every(l => l.percentUsed < 0)) {
      return (
        <Box>
          <Text dimColor>Limits: noch keine Werte (kommen nach der ersten Antwort)</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="row" flexWrap="nowrap">
        {shown.map((l, i) => (
          <Box key={l.kind} flexDirection="row" flexShrink={i === 0 ? 0 : 1}>
            {i > 0 ? <Text dimColor>{'  ·  '}</Text> : null}
            <Text bold color={LABEL_COLOR[l.kind]}>{NAMES[l.kind]} </Text>
            {l.percentUsed < 0 ? <Text dimColor>{'░'.repeat(WIDTH)} –</Text> : null}
            {l.percentUsed < 0 ? null : Array.from({ length: WIDTH }, (_, k) =>
              k < filled(l.percentUsed)
                ? <Text key={`f${k}`} color={STEPS[Math.min(STEPS.length - 1, Math.floor((k * STEPS.length) / WIDTH))]}>█</Text>
                : <Text key={`e${k}`} dimColor>░</Text>
            )}
            {l.percentUsed < 0 ? null : <Text bold color={color(l.percentUsed)}> {Math.round(l.percentUsed)}%</Text>}
            {l.percentUsed < 0 ? null : <Text dimColor wrap="truncate">{resetText(l.resetsAt, l.kind)}</Text>}
          </Box>
        ))}
      </Box>
    )
  })
}
