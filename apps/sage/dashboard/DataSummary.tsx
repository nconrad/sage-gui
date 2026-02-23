import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { styled } from '@mui/material'
import { Sort, ViewTimelineOutlined } from '@mui/icons-material'
import { Button, ButtonGroup, Autocomplete, TextField, Chip, IconButton, Tooltip } from '@mui/material'
import { SortByAlpha, Tag } from '@mui/icons-material'
import { subDays, subYears } from 'date-fns'

import { Card } from '/components/layout/Layout'
import Timeline from '/components/viz/Timeline'
import TimelineSkeleton from '/components/viz/TimelineSkeleton'
import { getRangeTitle } from '/components/utils/units'
import DataOptions from '/components/input/DataOptions'
import { fetchRollup } from '/apps/sage/data/rollupUtils'
import { processTimelineData } from './dashboardUtils'
import { colorDensity } from '../data/Data'
import { type Options } from '/apps/sage/data/Data'
import SageProjectFilter from './SageProjectFilter'

import * as BK from '/components/apis/beekeeper'
import * as ES from '/components/apis/ses'


type DataSummaryProps = {
  allNodes: BK.Node[]
  allJobs: ES.Job[]
  projectFilter: 'all' | 'SAGE' | 'SGT'
  onProjectFilterChange: (value: 'all' | 'SAGE' | 'SGT') => void
  allNodesCount: number
  sageNodesCount: number
  sgtNodesCount: number
}

const TAIL_DAYS = '-7d'

const getStartTime = (str) =>
  str.includes('y')
    ? subYears(new Date(), str.replace(/-|y/g, ''))
    : subDays(new Date(), str.replace(/-|d/g, ''))


export default function DataSummary({
  allNodes,
  allJobs,
  projectFilter,
  onProjectFilterChange,
  allNodesCount,
  sageNodesCount,
  sgtNodesCount
}: DataSummaryProps) {
  const [timelineTab, setTimelineTab] = useState<'nodes' | 'apps'>('nodes')
  const [timelineFilter, setTimelineFilter] = useState<'jobs' | 'all'>('all')
  const [timelineByNode, setTimelineByNode] = useState(null)
  const [timelineByApp, setTimelineByApp] = useState(null)
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const [selectedApps, setSelectedApps] = useState<string[]>([])
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [sortAppsByCount, setSortAppsByCount] = useState(true)
  const [sortNodesByCount, setSortNodesByCount] = useState(true)

  const [opts, setOpts] = useState<Options>({
    display: 'nodes',
    colorType: 'density',
    viewType: 'timeline',
    versions: false,
    time: 'hourly',
    start: getStartTime(TAIL_DAYS),
    window: TAIL_DAYS
  })

  const handleOptionChange = (name, val) => {
    if (name === 'time') {
      setOpts(prev => ({...prev, time: val}))
      return
    }

    if (name === 'colorType') {
      setOpts(prev => ({...prev, colorType: val}))
      return
    }

    if (name === 'window') {
      if (!val) return

      const nextShowAll = val === 'showAll'
      setShowAll(nextShowAll)
      const start = getStartTime(nextShowAll ? '-20y' : val)

      setOpts(prev => ({
        ...prev,
        ...(val && {window: val, start}),
        ...(nextShowAll && {time: 'daily'})
      }))
      return
    }
  }

  // Fetch timeline data for user's nodes and apps
  useEffect(() => {
    if (!allNodes || allNodes.length === 0) return

    setLoadingTimeline(true)

    const start = opts.start

    // Determine which nodes to include based on filter
    let nodesToShow = allNodes
    if (timelineFilter === 'jobs' && allJobs && allJobs.length > 0) {
      // Extract unique VSNs from all jobs
      const jobVSNs = new Set<BK.VSN>()
      allJobs.forEach(job => {
        job.nodes.forEach(vsn => jobVSNs.add(vsn))
      })
      nodesToShow = allNodes.filter(node => jobVSNs.has(node.vsn))
    }

    // Fetch activity data for filtered nodes
    fetchRollup({
      start,
      time: opts.time,
      versions: false
    })
      .then(({data}) => {
        const { timelineByNode, timelineByApp } = processTimelineData(data, nodesToShow)

        // If filtering by jobs, also filter apps
        if (timelineFilter === 'jobs' && allJobs && allJobs.length > 0) {
          // Extract app names from jobs
          const jobApps = new Set<string>()
          allJobs.forEach(job => {
            job.plugins.forEach(plugin => {
              // Extract app name from plugin image
              const imageParts = plugin.plugin_spec.image.split('/')
              const appName = imageParts[imageParts.length - 1].split(':')[0]
              jobApps.add(appName)
            })
          })

          // Filter apps to only those used in jobs
          const filteredByApp = {}
          Object.keys(timelineByApp).forEach(key => {
            const appName = key.split('/').pop().split(':')[0]
            if (jobApps.has(appName)) {
              filteredByApp[key] = timelineByApp[key]
            }
          })
          setTimelineByApp(filteredByApp)
        } else {
          setTimelineByApp(timelineByApp)
        }

        setTimelineByNode(timelineByNode)
      })
      .catch(err => {
        console.error('Failed to fetch timeline data:', err)
        setTimelineByNode({})
        setTimelineByApp({})
      })
      .finally(() => setLoadingTimeline(false))

  }, [allNodes, allJobs, timelineFilter, opts.start, opts.time])

  const TIMELINE_LABEL_WIDTH = 40

  // Don't render if no nodes after loading
  if (allNodes && allNodes.length === 0) {
    return null
  }

  const renderContent = () => {
    // Show loading skeleton if data hasn't loaded yet
    const isLoading = !allNodes || loadingTimeline || !timelineByNode || !timelineByApp
    if (isLoading) {
      return <TimelineSkeleton includeHeader={false} />
    }

    let timelineData = timelineTab === 'nodes' ? timelineByNode : timelineByApp

    // Apply filters to timeline data
    if (timelineTab === 'nodes' && selectedApps.length > 0) {
      // Filter nodes by selected apps
      const filtered = {}
      Object.entries(timelineData || {}).forEach(([node, data]) => {
        const filteredData = (data as any[]).map(item => {
          const apps = item.meta?.apps || {}
          const filteredApps = {}
          let totalValue = 0

          Object.entries(apps).forEach(([app, count]) => {
            if (selectedApps.includes(app)) {
              filteredApps[app] = count
              totalValue += count as number
            }
          })

          return totalValue > 0 ? {
            ...item,
            value: totalValue,
            meta: { ...item.meta, apps: filteredApps }
          } : null
        }).filter(Boolean)

        if (filteredData.length > 0) {
          filtered[node] = filteredData
        }
      })
      timelineData = filtered
    } else if (timelineTab === 'apps' && selectedNodes.length > 0) {
      // Filter apps by selected nodes
      const filtered = {}
      Object.entries(timelineData || {}).forEach(([app, data]) => {
        const filteredData = (data as any[]).map(item => {
          const nodes = item.meta?.nodes || {}
          const filteredNodes = {}
          let totalValue = 0

          Object.entries(nodes).forEach(([node, count]) => {
            if (selectedNodes.includes(node)) {
              filteredNodes[node] = count
              totalValue += count as number
            }
          })

          return totalValue > 0 ? {
            ...item,
            value: totalValue,
            meta: { ...item.meta, nodes: filteredNodes }
          } : null
        }).filter(Boolean)

        if (filteredData.length > 0) {
          filtered[app] = filteredData
        }
      })
      timelineData = filtered
    }

    const hasData = timelineData && Object.keys(timelineData).length > 0

    // Extract available apps from node timeline data with counts
    const appCounts = new Map<string, number>()
    if (timelineTab === 'nodes' && timelineByNode) {
      Object.values(timelineByNode).forEach((data: any) => {
        data.forEach(item => {
          Object.entries(item.meta?.apps || {}).forEach(([app, count]) => {
            appCounts.set(app, (appCounts.get(app) || 0) + (count as number))
          })
        })
      })
    }
    const availableApps = new Set<string>(appCounts.keys())

    // Sort apps by count or alphabetically
    const sortedApps = Array.from(appCounts.entries())
      .sort((a, b) => {
        if (sortAppsByCount) {
          return b[1] - a[1] // Sort by count descending
        }
        return a[0].localeCompare(b[0]) // Sort alphabetically
      })

    // Extract available nodes from app timeline data with counts
    const nodeCounts = new Map<string, number>()
    if (timelineTab === 'apps' && timelineByApp) {
      Object.values(timelineByApp).forEach((data: any) => {
        data.forEach(item => {
          Object.entries(item.meta?.nodes || {}).forEach(([node, count]) => {
            nodeCounts.set(node, (nodeCounts.get(node) || 0) + (count as number))
          })
        })
      })
    }
    const availableNodes = new Set<string>(nodeCounts.keys())

    // Sort nodes by count or alphabetically
    const sortedNodes = Array.from(nodeCounts.entries())
      .sort((a, b) => {
        if (sortNodesByCount) {
          return b[1] - a[1] // Sort by count descending
        }
        return a[0].localeCompare(b[0]) // Sort alphabetically
      })

    return (
      <>
        <TimelineContainer>
          <div>
            {timelineTab === 'nodes' && availableApps.size > 0 && (
              <FilterChipsContainer>
                <FilterLabel>Filter by:</FilterLabel>
                <Autocomplete
                  multiple
                  size="small"
                  options={sortedApps.map(([app]) => app)}
                  value={selectedApps}
                  onChange={(_, newValue) => setSelectedApps(newValue)}
                  limitTags={5}
                  getOptionLabel={(option) => option}
                  renderOption={(props, option) => {
                    const count = appCounts.get(option) || 0
                    return (
                      <li {...props} style={{ display: 'flex', justifyContent: 'space-between', ...props.style }}>
                        <span>{option}</span>
                        <span style={{ fontWeight: 600, color: '#999', marginLeft: '1rem' }}>
                          {count.toLocaleString()}
                        </span>
                      </li>
                    )
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Apps"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            <Tooltip title={sortAppsByCount ?
                              'Sorted by count (click for A-Z)' : 'Sorted A-Z (click for count)'}>
                              <IconButton
                                size="small"
                                onClick={() => setSortAppsByCount(!sortAppsByCount)}
                                sx={{ mr: 0.5 }}
                              >
                                {sortAppsByCount ? <Sort fontSize="small" /> : <SortByAlpha fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        label={option}
                        size="small"
                        {...getTagProps({ index })}
                        key={option}
                      />
                    ))
                  }
                  sx={{ flex: 1 }}
                />
              </FilterChipsContainer>
            )}
            {timelineTab === 'apps' && availableNodes.size > 0 && (
              <FilterChipsContainer>
                <FilterLabel>Filter by:</FilterLabel>
                <Autocomplete
                  multiple
                  size="small"
                  options={sortedNodes.map(([node]) => node)}
                  value={selectedNodes}
                  onChange={(_, newValue) => setSelectedNodes(newValue)}
                  limitTags={10}
                  getOptionLabel={(option) => option}
                  renderOption={(props, option) => {
                    const count = nodeCounts.get(option) || 0
                    return (
                      <li {...props} style={{ display: 'flex', justifyContent: 'space-between', ...props.style }}>
                        <span>{option}</span>
                        <span style={{ fontWeight: 600, color: '#999', marginLeft: '1rem' }}>
                          {count.toLocaleString()}
                        </span>
                      </li>
                    )
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Nodes"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            <Tooltip title={sortNodesByCount ?
                              'Sorted by count (click for A-Z)' : 'Sorted A-Z (click for count)'}>
                              <IconButton
                                size="small"
                                onClick={() => setSortNodesByCount(!sortNodesByCount)}
                                sx={{ mr: 0.5 }}
                              >
                                {sortNodesByCount ? <Sort fontSize="small" /> : <SortByAlpha fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        label={option}
                        size="small"
                        {...getTagProps({ index })}
                        key={option}
                      />
                    ))
                  }
                  sx={{ flex: 1 }}
                />
              </FilterChipsContainer>
            )}
          </div>
          <div className="timeline-title flex items-start gap">
            <h2>{getRangeTitle(opts.window)}</h2>
            <DataOptions
              onChange={handleOptionChange}
              opts={opts}
              quickRanges={['-1y', '-90d', '-30d', '-7d', '-2d']}
              showAll
              condensed
              aggregation
            />
          </div>


          {timelineTab === 'nodes' ? (
            <Timeline
              data={timelineData || {}}
              cellUnit={opts.time === 'daily' ? 'day' : 'hour'}
              limitRowCount={10}
              startTime={!showAll ? opts.start : null}
              colorCell={colorDensity}
              yFormat={(label) => <Link to={`/nodes/${label}`}>{label}</Link>}
              tooltip={(item) => {
                const date = new Date(item.timestamp)
                const apps = item.meta?.apps || {}
                const appBreakdown = Object.entries(apps)
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .map(([app, count]) => `${app}: ${(count as number).toLocaleString()}`)
                  .join('<br>')
                return `
                  <div style="margin-bottom: 5px; font-weight: bold;">
                    ${date.toDateString()} ${date.toLocaleTimeString([], {timeStyle: 'short'})}
                  </div>
                  <div style="margin-bottom: 8px;">
                    <strong>Total:</strong> ${item.value.toLocaleString()} records
                  </div>
                  <div style="font-size: 0.9em;">
                    <strong>Apps:</strong><br>
                    ${appBreakdown}
                  </div>`
              }}
              labelWidth={TIMELINE_LABEL_WIDTH}
            />
          ) : (
            <Timeline
              data={timelineData || {}}
              cellUnit={opts.time === 'daily' ? 'day' : 'hour'}
              labelWidth={180}
              limitRowCount={10}
              startTime={!showAll ? opts.start : null}
              colorCell={colorDensity}
              yFormat={(label) =>
                <Link to={`/apps?search=${label}`}>
                  {label.slice(label.lastIndexOf('/') + 1)}
                </Link>
              }
              tooltip={(item) => {
                const date = new Date(item.timestamp)
                const nodes = item.meta?.nodes || {}
                const nodeBreakdown = Object.entries(nodes)
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .map(([node, count]) => `${node}: ${(count as number).toLocaleString()}`)
                  .join('<br>')
                return `
                  <div style="margin-bottom: 5px; font-weight: bold;">
                    ${date.toDateString()} ${date.toLocaleTimeString([], {timeStyle: 'short'})}
                  </div>
                  <div style="margin-bottom: 8px;">
                    <strong>Total:</strong> ${item.value.toLocaleString()} records
                  </div>
                  <div style="font-size: 0.9em;">
                    <strong>Nodes:</strong><br>
                    ${nodeBreakdown}
                  </div>`
              }}
            />
          )}
        </TimelineContainer>

        {!hasData && (
          <EmptyState>
            <EmptyIcon><ViewTimelineOutlined /></EmptyIcon>
            <p>No recent activity in the last 7 days</p>
            <small>
              When apps run on your nodes, their activity will
              appear here about 15 minutes after the hour
            </small>
          </EmptyState>
        )}
      </>
    )
  }

  return (
    <WideSection>
      <FilterBar>
        <FilterGroup>
          {/* <FilterLabel>Filter by:</FilterLabel> */}
          <SageProjectFilter
            projectFilter={projectFilter}
            onProjectFilterChange={onProjectFilterChange}
            allNodesCount={allNodesCount}
            sageNodesCount={sageNodesCount}
            sgtNodesCount={sgtNodesCount}
          />
          <ButtonGroup size="small" variant="outlined">
            <Button
              onClick={() => {
                setTimelineTab('nodes')
                setSelectedApps([])
                setSelectedNodes([])
              }}
              variant={timelineTab === 'nodes' ? 'contained' : 'outlined'}
            >
              By Node
            </Button>
            <Button
              onClick={() => {
                setTimelineTab('apps')
                setSelectedApps([])
                setSelectedNodes([])
              }}
              variant={timelineTab === 'apps' ? 'contained' : 'outlined'}
            >
              By App
            </Button>
          </ButtonGroup>
        </FilterGroup>

        <FilterGroup>
          {/* <FilterLabel>Show data for:</FilterLabel> */}
          <ButtonGroup size="small" variant="outlined">
            <Button
              onClick={() => setTimelineFilter('jobs')}
              variant={timelineFilter === 'jobs' ? 'contained' : 'outlined'}
            >
              My Jobs Only
            </Button>
            <Button
              onClick={() => setTimelineFilter('all')}
              variant={timelineFilter === 'all' ? 'contained' : 'outlined'}
            >
              All Accessible Nodes
            </Button>
          </ButtonGroup>
        </FilterGroup>
      </FilterBar>

      <Card>
        {renderContent()}
      </Card>
    </WideSection>
  )
}


const WideSection = styled('div')`
  grid-column: 1 / -1;
  margin-bottom: 2rem;
`

const FilterBar = styled('div')`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
  padding: 1.25rem 1.5rem;
  background: ${({ theme }) => theme.palette.mode === 'dark' ? '#2a2a2a' : '#f8f9fa'};
  border: 1px solid ${({ theme }) => theme.palette.mode === 'dark' ? '#444' : '#e0e0e0'};
  border-radius: 12px 12px 0 0;
  border-bottom: 2px solid ${({ theme }) => theme.palette.primary.main};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  @media (max-width: 900px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
`



const FilterGroup = styled('div')`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`

const FilterLabel = styled('span')`
  font-weight: 600;
  color: ${({ theme }) => theme.palette.mode === 'dark' ? '#fff' : '#333'};
`

const TimelineContainer = styled('div')`
  overflow-x: auto;

  .timeline-title {
    float: left;
    h2 { margin: 0 1em 0 0;}
  }
`

const EmptyState = styled('div')`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.palette.text.secondary};

  p {
    margin: 1rem 0;
    font-size: 1.1em;
  }

  a {
    color: ${({ theme }) => theme.palette.primary.main};
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
`

const EmptyIcon = styled('div')`
  svg {
    font-size: 4em;
    opacity: 0.3;
  }
`

const FilterChipsContainer = styled('div')`
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: ${({ theme }) => theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5'};
  border-radius: 8px;
  .MuiInputBase-root {
    background: ${({ theme }) => theme.palette.mode === 'dark' ? '#2a2a2a' : '#fff'};
  }
`
