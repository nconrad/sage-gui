import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams, NavLink } from 'react-router-dom'
import styled from 'styled-components'

import { Button, IconButton, Tooltip } from '@mui/material'
import { keyBy } from 'lodash'

import TimelineIcon from '@mui/icons-material/ViewTimelineOutlined'
import PublicIcon from '@mui/icons-material/Public'
import AddIcon from '@mui/icons-material/AddRounded'
import MyJobsIcon from '@mui/icons-material/Engineering'

import ErrorMsg from '/apps/sage/ErrorMsg'

import Map from '/components/Map'
import Table, { TableSkeleton } from '/components/table/Table'
import { queryData } from '/components/data/queryData'
import { relativeTime } from '/components/utils/units'
import { Tabs, Tab } from '/components/tabs/Tabs'
import { useProgress } from '/components/progress/ProgressProvider'
import { Card } from '/components/layout/Layout'

import JobTimeline from './JobTimeline'
import TimelineContainer from '/components/viz/TimelineContainer'
import JobDetails from './JobDetails'
import JobActions from './JobActions'
import StateFilters from './StateFilters'

import * as BK from '/components/apis/beekeeper'
import * as ES from '/components/apis/ses'
import Auth from '/components/auth/auth'

// todo(nc): support jobs view for multiple projects
// import settings from '/components/settings'
// const PROJECT = settings.project

const user = Auth.user



export const formatters = {
  apps: (objs) => <>
    {objs?.map((obj, i) => {
      const {name, plugin_spec} = obj
      const {image = ''} = plugin_spec || {}

      // todo(nc): ignore docker registry component for now?
      const app = image.replace('registry.sagecontinuum.org/', '').split(':')[0]

      const l = objs.length - 1
      return <span key={i}>
        <Link to={`/apps/app/${app}`}>
          {name}
        </Link>{i < l ? ', '  : ''}
      </span>
    })}
  </>,
  nodes: (vsns) => <>
    {vsns.map((vsn, i) => {
      const l = vsns.length - 1
      return <span key={vsn}>
        <Link to={`/node/${vsn}`}>
          {vsn}
        </Link>{i < l ? ', '  : ''}
      </span>
    })}
  </>
}

const jobCols = [{
  id: 'name',
  label: 'Name',
  format: (val, row) => {
    return <Link to={`/jobs/all-jobs?job=${row.id}`}>{val}</Link>
  }
}, {
  id: 'id',
  label: 'ID'
}, {
  id: 'status',
  label: 'Status',
  format: (_, obj) => {
    let status = obj.state.last_state || '-'
    status = status.toLowerCase()
    return <b className={status}>{status}</b>
  },
  width: '100px'
}, {
  id: 'user',
  label: 'User'
}, {
  id: 'nodes',
  label: 'Nodes',
  format: formatters.nodes
}, {
  id: 'nodeCount',
  label: 'Node count',
  hide: true,
  format: (_, obj) =>
    <b className="muted">{obj.nodes.length}</b>
}, {
  id: 'plugins',
  label: 'Apps',
  format: formatters.apps
}, {
  id: 'appCount',
  label: 'App count',
  hide: true,
  format: (_, obj) =>
    <b className="muted">{obj.apps.length}</b>
}, {
  id: 'last_submitted',
  label: 'Submitted',
  width: '100px',
  format: (val) => {
    return relativeTime(val) || '-'
  }
}, {
  id: 'last_updated',
  label: 'Updated',
  width: '100px',
  format: (val) => {
    return relativeTime(val) || '-'
  }
}, {
  id: 'last_completed',
  label: 'Completed',
  width: '100px',
  format: (val) => {
    return relativeTime(val) || '-'
  },
}]


// "my jobs" columns are the same as "all jobs", except job details link
const myJobCols = [{
  id: 'name',
  label: 'Name',
  format: (val, row) => {
    return <Link to={`/jobs/my-jobs?job=${row.id}`}>{val}</Link>
  }
},
...jobCols.slice(1)
]


type GeoData = {id: BK.VSN, vsn: string, lng: number, lat: number, status: string}[]

function jobsToGeos(
  jobs: ES.Job[],
  nodeDict: BK.NodeDict
) : GeoData {
  return [...new Set(jobs.flatMap(o => o.nodes))]
    .map(vsn => ({
      ...nodeDict[vsn],
      id: vsn,
      vsn,
      lng: Number(nodeDict[vsn]?.gps_lon),
      lat: Number(nodeDict[vsn]?.gps_lat),
      status: 'reporting'
    }))
}


type State = {
  jobs: ES.Job[]
  pluginEvents?: ES.EventsByNode
  pluginErrors?: ES.ErrorsByGoalID
  isFiltered?: boolean
  qJobs?: ES.Job[]
  qNodes?: string[]
  selectedNodes?: GeoData
  selectedJobs?: ES.Job[]
}

const initState = {
  jobs: [],
  pluginEvents: null,
  pluginErrors: null,
  isFiltered: false,
  qJobs: null,
  qNodes: [],
  selectedNodes: [],
  selectedJobs: []
}


const initCounts = {
  public: null,
  mine: null,
  queued: null,
  running: null,
  completed: null,
  failed: null,
  suspended: null,
  removed: null
} as const

export type Counts = {
  [name in keyof typeof initCounts]: number
}

function getCounts(jobs: ES.Job[], countMine: boolean) : Counts {
  const publicCount = jobs.length - filterByState(jobs, ['Suspended', 'Removed']).length
  const myJobs = jobs.filter(o => o.user == user)

  jobs = countMine ? myJobs : jobs

  return ({
    public: publicCount,
    mine: myJobs.length - filterByState(myJobs, ['Suspended', 'Removed']).length,
    queued: filterByState(jobs, ['Created', 'Submitted']).length,
    running: filterByState(jobs, ['Running']).length,
    completed: filterByState(jobs, ['Completed']).length,
    failed: filterByState(jobs, ['Failed']).length,
    suspended: filterByState(jobs, ['Suspended']).length,
    removed: filterByState(jobs, ['Removed']).length
  })
}


const filterByState = (jobs: ES.Job[], states: ES.State[]) : ES.Job[] =>
  jobs.filter(o => states.includes(o.state.last_state) )



export type Views = 'all-jobs' | 'my-jobs' | 'timeline'


export default function JobStatus() {
  const navigate = useNavigate()

  const {view = 'all-jobs'} = useParams() as {view: Views}

  const [params, setParams] = useSearchParams()
  const query = params.get('query') || '' // query string
  const nodes = params.get('nodes') || '' // vsns
  const job = params.get('job') || ''     // job id

  const {loading, setLoading} = useProgress()

  const [{
    jobs, pluginEvents, pluginErrors, isFiltered, qJobs, selectedNodes, selectedJobs
  }, setData] = useState<State>(initState)

  // filter for job's state
  const [jobState, setJobState] = useState<'Queued' | ES.State>()

  // additional meta
  const [nodeDict, setNodeDict] = useState<BK.NodeDict>(null)
  const [geo, setGeo] = useState<GeoData>()
  const [counts, setCounts] = useState<Counts>(initCounts)

  // we'll update table columns for each tab
  const [cols, setCols] = useState(jobCols)

  // hack for refreshing map/table
  const [updateMap, setUpdateMap] = useState<number>(0)
  const [updateTable, setUpdateTable] = useState<number>(0)

  // todo(nc): poll data; some optimization is needed
  // const [lastUpdate, setLastUpdate] = useState(null)

  const [error, setError] = useState()


  useEffect(() => {
    if (!jobs || !nodeDict) return

    let qJobs = queryData<ES.Job>(jobs, query)

    if (jobState == 'Queued') {
      qJobs = filterByState(jobs, ['Created', 'Submitted'])
    } else if (jobState) {
      qJobs = filterByState(jobs, [jobState])
    }

    // ignore removed jobs by default
    if (jobState !== 'Removed') {
      qJobs = qJobs.filter(o => o.state.last_state != 'Removed')
    }

    const qNodes = qJobs.flatMap(o => o.nodes)

    setData(prev => ({
      ...prev,
      isFiltered: query.length > 0 || selectedNodes?.length > 0,
      qJobs,
      qNodes
    }))

    // update map again
    const geo = jobsToGeos(qJobs, nodeDict)
    setGeo(geo)
    setUpdateMap(prev => prev + 1)
  }, [query, jobs, nodeDict, selectedNodes, jobState])


  useEffect(() => {
    setLoading(true)

    const filterUser = view == 'my-jobs' && user

    // fetch aggregated scheduler data
    const p1 = ES.getJobs() // {project: PROJECT}

    // also fetch gps for map
    const p2 = BK.getNodes()

    Promise.all([p1, p2])
      .then(([jobs, nodes]) => {
        const nodeDict = keyBy(nodes, 'vsn')
        setNodeDict(nodeDict)
        setCounts(getCounts(jobs, view == 'my-jobs'))

        // if 'my jobs', filter vsns to the user's nodes
        if (filterUser) {
          // const nodes = jobs.flatMap(o => o.nodes)
          jobs = jobs.filter(o => o.user == user)
        }

        // create some geo data
        const geo = jobsToGeos(jobs, nodeDict)

        setData({jobs})
        setGeo(geo)
      }).catch(err => {
        console.error(err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [setLoading, view, updateTable])



  // fetch aggreted task event data for timeline (and other stuff later?)
  useEffect(() => {
    if (view != 'timeline') return

    setLoading(true)
    ES.getEvents()
      .then(({events, errors}) =>
        setData(prev => ({
          ...prev,
          pluginEvents: events,
          pluginErrors: errors
        }))
      )
      .finally(() => setLoading(false))
  }, [view])


  // simply update table columns for job lists (for now?)
  useEffect(() => {
    setCols(view == 'all-jobs' ? jobCols : myJobCols)
  }, [view])


  const handleJobSelect = (sel) => {
    const objs = sel.objs.length ? sel.objs : []
    const nodes = jobsToGeos(objs, nodeDict)

    setData(prev => ({
      ...prev,
      selectedNodes: nodes.length ? nodes : [],
      selectedJobs: objs
    }))
    setUpdateMap(prev => prev + 1)
  }


  const handleQuery = ({query}) => {
    if (query) params.set('query', query)
    else params.delete('query')
    setParams(params, {replace: true})
  }


  const handleCloseDialog = () => {
    params.delete('job')
    navigate(`/jobs/${view}?${params.toString()}`, {replace: true})
  }

  const getSubset = (selectedNodes, nodes) => {
    const vsns = selectedNodes.map(o => o.vsn)
    const subset = nodes.filter(obj => vsns.includes(obj.vsn))
    return subset
  }


  const handleStatusFilter = (state: 'Queued' | ES.State) => {
    setJobState(prev => prev == state ? null : state)
  }

  const handleActionComplete = () => {
    setUpdateTable(prev => prev + 1) // force re-request
  }


  // if query param ?job=<job_id> is provided
  const jobDetails = job ?
    (jobs || []).find(o => o.job_id == job) :
    null


  return (
    <Root>
      <Main className="flex column">
        <Tabs
          value={view}
          aria-label="job status tabs"
        >
          <Tab
            label={
              <div className="flex items-center">
                <PublicIcon/>&nbsp;All Jobs ({loading ? '...' : counts.public})
              </div>
            }
            value="all-jobs"
            component={Link}
            to={`/jobs/all-jobs`}
            replace
          />
          {user &&
            <Tab
              label={
                <div className="flex items-center">
                  <MyJobsIcon/>&nbsp;My Jobs ({loading ? '...' : counts.mine})
                </div>
              }
              value="my-jobs"
              component={NavLink}
              to="/jobs/my-jobs"
              replace
            />
          }

          {/* todo(nc): rendering all timelines isn't scalable;
              possibly revist the concept later in a different form.
            <Tab
              label={<div className="flex items-center">
                <TimelineIcon />&nbsp;Timelines
              </div>}
              value="timeline"
              component={Link}
              to={`/jobs/timeline`}
              replace
            />
          */}
        </Tabs>
        <hr />

        <MapContainer>
          {geo &&
            <Map
              data={selectedNodes?.length ? getSubset(selectedNodes, geo) : geo}
              updateID={updateMap}
              showUptime={false}
            />
          }
        </MapContainer>

        <StateFilters
          counts={counts}
          state={jobState}
          onFilter={handleStatusFilter} />

        {view == 'all-jobs' && loading &&
          <TableSkeleton />
        }

        {['all-jobs', 'my-jobs'].includes(view) && qJobs && !loading &&
          <TableContainer>
            <Table
              primaryKey="id"
              rows={qJobs}
              columns={cols}
              enableSorting
              sort="-last_submitted"
              onSearch={handleQuery}
              onSelect={handleJobSelect}
              onColumnMenuChange={() => { /* do nothing special */ }}
              checkboxes={view == 'my-jobs'}
              emptyNotice={
                view == 'my-jobs' ?
                  `No ${jobState || 'active'} jobs with your username were found` :
                  `No ${jobState || 'active'} jobs found`
              }
              middleComponent={
                <TableOptions className="flex">
                  {view == 'my-jobs' && !selectedJobs?.length &&
                    <Button
                      component={Link}
                      to="/create-job"
                      variant="contained"
                      color="primary"
                      startIcon={<AddIcon/>}
                    >
                      Create job
                    </Button>
                  }

                  <JobActions
                    view={view}
                    jobs={selectedJobs}
                    onDone={handleActionComplete}
                  />

                  {isFiltered &&
                    <Tooltip title={`View timeline${selectedNodes?.length > 1 ? 's' : ''}`}>
                      <IconButton
                        component={Link}
                        to={`timeline?nodes=${selectedNodes?.map(o => o.vsn).join(',')}`}>
                        <TimelineIcon />
                      </IconButton>
                    </Tooltip>
                  }
                </TableOptions>
              }
            />
          </TableContainer>
        }

        {view == 'timeline' && pluginEvents && nodeDict &&
          <TimelineContainer>
            {Object.keys(pluginEvents)
              .filter(vsn => nodes ? nodes.includes(vsn) : true)
              .map((vsn, i) => {
                const {location} = nodeDict[vsn]
                return (
                  <Card key={i} className="title-row">
                    <div className="flex column">
                      <div>
                        <h2><Link to={`/node/${vsn}`}>{vsn}</Link></h2>
                      </div>
                      <div>{location}</div>
                    </div>
                    {/* @ts-ignore */}
                    <JobTimeline data={pluginEvents[vsn]} errors={pluginErrors} />
                  </Card>
                )
              })
            }
          </TimelineContainer>
        }

        {error &&
          <ErrorMsg>{error}</ErrorMsg>
        }
      </Main>


      {!!jobs.length && jobDetails &&
        <JobDetails
          job={jobDetails}
          nodeMetaByVSN={nodeDict}
          handleCloseDialog={handleCloseDialog}
        />
      }

      <br/>
    </Root>
  )
}



const Root = styled.div`
  margin: 10px 20px;

  hr {
    margin-top: 2px;
    margin-bottom: 0;
  }
`

const Main = styled.div`
  width: 100%;
  margin-bottom: 20px;
`

const MapContainer = styled.div`
  width: 100%;
  height:  350px;
  border: 1px solid #ddd;
  background: #f2f2f2;
`

const TableContainer = styled.div`
  margin-top: 1em;

  & .MuiInputBase-root {
    max-width: 100%;
    background: #fff;
  }

  table {
    background: #fff;
  }
`

const TableOptions = styled.div`
  margin: 0 20px;
`

