import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Button from '@mui/material/Button'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded'
import HelpOutlineRounded from '@mui/icons-material/HelpOutlineRounded'
import { subDays } from 'date-fns'
import { useSearchParams } from 'react-router-dom'

import type * as BK from '/components/apis/beekeeper'
import config from '/config'
import FilterMenu from '/components/FilterMenu'
import TableSearch from '/components/table/TableSearch'
import TimelineChart, { color, type TimelineProps } from '/components/viz/Timeline'
import { UndoRounded } from '@mui/icons-material'

import NodeContextMenu from './NodeContextMenu'
import { NodeLabelTrigger, renderRowLabel } from './NodeLabelTrigger'
import SortCarets from './SortCarets'
import SortStrip from './SortStrip'
import {
  DEFAULT_DAYS,
  DEFAULT_LABEL_FIELDS,
  DEFAULT_PHASE_FILTER,
  DEFAULT_SORT_DIRECTION,
  DEFAULT_SORT_OPTION,
  DEFAULT_STEP_SECONDS,
  LABEL_FIELD_OPTIONS,
  PHASE_OPTIONS,
  SORT_OPTIONS,
  TIMELINE_CELL_HEIGHT_PX,
  type FilterOption,
  type LabelFieldId,
  type LabelFieldOption,
  type PhaseFilterOption,
  type PrometheusResponse,
  type RowInfo,
  type SortDirection,
  type SortOption,
  type SortOptionId,
  type TimelineData,
} from './types'
import {
  createTimelineRowComparator,
  formatDuration,
  getLastHourState,
  getPrometheusURL,
  getQueryStepSeconds,
  getRowLabel,
  parseLabelFields,
  parsePhaseFilter,
  parseSelectedPartners,
  parseSortDirection,
  parseSortOption,
  toTimelineData,
} from './utils'
import { Divider } from '@mui/material'
import { statusWithPhase } from '../nodes/nodeFormatters'

type TimelineCellClickItem = Parameters<NonNullable<TimelineProps['onCellClick']>>[0]
type TimelineCellClickEvent = Parameters<NonNullable<TimelineProps['onCellClick']>>[1]

type Props = {
  sgtNodes: BK.Node[] | null
  initialDefaultPhase?: PhaseFilterOption
  initialDefaultLabels?: LabelFieldId[]
  phaseControlsStart?: ReactNode
  onVisibleNodesChange?: (nodes: BK.Node[]) => void
}

export default function SGTDeployments({
  sgtNodes,
  initialDefaultPhase = DEFAULT_PHASE_FILTER,
  initialDefaultLabels = DEFAULT_LABEL_FIELDS,
  phaseControlsStart,
  onVisibleNodesChange,
}: Props) {
  const [params, setParams] = useSearchParams()
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null)
  const [selectedPartners, setSelectedPartners] = useState<string[]>(
    () => parseSelectedPartners(params.get('partners'))
  )
  const [selectedPhase, setSelectedPhase] = useState<PhaseFilterOption>(() => {
    const phaseParam = params.get('phase')
    return phaseParam ? parsePhaseFilter(phaseParam) : initialDefaultPhase
  })
  const [labelFields, setLabelFields] = useState<LabelFieldId[]>(() => {
    const labelsParam = params.get('labels')
    return labelsParam ? parseLabelFields(labelsParam) : initialDefaultLabels
  })
  const [query, setQuery] = useState<string>(() => params.get('query') || '')
  const [sortBy, setSortBy] = useState<SortOption>(() => parseSortOption(params.get('sort')))
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => parseSortDirection(params.get('sort_dir')))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [queryStepSeconds, setQueryStepSeconds] = useState<number>(DEFAULT_STEP_SECONDS)
  const [menuRowKey, setMenuRowKey] = useState<string | null>(null)
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null)
  const [menuAnchorPosition, setMenuAnchorPosition] = useState<{ top: number, left: number } | null>(null)
  const filteredTimelineDataRef = useRef<TimelineData | null>(null)
  const filteredTimelineDataSignatureRef = useRef<string>('')

  const startTime = useMemo(() => subDays(new Date(), DEFAULT_DAYS), [])
  const endTime = useMemo(() => new Date(), [])

  // Keep timeline fetches tied to deployment membership, not status churn from polling.
  const timelineFetchSignature = useMemo(() => {
    if (!sgtNodes || sgtNodes.length == 0) return ''

    return sgtNodes
      .map((node) => `${node.vsn}|${node.partner || ''}`)
      .sort()
      .join(',')
  }, [sgtNodes])

  const timelineFetchNodesRef = useRef<BK.Node[] | null>(null)
  const timelineFetchSignatureRef = useRef<string>('')
  const lastPrometheusFetchSignatureRef = useRef<string>('')
  const hasTimelineDataRef = useRef(false)

  if (timelineFetchSignature != timelineFetchSignatureRef.current) {
    timelineFetchSignatureRef.current = timelineFetchSignature
    timelineFetchNodesRef.current = sgtNodes
  }

  useEffect(() => {
    hasTimelineDataRef.current = !!timelineData
  }, [timelineData])

  useEffect(() => {
    const phaseParam = params.get('phase')
    const nextPhase = phaseParam ? parsePhaseFilter(phaseParam) : initialDefaultPhase
    const nextPartners = parseSelectedPartners(params.get('partners'))
    const labelsParam = params.get('labels')
    const nextLabelFields = labelsParam ? parseLabelFields(labelsParam) : initialDefaultLabels
    const nextQuery = params.get('query') || ''
    const nextSort = parseSortOption(params.get('sort'))
    const nextSortDirection = parseSortDirection(params.get('sort_dir'))

    setSelectedPhase((current) => current == nextPhase ? current : nextPhase)
    setSelectedPartners((current) => current.join(',') == nextPartners.join(',') ? current : nextPartners)
    setLabelFields((current) => current.join(',') == nextLabelFields.join(',') ? current : nextLabelFields)
    setQuery((current) => current == nextQuery ? current : nextQuery)
    setSortBy((current) => current.id == nextSort.id ? current : nextSort)
    setSortDirection((current) => current == nextSortDirection ? current : nextSortDirection)
  }, [initialDefaultLabels, initialDefaultPhase, params])

  useEffect(() => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)

      if (selectedPhase != initialDefaultPhase) next.set('phase', selectedPhase)
      else next.delete('phase')

      if (selectedPartners.length > 0) next.set('partners', selectedPartners.join(','))
      else next.delete('partners')

      if (labelFields.join(',') != initialDefaultLabels.join(',')) next.set('labels', labelFields.join(','))
      else next.delete('labels')

      if (query.trim().length > 0) next.set('query', query.trim())
      else next.delete('query')

      if (sortBy.id != DEFAULT_SORT_OPTION.id) next.set('sort', sortBy.id)
      else next.delete('sort')

      if (sortBy.id != 'none' && sortDirection != DEFAULT_SORT_DIRECTION) next.set('sort_dir', sortDirection)
      else next.delete('sort_dir')

      return next.toString() == prev.toString() ? prev : next
    })
  }, [
    initialDefaultLabels,
    initialDefaultPhase,
    labelFields,
    query,
    selectedPartners,
    selectedPhase,
    setParams,
    sortBy.id,
    sortDirection,
  ])

  useEffect(() => {
    if (!sgtNodes) {
      if (!hasTimelineDataRef.current) {
        setLoading(true)
      }
      return
    }

    if (sgtNodes.length == 0) {
      setTimelineData(null)
      setLoading(false)
      return
    }

    if (!timelineFetchSignature) {
      setTimelineData(null)
      lastPrometheusFetchSignatureRef.current = ''
      setLoading(false)
      return
    }

    // Beehive status can poll frequently; only refresh Prometheus when membership changes.
    if (timelineFetchSignature == lastPrometheusFetchSignatureRef.current) {
      return
    }

    const nodesForTimeline = timelineFetchNodesRef.current
    if (!nodesForTimeline || nodesForTimeline.length == 0) return

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const stepSeconds = getQueryStepSeconds(startTime, endTime)

        const response = await fetch(getPrometheusURL(startTime, endTime, stepSeconds))
        const payload = await response.json() as PrometheusResponse

        if (!response.ok || payload.status != 'success' || !payload.data) {
          throw new Error(payload.error || 'Failed to load Prometheus uptime data')
        }

        const nextData = toTimelineData(nodesForTimeline, payload.data.result, stepSeconds)

        if (!cancelled) {
          setQueryStepSeconds(stepSeconds)
          setTimelineData(nextData)
          lastPrometheusFetchSignatureRef.current = timelineFetchSignature
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load SGT deployment data')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [endTime, sgtNodes, startTime, timelineFetchSignature])

  const phaseNodes = useMemo(() => {
    if (!sgtNodes) return []
    if (selectedPhase == 'All') return sgtNodes

    return sgtNodes.filter((node) => node.phase == selectedPhase)
  }, [selectedPhase, sgtNodes])

  const partnerOptions = useMemo(() => {
    return [...new Set(phaseNodes.map((node) => node.partner).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
      .map((partner) => ({ id: partner, label: partner })) as FilterOption[]
  }, [phaseNodes])

  const handlePhaseChange = (_event: ReactMouseEvent<HTMLElement>, nextPhase: PhaseFilterOption | null) => {
    if (!nextPhase) return

    setSelectedPhase(nextPhase)
    setSelectedPartners([])
  }

  const handlePartnerFilterChange = (items: (string | FilterOption)[]) => {
    const next = items
      .map((item) => typeof item == 'string' ? item : item.id)
      .filter(Boolean)

    setSelectedPartners(next)
  }

  const handleLabelFieldsChange = (items: (string | LabelFieldOption)[]) => {
    const next = items
      .map((item) => typeof item == 'string' ? item : item.id)
      .filter(Boolean) as LabelFieldId[]

    setLabelFields(next.length > 0 ? next : initialDefaultLabels)
  }

  const handleSearch = ({ query: nextQuery }: { query: string }) => {
    setQuery(nextQuery)
  }

  const rowInfoByKey = useMemo(() => {
    return phaseNodes.reduce<Record<string, RowInfo>>((acc, node) => {
      acc[node.vsn] = {
        vsn: node.vsn,
        siteId: node.site_id || '',
        phase: node.phase,
        partner: node.partner || ''
      }
      return acc
    }, {})
  }, [phaseNodes])

  const rowStatusMetaByKey = useMemo(() => {
    return phaseNodes.reduce<Record<string, {
      status: string
      computes: BK.Node['computes']
      elapsedTimes?: unknown
    }>>((acc, node) => {
      const nodeWithStatus = node as BK.Node & {
        status?: string
        elapsedTimes?: unknown
      }

      acc[node.vsn] = {
        status: nodeWithStatus.status || 'not reporting',
        computes: node.computes,
        elapsedTimes: nodeWithStatus.elapsedTimes,
      }

      return acc
    }, {})
  }, [phaseNodes])

  const visibleLabelFields = useMemo(() => {
    if (selectedPhase == 'All') return labelFields
    return labelFields.filter((field) => field != 'phase')
  }, [labelFields, selectedPhase])

  const displayLabelByKey = useMemo(() => {
    return Object.entries(rowInfoByKey).reduce<Record<string, string>>((acc, [rowKey, rowInfo]) => {
      acc[rowKey] = getRowLabel(rowInfo, visibleLabelFields)
      return acc
    }, {})
  }, [rowInfoByKey, visibleLabelFields])

  const visibleNodes = useMemo(() => {
    const selected = new Set(selectedPartners)
    const normalizedQuery = query.trim().toLowerCase()

    return phaseNodes.filter((node) => {
      const rowKey = node.vsn
      const rowInfo = rowInfoByKey[rowKey]
      if (!rowInfo) return false

      if (selected.size > 0 && !selected.has(node.partner || '')) {
        return false
      }

      if (normalizedQuery.length == 0) return true

      const searchable = [
        rowKey,
        rowInfo.vsn,
        rowInfo.siteId,
        rowInfo.partner,
        rowInfo.phase,
        displayLabelByKey[rowKey] || '',
      ].join(' ').toLowerCase()

      return searchable.includes(normalizedQuery)
    })
  }, [displayLabelByKey, phaseNodes, query, rowInfoByKey, selectedPartners])

  useEffect(() => {
    onVisibleNodesChange?.(visibleNodes)
  }, [onVisibleNodesChange, visibleNodes])

  const deployedNodeOrder = useMemo(() => {
    return new Map<string, number>(phaseNodes.map((node, index) => [node.vsn, index]))
  }, [phaseNodes])

  const handleSortWithDirection = useCallback((sortId: SortOptionId, direction: SortDirection) => {
    const next = SORT_OPTIONS.find((option) => option.id == sortId)
    if (!next) return

    setSortBy(next)
    setSortDirection(direction)
  }, [])

  const statusSortControl = useCallback((
    sortId: Extract<SortOptionId, 'up_down' | 'beehive_status'>,
    label: string,
    helpText: string
  ) => {
    const isActive = sortBy.id == sortId

    return (
      <Box
        component="span"
        sx={{
          width: 20,
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.2,
            transform: 'rotate(-45deg)',
            transformOrigin: 'top center',
            position: 'relative',
            top: -6,
            left: 6,
            whiteSpace: 'nowrap',
            color: isActive ? 'primary.main' : 'text.secondary',
            fontSize: '0.74rem',
            fontWeight: isActive ? 700 : 600,
            mb: 0.4,
          }}
        >
          {label}
          <Tooltip title={helpText} placement="top">
            <HelpOutlineRounded fontSize="small"/>
          </Tooltip>
        </Box>

        <SortCarets
          label={label}
          isActive={isActive}
          sortDirection={sortDirection}
          onSort={(direction) => handleSortWithDirection(sortId, direction)}
          descendingTooltipPlacement="bottom"
        />
      </Box>
    )
  }, [handleSortWithDirection, sortBy.id, sortDirection])

  const handleClearControls = () => {
    setSelectedPhase(initialDefaultPhase)
    setSelectedPartners([])
    setLabelFields(initialDefaultLabels)
    setQuery('')
    setSortBy(DEFAULT_SORT_OPTION)
    setSortDirection(DEFAULT_SORT_DIRECTION)
  }

  const hasActiveControls =
    selectedPhase != initialDefaultPhase ||
    selectedPartners.length > 0 ||
    labelFields.join(',') != initialDefaultLabels.join(',') ||
    query.trim().length > 0 ||
    sortBy.id != DEFAULT_SORT_OPTION.id ||
    sortDirection != DEFAULT_SORT_DIRECTION

  const statusMetaForSort = sortBy.id == 'beehive_status' ? rowStatusMetaByKey : null

  const filteredTimelineData = useMemo(() => {
    if (!timelineData) return null

    const selected = new Set(selectedPartners)
    const normalizedQuery = query.trim().toLowerCase()
    const statusMap = (statusMetaForSort || {}) as Record<string, {status?: string}>

    const filteredEntries = Object.entries(timelineData)
      .filter(([rowKey, entries]) => {
        const rowInfo = rowInfoByKey[rowKey]
        if (!rowInfo) return false
        if (selected.size > 0) {
          const matchesPartner = selected.has(entries[0]?.meta?.partner || rowInfo.partner || '')
          if (!matchesPartner) return false
        }

        if (normalizedQuery.length == 0) return true

        const searchable = [
          rowKey,
          rowInfo.vsn,
          rowInfo.siteId,
          rowInfo.partner,
          rowInfo.phase,
          displayLabelByKey[rowKey] || '',
        ].join(' ').toLowerCase()

        return searchable.includes(normalizedQuery)
      })
      .sort(createTimelineRowComparator({
        rowInfoByKey,
        displayLabelByKey,
        deployedNodeOrder,
        endTime,
        sortById: sortBy.id,
        sortDirection,
        statusMap,
      }))

    const nextData = filteredEntries.reduce<TimelineData>((acc, [rowKey, entries]) => {
      acc[rowKey] = entries
      return acc
    }, {})

    const nextSignature = filteredEntries
      .map(([rowKey, entries]) => {
        const points = entries.map((entry) => {
          const state = entry.meta?.state || ''
          const partner = entry.meta?.partner || ''
          return `${entry.timestamp}|${entry.end || ''}|${entry.value}|${state}|${partner}`
        }).join(';')

        return `${rowKey}:${points}`
      })
      .join('||')

    if (
      filteredTimelineDataRef.current &&
      filteredTimelineDataSignatureRef.current == nextSignature
    ) {
      return filteredTimelineDataRef.current
    }

    filteredTimelineDataSignatureRef.current = nextSignature
    filteredTimelineDataRef.current = nextData

    return nextData
  }, [
    deployedNodeOrder,
    displayLabelByKey,
    endTime,
    query,
    rowInfoByKey,
    statusMetaForSort,
    selectedPartners,
    sortBy.id,
    sortDirection,
    timelineData
  ])

  const rowCount = filteredTimelineData ? Object.keys(filteredTimelineData).length : 0
  const timelineStateByRow = useMemo(() => {
    if (!filteredTimelineData) return {}

    return Object.entries(filteredTimelineData).reduce<Record<string, 'up' | 'down'>>((acc, [rowKey, entries]) => {
      acc[rowKey] = getLastHourState(entries, endTime)
      return acc
    }, {})
  }, [endTime, filteredTimelineData])

  const menuRowInfo = menuRowKey ? rowInfoByKey[menuRowKey] : null
  const menuLabel = menuRowInfo
    ? [menuRowInfo.partner, menuRowInfo.siteId, menuRowInfo.vsn].filter(Boolean).join(' | ') || null
    : (menuRowKey ? displayLabelByKey[menuRowKey] || menuRowKey : null)
  const portalNodeUrl = menuRowInfo && config.portal
    ? `${config.portal}/nodes/${menuRowInfo.vsn}`
    : undefined
  const grafanaUrl = menuRowInfo
    ? 'https://grafana.sagecontinuum.org/d/adk6gvg/node-status?' +
      'orgId=1&from=now-6h&to=now&timezone=browser&var-job=nodes' +
      `&var-sage_name=${encodeURIComponent(`node-${menuRowInfo.vsn}`)}`
    : ''

  const handleOpenMenuFromLabel = useCallback((rowKey: string, event: ReactMouseEvent<HTMLElement>) => {
    setMenuRowKey(rowKey)
    setMenuAnchorEl(event.currentTarget)
    setMenuAnchorPosition(null)
  }, [])

  const handleOpenMenuFromCell = useCallback((item: TimelineCellClickItem, evt?: TimelineCellClickEvent) => {
    const rowKey = item?.row as string
    if (!rowKey) return

    setMenuRowKey(rowKey)
    setMenuAnchorEl(null)
    if (evt) {
      setMenuAnchorPosition({ top: evt.clientY, left: evt.clientX })
    } else {
      setMenuAnchorPosition(null)
    }
  }, [])

  const handleCloseMenu = useCallback(() => {
    setMenuRowKey(null)
    setMenuAnchorEl(null)
    setMenuAnchorPosition(null)
  }, [])

  const rowEndHeader = useMemo(() => (
    <Box
      component="span"
      sx={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '20px 20px',
        columnGap: '0.35rem',
        justifyContent: 'start',
        alignItems: 'flex-end',
      }}
    >
      {statusSortControl('up_down', 'Online',
        'Whether a node is online and reporting to Sage monitoring tools')}
      {statusSortControl('beehive_status', 'Beehive',
        'Status of Node deployment and whether it is reporting to Sage Cloud Servers')}
    </Box>
  ), [statusSortControl])

  const rowEndFormat = useCallback((rowKey: string) => {
    const timelineState = timelineStateByRow[rowKey] || 'down'
    const statusMeta = rowStatusMetaByKey[rowKey]

    return (
      <Box
        component="span"
        sx={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '20px 20px',
          columnGap: '0.35rem',
          justifyContent: 'start',
          alignItems: 'center',
        }}
      >
        <Tooltip
          title={timelineState == 'up' ? 'online' : 'offline'}
          componentsProps={{tooltip: {sx: {background: '#000'}}}}
          placement="top"
        >
          <Box component="span" sx={{ display: 'inline-flex', justifyContent: 'center' }}>
            {timelineState == 'up' ? (
              <CheckCircleRounded className="success status-icon" />
            ) : (
              <ErrorOutlineRounded className="failed status-icon" />
            )}
          </Box>
        </Tooltip>
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {statusMeta ? statusWithPhase(statusMeta.status, {
            phase: rowInfoByKey[rowKey]?.phase || 'Deployed',
            computes: statusMeta.computes,
            elapsedTimes: statusMeta.elapsedTimes,
          }) : null}
        </Box>
      </Box>
    )
  }, [rowInfoByKey, rowStatusMetaByKey, timelineStateByRow])

  const yFormat = useCallback((rowKey: string) => {
    const info = rowInfoByKey[rowKey]
    if (!info) return rowKey

    const labelNode = renderRowLabel(info, visibleLabelFields)

    return (
      <NodeLabelTrigger
        label={labelNode}
        onOpen={(event) => handleOpenMenuFromLabel(rowKey, event)}
      />
    )
  }, [handleOpenMenuFromLabel, rowInfoByKey, visibleLabelFields])

  const colorCell = useCallback((value: number) => value > 0 ? color.green : color.red4, [])

  const tooltip: NonNullable<TimelineProps['tooltip']> = useCallback((item) => {
    const start = new Date(item.timestamp)
    const end = item.end ? new Date(item.end) : null
    const state = (item.meta?.state as string) || 'unknown'
    const onlineLabel = state == 'up' ? 'Online' : (state == 'down' ? 'Offline' : 'Unknown')
    const stateColor = state == 'up' ? '#06af00' : (state == 'down' ? '#890000' : '#999')
    const rowKey = item.row as string
    const rowLabel = displayLabelByKey[rowKey] || rowKey
    const duration = formatDuration(start, end)

    return (
      `<div style="font-weight:700;margin-bottom:6px;">${rowLabel}</div>` +
      `<div><b>Status:</b> <span style="color:${stateColor};font-weight:700;">${onlineLabel}</span></div>` +
      `<div><b>Duration:</b> ${duration}</div>` +
      `<div><b>Range:</b> ${start.toLocaleString()} - ${end ? end.toLocaleString() : 'ongoing'}</div>` +
      `${item.meta?.partner ? `<div><b>Partner:</b> ${item.meta.partner as string}</div>` : ''}`
    )
  }, [displayLabelByKey])

  return (
    <Box sx={{ mb: 2, mr: 6 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 2 }}>
        <TableSearch
          value={query}
          placeholder="Search"
          onSearch={handleSearch}
        />
        {phaseControlsStart}
        <ToggleButtonGroup
          exclusive
          size="small"
          value={selectedPhase}
          onChange={handlePhaseChange}
          aria-label="Filter SGT nodes by phase"
          color="primary"
          sx={(theme) => ({
            height: '36.5px',
            '& .MuiToggleButton-root': {
              height: '36.5px',
              color: 'primary.main',
              borderColor: 'primary.main',
              textTransform: 'none',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: theme.palette.action.hover,
              },
            },
            '& .MuiToggleButton-root.Mui-selected, & .MuiToggleButton-root.Mui-selected:hover': {
              color: 'primary.contrastText',
              backgroundColor: 'primary.main',
              borderColor: 'primary.main',
            },
          })}
        >
          {PHASE_OPTIONS.map((phase) => (
            <ToggleButton key={phase} value={phase} aria-label={phase}>
              {phase}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Box className="flex items-center" sx={{mb: 2, gap: 2}}>
        {partnerOptions.length > 1 && (
          <FilterMenu
            label="Partner"
            options={partnerOptions}
            value={selectedPartners}
            noSelectedSort
            onChange={handlePartnerFilterChange}
          />
        )}

        <FilterMenu
          label="Labels"
          options={LABEL_FIELD_OPTIONS}
          value={labelFields}
          noSelectedSort
          ButtonComponent={<Button size="medium">Labels<ExpandMoreIcon /></Button>}
          onChange={(items) => handleLabelFieldsChange(items as (string | LabelFieldOption)[])}
        />

        {hasActiveControls &&
          <>
            <Divider orientation="vertical" flexItem />
            <Button
              variant="outlined"
              onClick={handleClearControls}
              startIcon={<UndoRounded />}
              sx={{whiteSpace: 'nowrap'}}
            >
              Clear settings
            </Button>
            <Divider orientation="vertical" flexItem />
          </>
        }

        <Typography variant="body2" color="text.secondary">
          Showing online status for {selectedPhase == 'All' ? '' : `"${selectedPhase}" `} your SGT
          nodes over the last {DEFAULT_DAYS} days at {queryStepSeconds}s resolution.{' ' }
          {rowCount} SGT nodes{selectedPhase == 'All' ? '' : ` in ${selectedPhase}`}
          {partnerOptions.length > 0 && ` with partners: ${partnerOptions.map((o) => o.label).join(', ')}`}
        </Typography>
      </Box>


      {loading && rowCount == 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 4 }}>
          <CircularProgress size={20} />
          <Typography>Loading deployed SGT node uptime...</Typography>
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error">{error}</Alert>
      )}

      {!loading && !error && rowCount == 0 && (
        <Alert severity="info">
          No {selectedPhase == 'All' ? '' : `"${selectedPhase}" `} SGT nodes (with Prometheus uptime data) were found.
        </Alert>
      )}

      {!error && rowCount > 0 && (
        <>
          {labelFields.length > 0 && (
            <SortStrip
              labelFields={visibleLabelFields}
              activeSortId={sortBy.id}
              sortDirection={sortDirection}
              onSort={handleSortWithDirection}
              onRemoveLabel={(id) => setLabelFields((prev) => prev.filter((field) => field != id))}
            />
          )}
          <TimelineChart
            data={filteredTimelineData as TimelineData}
            startTime={startTime}
            endTime={endTime}
            cellHeightPx={TIMELINE_CELL_HEIGHT_PX}
            touchIntervals
            rowEndWidth={74}
            rowEndHeaderOffsetY={-80}
            rowEndHeader={rowEndHeader}
            rowEndFormat={rowEndFormat}
            yFormat={yFormat}
            onCellClick={handleOpenMenuFromCell}
            colorCell={colorCell}
            tooltip={tooltip}
          />

          <NodeContextMenu
            open={!!menuLabel && (!!menuAnchorEl || !!menuAnchorPosition)}
            label={menuLabel}
            anchorEl={menuAnchorEl}
            anchorPosition={menuAnchorPosition}
            portalNodeUrl={portalNodeUrl}
            grafanaUrl={grafanaUrl}
            onClose={handleCloseMenu}
          />
        </>
      )}
    </Box>
  )
}