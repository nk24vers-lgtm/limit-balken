import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Limit } from '../types'

const limits = atom({ plugin: 'limit-balken', key: 'limits' } as const, [] as Limit[])

const NAMES: Record<string, string> = { five_hour: '5 Std', seven_day: 'Woche' }
const WIDTH = 8

const LABEL_COLOR: Record<string, string> = { five_hour: 'cyan', seven_day: 'magenta' }
const STEPS = ['#22c55e', '#4ade80', '#a3e635', '#facc15', '#fbbf24', '#fb923c', '#f97316', '#ef4444']

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

  on('session.start', async ($, e, next) => {
    const r = await next(e)
    try {
      const u = await $.session.usage()
      await update($, limits, () => u.rateLimits.filter(l => l.kind in NAMES).map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt })))
    } catch {}
    return r
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) {
      await update($, limits, () => e.rateLimits.filter(l => l.kind in NAMES).map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt })))
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, limits)
    if (e.props.hasSurvey) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const order = ['five_hour', 'seven_day']
    const shown = order.map(k => list.find(l => l.kind === k)).filter((l): l is Limit => !!l)

    if (!shown.length) {
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
            {Array.from({ length: WIDTH }, (_, k) =>
              k < filled(l.percentUsed)
                ? <Text key={`f${k}`} color={STEPS[Math.min(STEPS.length - 1, Math.floor((k * STEPS.length) / WIDTH))]}>█</Text>
                : <Text key={`e${k}`} dimColor>░</Text>
            )}
            <Text bold color={color(l.percentUsed)}> {Math.round(l.percentUsed)}%</Text>
            <Text dimColor wrap="truncate">{resetText(l.resetsAt, l.kind)}</Text>
          </Box>
        ))}
      </Box>
    )
  })
}
