/* eslint-disable react/display-name */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { styled } from '@mui/material'
import { useSearchParams, useLocation, Link, useParams } from 'react-router-dom'

import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import FormControlLabel from '@mui/material/FormControlLabel'
import Tooltip from '@mui/material/Tooltip'
import UndoIcon from '@mui/icons-material/UndoRounded'

import { uniqBy } from 'lodash'

import columns from './columns'
import {
  filterData,
  getFilterState,
  mergeMetrics,
  type FilterState
} from '/components/views/statusDataUtils'

import Table, { type Column } from '/components/table/Table'
import FilterMenu from '/components/FilterMenu'
import MapGL from '/components/Map'
import QueryViewer from '/components/QueryViewer'
import { useProgress } from '/components/progress/ProgressProvider'
import { queryData } from '/components/data/queryData'
import { useIsSuper } from '/components/auth/PermissionProvider'

import * as BK from '/components/apis/beekeeper'
import * as BH from '/components/apis/beehive'
import * as User from '/components/apis/user'

import Auth from '/components/auth/auth'
import settings from '/components/settings'
import Checkbox from '/components/input/Checkbox'
import { vsnLinkWithEdit } from './nodeFormatters'


const TIME_OUT = 5000

const getOptions = (data: object[], field: string) : Option[] =>
  [...new Set(data.map(obj => obj[field])) ]
    .map(name => ({id: name, label: name}))
    .filter(o => o.id?.length)


// helper to filter against project/focuses in setting file
const filterOn = (data: BK.Node[], key: string) =>
  data.filter(o => o[key]?.toLowerCase() == settings[key]?.toLowerCase())


function getProjectNodes(projectParam?: string) {
  const {project: settingsProject, focus, vsns} = settings
  const project = projectParam || settingsProject

  return BK.getNodes({project})
    .then((data) => {
      if (focus)
        data = filterOn(data, 'focus')
      if (vsns)
        data = data.filter(o => settings.vsns.includes(o.vsn))

      if (project.includes('SAGE')) {
        data = data.filter(obj =>
          ['Deployed', 'Awaiting Deployment', 'Maintenance'].includes(obj.phase)
        )
      }

      return data
    })
}


type Option = {
  id: string,
  label: string
}

export default function Nodes() {
  const { sageProject } = useParams()
  const [params, setParams] = useSearchParams()
  const {pathname} = useLocation()
  const {isSuper} = useIsSuper()

  // Derived state from URL/pathname
  const isMyNodes = useMemo(() => {
    return Auth.isSignedIn && !!pathname.match(/\/user\/[^/]+\/nodes/)
  }, [pathname])

  const all_nodes = pathname.startsWith('/nodes/all')
  const phase = params.get('phase') as BK.PhaseTabs
  const query = params.get('query') || ''
  const show_all = params.get('show_all') === 'true'

  // Data state
  const { setLoading } = useProgress()
  const [data, setData] = useState<ReturnType<typeof mergeMetrics>>(null)
  const [error, setError] = useState(null)
  const [filtered, setFiltered] = useState<BK.NodeState[]>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(null)
  const [selected, setSelected] = useState<BK.NodeState[]>([])

  // MyNodes-specific state
  const [userVsns, setUserVsns] = useState<string[]>(null)
  const [vsnToProjectsMap, setVsnToProjectsMap] = useState<Map<string, string>>(null)
  const [userProjectsList, setUserProjectsList] = useState<User.Project[]>(null)
  const [myNodesReady, setMyNodesReady] = useState(false)

  // Filter state
  const [filterState, setFilterState] = useState<FilterState>({})
  const [updateID, setUpdateID] = useState(0)


  // Memoized filter options
  const filterOptions = useMemo(() => {
    if (!data) return {}

    const sensorOptions = uniqBy(data.flatMap(o => o.sensors), 'hw_model')
      .map(o => ({id: o.hw_model, label: o.hw_model, subText: o.capabilities.join(', ')}))

    return {
      projects: isMyNodes && userProjectsList
        ? userProjectsList.map(p => ({id: p.name, label: p.name}))
        : getOptions(data, 'project'),
      focuses: getOptions(data, 'focus'),
      cities: getOptions(data, 'city'),
      states: getOptions(data, 'state'),
      sensors: sensorOptions
    }
  }, [data, isMyNodes, userProjectsList])

  // Refs
  const dataRef = useRef(null)
  dataRef.current = data


  // Load user projects data for MyNodes view
  useEffect(() => {
    if (!isMyNodes) {
      setMyNodesReady(false)
      setUserVsns(null)
      setVsnToProjectsMap(null)
      setUserProjectsList(null)
      return
    }

    setMyNodesReady(false)

    if (!params.has('show_all')) {
      // Default to showing all nodes in MyNodes view since users expect to
      // see their nodes even if they're not reporting
      const newParams = new URLSearchParams(params)
      newParams.set('show_all', 'true')
      setParams(newParams, {replace: true})
    }

    User.listMyProjects().then(({vsns, projects}) => {
      setUserProjectsList(projects)
      setUserVsns(vsns)

      // Create VSN to projects mapping
      const vsnProjectMap = new Map<string, string>()
      projects.forEach(project => {
        project.nodes.forEach(node => {
          const existing = vsnProjectMap.get(node.vsn)
          vsnProjectMap.set(node.vsn, existing ? `${existing}, ${project.name}` : project.name)
        })
      })
      setVsnToProjectsMap(vsnProjectMap)
      setMyNodesReady(true)
    })
  }, [isMyNodes])


  // Add projects field to nodes data when in MyNodes view
  const enrichWithProjects = useCallback((nodes) => {
    if (!isMyNodes || !vsnToProjectsMap) return nodes
    return nodes.map(node => ({
      ...node,
      projects: vsnToProjectsMap.get(node.vsn) || ''
    }))
  }, [isMyNodes, vsnToProjectsMap])


  // Load and poll node data
  useEffect(() => {
    if (isMyNodes && !myNodesReady) return // Wait for MyNodes data to be ready

    let done = false
    let handle: NodeJS.Timeout

    const ping = async () => {
      handle = setTimeout(async () => {
        if (done) return

        const metrics = await BH.getNodeData()
        const updatedData = enrichWithProjects(mergeMetrics(dataRef.current, metrics, null, null))

        setData(updatedData)
        setLastUpdate(new Date())
        ping()
      }, TIME_OUT)
    }

    setLoading(true)

    const dataPromise = isMyNodes && userVsns
      ? getProjectNodes(sageProject).then(nodes => nodes.filter(node => userVsns.includes(node.vsn)))
      : getProjectNodes(sageProject)

    Promise.all([dataPromise, BH.getNodeData()])
      .then(([state, metrics]) => {
        if (done) return

        const allData = enrichWithProjects(mergeMetrics(state, metrics, null, null))
        setData(allData)
        setLastUpdate(new Date())
        ping()
      })
      .catch(err => {
        console.log('err', err)
        setError(err)
      })
      .finally(() => setLoading(false))

    return () => {
      done = true
      clearTimeout(handle)
    }
  }, [sageProject, isMyNodes, myNodesReady, userVsns, enrichWithProjects])


  // Filter and update data whenever dependencies change
  useEffect(() => {
    if (!data) return

    // Don't update filtered data until MyNodes is ready (prevents flicker)
    if (isMyNodes && !myNodesReady) return

    const newFilterState = getFilterState(params)
    setFilterState(newFilterState)

    let result = [...data]

    // Apply phase filter
    if (phase) {
      result = result.filter(obj => obj.phase == BK.phaseMap[phase])
    }

    // Apply status filter
    if (!show_all && !all_nodes) {
      result = result.filter(obj => obj.status == 'reporting')
    }

    // Apply query search
    result = queryData(result, query)

    // Handle projects filter for MyNodes (comma-separated values)
    if (isMyNodes && newFilterState.projects?.length) {
      result = result.filter(node => {
        const nodeProjects = node.projects || ''
        return newFilterState.projects.some(projectName =>
          nodeProjects.split(', ').includes(projectName)
        )
      })
      // Remove projects from filter state so filterData doesn't process it
      const {projects, ...remainingFilters} = newFilterState
      result = filterData(result, remainingFilters)
    } else {
      result = filterData(result, newFilterState)
    }

    setFiltered(result)
    setUpdateID(prev => prev + 1)
  }, [data, phase, show_all, all_nodes, query, params, isMyNodes, myNodesReady])


  // Compute columns based on current state
  const cols = useMemo(() => {
    const computedColumns = [...columns]

    // Modify VSN column for super users
    if (isSuper) {
      const vsnIdx = computedColumns.findIndex(o => o.id === 'vsn')
      if (vsnIdx !== -1) {
        computedColumns[vsnIdx] = {...computedColumns[vsnIdx], format: vsnLinkWithEdit}
      }
    }

    // Add projects column for MyNodes view (only when data is ready)
    if (isMyNodes && myNodesReady && vsnToProjectsMap) {
      const vsnIdx = computedColumns.findIndex(o => o.id === 'vsn')
      const projectsCol: Column = {
        id: 'projects',
        label: 'My Project(s)',
        format: (_, obj) => {
          const projectsStr = vsnToProjectsMap.get(obj.vsn)
          if (!projectsStr) return '-'

          const projectNames = projectsStr.split(', ')
          return (
            <>
              {projectNames.map((name, idx) => (
                <span key={name}>
                  <Link to={`/user/${Auth.user}/teams/${encodeURIComponent(name)}`}>{name}</Link>
                  {idx < projectNames.length - 1 && ', '}
                </span>
              ))}
            </>
          )
        },
        dlFormat: (_, obj) => vsnToProjectsMap.get(obj.vsn) || ''
      }
      computedColumns.splice(vsnIdx + 1, 0, projectsCol)
    }

    // Hide status column for all_nodes view
    const statusIdx = computedColumns.findIndex(o => o.id === 'status')
    if (statusIdx !== -1) {
      computedColumns[statusIdx] = {...computedColumns[statusIdx], hide: all_nodes}
    }

    return computedColumns
  }, [isSuper, isMyNodes, myNodesReady, vsnToProjectsMap, all_nodes])


  // Update map when selection changes
  useEffect(() => {
    setUpdateID(prev => prev + 1)
  }, [selected])


  // Event handlers
  const handleQuery = ({query}) => {
    const newParams = new URLSearchParams(params)
    if (query) newParams.set('query', query)
    else newParams.delete('query')
    setParams(newParams, {replace: true})
  }


  const handleFilterChange = (field: string, vals: Option[]) => {
    const newStr = vals.map(item =>
      `"${typeof item == 'string' ? item : item.id}"`
    ).join(',')

    const newParams = new URLSearchParams(params)
    if (!newStr.length) newParams.delete(field)
    else newParams.set(field, newStr)
    setParams(newParams, {replace: true})
  }


  const handleShowAll = (evt) => {
    const checked = evt.target.checked
    const newParams = new URLSearchParams(params)
    if (checked) newParams.set('show_all', 'true')
    else newParams.delete('show_all')
    setParams(newParams, {replace: true})
  }


  const handleRemoveFilters = () => {
    setParams(phase ? {phase} : {}, {replace: true})
  }


  const handleSelect = (sel) => {
    setSelected(sel.objs.length ? sel.objs : [])
  }


  const handleQueryViewerChange = (field: string, next: string[]) => {
    const newParams = new URLSearchParams(params)
    if (!next.length) newParams.delete(field)
    else newParams.set(field, next.map(str => `"${str}"`).join(','))
    setParams(newParams, {replace: true})
  }

  const getSelectedSubset = (selected, nodes) => {
    const vsns = selected.map(o => o.vsn)
    return nodes.filter(obj => vsns.includes(obj.vsn))
  }

  const hasActiveFilters = Object.values(filterState).some(fList => fList.length > 0)

  return (
    <Root>
      <Overview className="flex">
        {filtered &&
          <MapContainer>
            {!selected?.length &&
              <Title>
                {isMyNodes ? `My ${filtered.length} Node` : `${filtered.length} Node`}{filtered.length == 1 ? '' : 's'}
                {' '}|{' '}
                <small>
                  {lastUpdate?.toLocaleTimeString('en-US')}
                </small>
              </Title>
            }
            <MapGL
              data={selected.length ? getSelectedSubset(selected, filtered) : filtered}
              markerClass={all_nodes ? 'blue-dot' : null}
              updateID={updateID}
            />
          </MapContainer>
        }
      </Overview>

      {error &&
        <Alert severity="error">{error.message}</Alert>
      }

      <TableContainer>
        {filtered &&
          <Table
            primaryKey="id"
            rows={filtered}
            columns={cols}
            enableSorting
            enableDownload
            sort="-vsn"
            search={query}
            storageKey={pathname}
            onSearch={handleQuery}
            onColumnMenuChange={() => { /* do nothing */ }}
            onSelect={handleSelect}
            emptyNotice={
              show_all || all_nodes || query || hasActiveFilters ?
                <div className="text-center">
                  <p>No nodes found for this query</p>
                  {!isMyNodes &&
                    <small>
                      Please try using the tab <Link to="/nodes/all">
                      View All Nodes</Link>, or
                      the checkbox ( <FormControlLabel
                        control={
                          <Checkbox
                            checked={show_all}
                            onChange={(evt) => handleShowAll(evt)}
                          />
                        }
                        label="Show all"
                        sx={{marginRight: 0}}
                      /> ) to show nodes <br/> which are in maintenance, pending deployment, or not reporting.
                    </small>
                  }
                </div> :
                <span className="text-center">
                  <i>
                    A recent issue has delayed node measurement publications and
                    reporting status, <br/> resulting in data transfer delays and
                    a "Not Reporting" status across all nodes.
                    <br/><br/>
                    Please check back later for updates. We thank you for your patience.
                  </i>
                  <br/>
                  <br/>
                  <small>
                    Consider using the tab <Link to="/nodes/all">View All Nodes</Link>, or
                    the checkbox ( <FormControlLabel
                      control={
                        <Checkbox
                          checked={show_all}
                          onChange={(evt) => handleShowAll(evt)}
                        />
                      }
                      label="Show all"
                      sx={{marginRight: 0}}
                    /> ) to show nodes <br/> which are in maintenance, pending deployment, or not reporting.
                  </small>
                </span>
            }
            middleComponent={
              <FilterControls className="flex items-center">
                {filterOptions.projects && isMyNodes &&
                  <FilterMenu
                    label="Project"
                    options={filterOptions.projects}
                    value={filterState.projects}
                    onChange={vals => handleFilterChange('project', vals as Option[])}
                    noSelectedSort
                  />
                }
                {filterOptions.focuses &&
                  <FilterMenu
                    label="Focus"
                    options={filterOptions.focuses}
                    value={filterState.focus}
                    onChange={vals => handleFilterChange('focus', vals as Option[])}
                    noSelectedSort
                  />
                }
                {filterOptions.cities &&
                  <FilterMenu
                    label="City"
                    options={filterOptions.cities}
                    value={filterState.city}
                    onChange={vals => handleFilterChange('city', vals as Option[])}
                  />
                }
                {filterOptions.states &&
                  <FilterMenu
                    label="State"
                    options={filterOptions.states}
                    value={filterState.state}
                    onChange={vals => handleFilterChange('state', vals as Option[])}
                  />
                }
                {filterOptions.sensors &&
                  <FilterMenu
                    label="Sensors"
                    options={filterOptions.sensors}
                    value={filterState.sensor}
                    onChange={vals => handleFilterChange('sensor', vals as Option[])}
                  />
                }
                {!all_nodes &&
                  <Tooltip
                    sx={{mx: 1}}
                    placement="top"
                    title={
                      <>Show nodes which are in maintenance, pending deployment, or not reporting.</>
                    }
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={show_all}
                          onChange={(evt) => handleShowAll(evt)}
                        />
                      }
                      label="Show all"
                    />
                  </Tooltip>
                }
                {hasActiveFilters  &&
                  <>
                    <VertDivider />
                    <Button variant="contained"
                      color="primary"
                      size="small"
                      onClick={handleRemoveFilters}
                      style={{backgroundColor: '#1c8cc9'}}
                      startIcon={<UndoIcon />}
                    >
                      Clear
                    </Button>
                  </>
                }

                <QueryViewer
                  filterState={filterState}
                  onDelete={handleQueryViewerChange}
                />
              </FilterControls>
            }
          />
        }
      </TableContainer>
    </Root>
  )
}


const VertDivider = () =>
  <Divider orientation="vertical" flexItem style={{margin: '5px 15px 5px 15px' }} />


const Root = styled('div')``

const Overview = styled('div')`
  z-index: 100;
  padding: 10px 0;
  border-bottom: 1px solid ${props => props.theme.palette.divider};
`

const MapContainer = styled('div')`
  position: relative;
  width: 100%;
`

const Title = styled('h2')`
  margin: .5em;
  position: absolute;
  z-index: 1000;
`

const TableContainer = styled('div')`
  margin-top: .5em;

  .status-icon {
    margin: 0 10px;
  }

  .gps-icon {
    margin-right: 10px;
  }

  .edit-btn {
    margin-left: .5em;
    visibility: hidden;
  }

  tr:hover .edit-btn {
    visibility: visible;
  }
`

const FilterControls = styled('div')`
  margin-left: 1.5em;
`
