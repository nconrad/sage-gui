import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { styled } from '@mui/material'
import { ViewTimelineOutlined } from '@mui/icons-material'
import { Button, ButtonGroup } from '@mui/material'
import { subDays, subYears } from 'date-fns'

import { Card } from '/components/layout/Layout'
import Timeline from '/components/viz/Timeline'
import TimelineSkeleton from '/components/viz/TimelineSkeleton'
import DataOptions from '/components/input/DataOptions'
import { fetchRollup } from '/apps/sage/data/rollupUtils'
import { processTimelineData } from './dashboardUtils'
import { colorDensity } from '../data/Data'
import { type Options } from '/apps/sage/data/Data'

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
    const timelineData = timelineTab === 'nodes' ? timelineByNode : timelineByApp
    const hasData = timelineData && Object.keys(timelineData).length > 0

    return (
      <>
        <TimelineContainer>
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
          <FilterLabel>Filter by:</FilterLabel>
          <ButtonGroup size="small" variant="outlined">
            <Button
              onClick={() => onProjectFilterChange('all')}
              variant={projectFilter === 'all' ? 'contained' : 'outlined'}
            >
              All ({allNodesCount})
            </Button>
            <Button
              onClick={() => onProjectFilterChange('SAGE')}
              variant={projectFilter === 'SAGE' ? 'contained' : 'outlined'}
            >
              Sage ({sageNodesCount})
            </Button>
            <Button
              onClick={() => onProjectFilterChange('SGT')}
              variant={projectFilter === 'SGT' ? 'contained' : 'outlined'}
            >
              SGT ({sgtNodesCount})
            </Button>
          </ButtonGroup>
        </FilterGroup>

        <FilterGroup>
          <ButtonGroup size="small" variant="outlined">
            <Button
              onClick={() => setTimelineTab('nodes')}
              variant={timelineTab === 'nodes' ? 'contained' : 'outlined'}
            >
              My Node Data
            </Button>
            <Button
              onClick={() => setTimelineTab('apps')}
              variant={timelineTab === 'apps' ? 'contained' : 'outlined'}
            >
              My App Data
            </Button>
          </ButtonGroup>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Show data for:</FilterLabel>
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
        <TimelineHeader>
          <DataOptions
            onChange={handleOptionChange}
            opts={opts}
            quickRanges={['-1y', '-90d', '-30d', '-7d', '-2d']}
            showAll
            condensed
            aggregation
          />
        </TimelineHeader>
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
`

const TimelineHeader = styled('div')`
  padding: 1rem 1.5rem 0.5rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 1rem;

  @media (max-width: 900px) {
    justify-content: flex-start;
    flex-wrap: wrap;
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
