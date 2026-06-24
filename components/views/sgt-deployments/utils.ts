import * as BK from '/components/apis/beekeeper'
import {
  DEFAULT_LABEL_FIELDS,
  DEFAULT_PHASE_FILTER,
  DEFAULT_SORT_OPTION,
  DEFAULT_STEP_SECONDS,
  LABEL_FIELD_OPTIONS,
  MAX_POINTS_PER_SERIES,
  PHASE_OPTIONS,
  PROMETHEUS_QUERY,
  PROMETHEUS_URL,
  SORT_OPTIONS,
  type LabelFieldId,
  type PhaseFilterOption,
  type PrometheusMatrixResult,
  type RowInfo,
  type SortDirection,
  type SortOption,
  type SortOptionId,
  type TimelineData,
  type TimelineEntry,
} from './types'

export function parseSortOption(value: string | null): SortOption {
  return SORT_OPTIONS.find((option) => option.id == value) || DEFAULT_SORT_OPTION
}

export function parseSortDirection(value: string | null): SortDirection {
  return value == 'desc' ? 'desc' : 'asc'
}

export function parsePhaseFilter(value: string | null): PhaseFilterOption {
  return PHASE_OPTIONS.find((option) => option == value) || DEFAULT_PHASE_FILTER
}

export function parseLabelFields(value: string | null): LabelFieldId[] {
  const next = (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is LabelFieldId => LABEL_FIELD_OPTIONS.some((option) => option.id == item))

  return next.length > 0 ? next : DEFAULT_LABEL_FIELDS
}

export function parseSelectedPartners(value: string | null): string[] {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function getRowLabel(rowInfo: RowInfo, fields: LabelFieldId[]): string {
  const labelParts = fields.map((field) => {
    if (field == 'site_id') return rowInfo.siteId
    if (field == 'phase') return rowInfo.phase
    if (field == 'partner') return rowInfo.partner
    return rowInfo.vsn
  }).filter(Boolean)

  return labelParts.join(' | ') || rowInfo.vsn
}

export function getLastHourState(entries: TimelineEntry[], endTime: Date): 'up' | 'down' {
  const lastHourStart = endTime.getTime() - (60 * 60 * 1000)

  return entries.some((entry) => {
    const entryStart = new Date(entry.timestamp).getTime()
    const entryEnd = entry.end ? new Date(entry.end).getTime() : endTime.getTime()
    return entryEnd > lastHourStart && entryStart < endTime.getTime() && entry.meta.state == 'down'
  })
    ? 'down'
    : 'up'
}

export function getLastHourDowntimeMs(entries: TimelineEntry[], endTime: Date): number {
  const lastHourStart = endTime.getTime() - (60 * 60 * 1000)

  return entries.reduce((downtimeMs, entry) => {
    if (entry.meta.state != 'down') return downtimeMs

    const entryStart = new Date(entry.timestamp).getTime()
    const entryEnd = entry.end ? new Date(entry.end).getTime() : endTime.getTime()
    const overlapStart = Math.max(entryStart, lastHourStart)
    const overlapEnd = Math.min(entryEnd, endTime.getTime())

    if (overlapEnd <= overlapStart) return downtimeMs

    return downtimeMs + (overlapEnd - overlapStart)
  }, 0)
}

export function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}

export function toStatusIntervals(values: [number, string][], stepSeconds: number) {
  if (!values.length) return []

  const intervals: Array<{ start: number, end: number, value: number }> = []

  let runStart = values[0][0]
  let runValue = Number(values[0][1]) > 0 ? 1 : 0
  let prevTimestamp = values[0][0]

  for (let i = 1; i < values.length; i++) {
    const [timestamp, rawValue] = values[i]
    const numeric = Number(rawValue) > 0 ? 1 : 0

    if (numeric != runValue) {
      intervals.push({
        start: runStart,
        end: prevTimestamp + stepSeconds,
        value: runValue
      })

      runStart = timestamp
      runValue = numeric
    }

    prevTimestamp = timestamp
  }

  intervals.push({
    start: runStart,
    end: prevTimestamp + stepSeconds,
    value: runValue
  })

  return intervals
}

export function getQueryStepSeconds(start: Date, end: Date): number {
  const rangeSeconds = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 1000))
  const minStepForLimit = Math.ceil(rangeSeconds / MAX_POINTS_PER_SERIES)
  return Math.max(DEFAULT_STEP_SECONDS, minStepForLimit)
}

export function getPrometheusURL(start: Date, end: Date, stepSeconds: number): string {
  const params = new URLSearchParams({
    query: PROMETHEUS_QUERY,
    start: String(Math.floor(start.getTime() / 1000)),
    end: String(Math.floor(end.getTime() / 1000)),
    step: `${stepSeconds}s`
  })

  return `${PROMETHEUS_URL}?${params.toString()}`
}

export function formatDuration(start: Date, end: Date | null): string {
  const endTs = end ? end.getTime() : Date.now()
  const diffMs = Math.max(0, endTs - start.getTime())
  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (days > 0 || hours > 0) parts.push(`${hours}h`)
  if (days > 0 || hours > 0 || minutes > 0) parts.push(`${minutes}m`)
  parts.push(`${seconds}s`)
  return parts.join(' ')
}

type TimelineRowComparatorContext = {
  rowInfoByKey: Record<string, RowInfo>
  displayLabelByKey: Record<string, string>
  deployedNodeOrder: Map<string, number>
  endTime: Date
  sortById: SortOptionId
  sortDirection: SortDirection
  statusMap: Record<string, { status?: string }>
}

export function createTimelineRowComparator(ctx: TimelineRowComparatorContext) {
  const { rowInfoByKey, displayLabelByKey, deployedNodeOrder, endTime, sortById, sortDirection, statusMap } = ctx
  const directionFactor = sortDirection == 'desc' ? -1 : 1

  return ([rowKeyA, entriesA]: [string, TimelineEntry[]], [rowKeyB, entriesB]: [string, TimelineEntry[]]): number => {
    const rowA = rowInfoByKey[rowKeyA] || { vsn: '', siteId: '', phase: 'Deployed' as BK.Phase, partner: '' }
    const rowB = rowInfoByKey[rowKeyB] || { vsn: '', siteId: '', phase: 'Deployed' as BK.Phase, partner: '' }
    const labelA = displayLabelByKey[rowKeyA] || rowKeyA
    const labelB = displayLabelByKey[rowKeyB] || rowKeyB

    if (sortById == 'none') {
      return (deployedNodeOrder.get(rowKeyA) ?? Number.MAX_SAFE_INTEGER) -
        (deployedNodeOrder.get(rowKeyB) ?? Number.MAX_SAFE_INTEGER)
    }

    if (sortById == 'up_down') {
      const stateA = getLastHourState(entriesA, endTime)
      const stateB = getLastHourState(entriesB, endTime)

      if (stateA != stateB) {
        return (stateA == 'down' ? -1 : 1) * directionFactor
      }

      const downtimeA = getLastHourDowntimeMs(entriesA, endTime)
      const downtimeB = getLastHourDowntimeMs(entriesB, endTime)

      if (downtimeA != downtimeB) {
        return (downtimeB - downtimeA) * directionFactor
      }

      return compareStrings(labelA, labelB) * directionFactor
    }

    if (sortById == 'beehive_status') {
      const statusA = statusMap[rowKeyA]?.status || 'not reporting'
      const statusB = statusMap[rowKeyB]?.status || 'not reporting'

      const rank = (phase: BK.Phase, status: string) => {
        if (phase == 'Deployed' && status == 'reporting') return 3
        if ((phase == 'Awaiting Deployment' || phase == 'Shipment Pending') && status == 'reporting') return 2
        if (phase == 'Maintenance') return 1
        return 0
      }

      const rankA = rank(rowA.phase, statusA)
      const rankB = rank(rowB.phase, statusB)

      if (rankA != rankB) {
        return (rankA - rankB) * directionFactor
      }

      const byStatus = compareStrings(statusA, statusB)
      if (byStatus != 0) return byStatus * directionFactor

      return compareStrings(labelA, labelB) * directionFactor
    }

    if (sortById == 'site_id') {
      const bySiteId = compareStrings(rowA.siteId, rowB.siteId)
      if (bySiteId != 0) return bySiteId * directionFactor
      return compareStrings(rowA.vsn, rowB.vsn) * directionFactor
    }

    if (sortById == 'phase') {
      const byPhase = compareStrings(rowA.phase, rowB.phase)
      if (byPhase != 0) return byPhase * directionFactor
      return compareStrings(rowA.vsn, rowB.vsn) * directionFactor
    }

    if (sortById == 'partner') {
      const byPartner = compareStrings(rowA.partner, rowB.partner)
      if (byPartner != 0) return byPartner * directionFactor
      return compareStrings(rowA.vsn, rowB.vsn) * directionFactor
    }

    return compareStrings(rowA.vsn, rowB.vsn) * directionFactor
  }
}

export function toTimelineData(
  deployedNodes: BK.Node[],
  series: PrometheusMatrixResult[],
  stepSeconds: number
): TimelineData {
  const deployedVSNs = new Set(deployedNodes.map((node) => node.vsn))
  const partnerByVSN = new Map(deployedNodes.map((node) => [node.vsn, node.partner]))

  return series.reduce<TimelineData>((acc, item) => {
    const sageName = item.metric.sage_name
    const vsn = sageName?.replace(/^node-/, '')

    if (!vsn || !deployedVSNs.has(vsn as BK.VSN)) {
      return acc
    }

    const rowKey = vsn

    acc[rowKey] = toStatusIntervals(item.values, stepSeconds).map((interval) => {
      const numericValue = interval.value
      return {
        timestamp: new Date(interval.start * 1000).toISOString(),
        name: rowKey,
        end: new Date(interval.end * 1000).toISOString(),
        value: numericValue,
        meta: {
          state: numericValue > 0 ? 'up' : 'down',
          instance: item.metric.instance,
          partner: partnerByVSN.get(vsn as BK.VSN) || ''
        }
      }
    })

    return acc
  }, {})
}
