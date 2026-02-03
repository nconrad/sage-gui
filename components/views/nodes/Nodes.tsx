/* eslint-disable react/display-name */
import { useState, useEffect, useLayoutEffect, useRef } from 'react'
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

  // Check if we're on the user/:user/nodes route
  const isMyNodes = Auth.isSignedIn && !!pathname.match(/\/user\/[^/]+\/nodes/)

  const phase = params.get('phase') as BK.PhaseTabs

  const query = params.get('query') || ''
  const show_all = params.has('show_all') ? params.get('show_all') === 'true' : isMyNodes
  const all_nodes = pathname == '/all-nodes'
  const project = params.get('project')
  const focus = params.get('focus')
  const city = params.get('city')
  const state = params.get('state')
  const sensor = params.get('sensor')

  // all data and current state of filtered data
  const { setLoading } = useProgress()
  const [data, setData] = useState<ReturnType<typeof mergeMetrics>>(null)
  const [error, setError] = useState(null)
  const [filtered, setFiltered] = useState<BK.NodeState[]>(null)
  const [filterState, setFilterState] = useState<FilterState>({})
  const [cols, setCols] = useState<Column[]>(columns)

  // filter options
  const [focuses, setFocuses] = useState<Option[]>()
  const [projects, setProjects] = useState<Option[]>()
  const [cities, setCities] = useState<Option[]>()
  const [states, setStates] = useState<Option[]>()
  const [sensors, setSensors] = useState<Option[]>()

  // filter state
  const [updateID, setUpdateID] = useState(0)
  // const [nodeType, setNodeType] = useState<'all' | 'WSN' | 'Blade'>('all')

  const [selected, setSelected] = useState<BK.NodeState[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date>(null)
  const [vsnToProjectsMap, setVsnToProjectsMap] = useState<Map<string, string>>(null)
  const [userProjectsList, setUserProjectsList] = useState<User.Project[]>(null)
  const [userVsns, setUserVsns] = useState<string[]>(null)

  const dataRef = useRef(null)
  dataRef.current = data

  const userProjectsLoadedRef = useRef(false)
  const myNodesShowAllInitializedRef = useRef(false)


  // Fetch user projects once when in MyNodes view
  useEffect(() => {
    if (!isMyNodes) {
      // Reset the ref when leaving MyNodes view
      userProjectsLoadedRef.current = false
      return
    }

    if (userProjectsLoadedRef.current) return

    userProjectsLoadedRef.current = true

    // Set show_all=true only on first visit to MyNodes during this session
    if (!myNodesShowAllInitializedRef.current && !params.has('show_all')) {
      params.set('show_all', 'true')
      setParams(params, {replace: true})
      myNodesShowAllInitializedRef.current = true
    }

    User.listMyProjects().then(({vsns, projects}) => {
      // Store the user's projects list
      setUserProjectsList(projects)
      setUserVsns(vsns)

      // Create mapping of VSN to projects (comma-separated list)
      const vsnProjectMap = new Map<string, string>()
      projects.forEach(project => {
        project.nodes.forEach(node => {
          const existing = vsnProjectMap.get(node.vsn)
          if (existing) {
            vsnProjectMap.set(node.vsn, `${existing}, ${project.name}`)
          } else {
            vsnProjectMap.set(node.vsn, project.name)
          }
        })
      })
      setVsnToProjectsMap(vsnProjectMap)
    })
  }, [isMyNodes])


  // load data
  useEffect(() => {
    let done = false
    let handle

    // Skip if we're in MyNodes view but userVsns hasn't been loaded yet
    if (isMyNodes && !userVsns) {
      return
    }

    // get latest metrics
    function ping() {
      handle = setTimeout(async () => {
        if (done) return
        const metrics = await BH.getNodeData()

        let updatedData = mergeMetrics(dataRef.current, metrics, null, null)

        // Add projects field to each node when isMyNodes
        if (isMyNodes && vsnToProjectsMap) {
          updatedData = updatedData.map(node => ({
            ...node,
            projects: vsnToProjectsMap.get(node.vsn) || ''
          }))
        }

        setData(updatedData)
        setLastUpdate(new Date())

        // recursive
        ping()
      }, TIME_OUT)
    }

    setLoading(true)

    const dataPromise = isMyNodes && userVsns
      ? getProjectNodes(sageProject).then(nodes =>
        nodes.filter(node => userVsns.includes(node.vsn))
      )
      : getProjectNodes(sageProject)

    Promise.all([dataPromise, BH.getNodeData()])
      .then(([state, metrics]) => {
        if (done) return

        let allData = mergeMetrics(state, metrics, null, null)

        // Add projects field to each node when isMyNodes
        if (isMyNodes && vsnToProjectsMap) {
          allData = allData.map(node => ({
            ...node,
            projects: vsnToProjectsMap.get(node.vsn) || ''
          }))
        }

        setData(allData)
        setLastUpdate(new Date())
        ping()
      }).catch(err => {console.log('err', err) ; setError(err)})
      .finally(() => setLoading(false))

    return () => {
      done = true
      clearTimeout(handle)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sageProject, pathname, isMyNodes, userVsns])

  // updating on state changes
  useEffect(() => {
    if (!data) return
    updateAll(data, phase)
  }, [query, project, focus, city, state, sensor, phase, show_all, all_nodes])


  // re-apply updates in case of sorting or such (remove?)
  // Use useLayoutEffect to update map synchronously before paint
  useLayoutEffect(() => {
    if (!data) return
    updateAll(data, phase)
  }, [data, phase])

  // Update map when selection changes
  useEffect(() => {
    setUpdateID(prev => prev + 1)
  }, [selected])


  useEffect(() => {
    if (!isSuper) return

    setCols(prev => {
      const idx = prev.findIndex(o => o.id == 'vsn')
      prev.splice(idx, 1, {...prev[idx], format: vsnLinkWithEdit})
      return [...prev]
    })

  }, [isSuper])

  // Add projects column when in MyNodes view
  useEffect(() => {
    if (!isMyNodes || !vsnToProjectsMap) return

    setCols(prev => {
      // Check if projects column already exists
      const hasProjectsCol = prev.some(col => col.id === 'projects')
      if (hasProjectsCol) return prev

      // Add projects column after VSN column
      const vsnIdx = prev.findIndex(o => o.id == 'vsn')
      const projectsCol = {
        id: 'projects',
        label: 'Project(s)',
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
      prev.splice(vsnIdx + 1, 0, projectsCol)
      return [...prev]
    })
  }, [isMyNodes, vsnToProjectsMap])

  useEffect(() => {
    setCols(prev => {
      const idx = prev.findIndex(o => o.id == 'status')
      prev.splice(idx, 1, {...prev[idx], hide: all_nodes})
      return [...prev]
    })
  }, [all_nodes])

  // filter data (todo: this can probably be done more efficiently)
  const updateAll = (filteredData, phase) => {
    const filterState = getFilterState(params)
    setFilterState(filterState)

    if (phase)
      filteredData = filteredData.filter(obj => obj.phase == BK.phaseMap[phase])

    if (!show_all && !all_nodes)
      filteredData = filteredData.filter(obj => obj.status == 'reporting')

    // Handle projects filter separately for MyNodes (comma-separated values)
    if (isMyNodes && filterState.projects?.length) {
      filteredData = filteredData.filter(node => {
        const nodeProjects = node.projects || ''
        return filterState.projects.some(projectName =>
          nodeProjects.split(', ').includes(projectName)
        )
      })
      // Remove projects from filterState so filterData doesn't process it again
      const {projects, ...remainingFilters} = filterState
      filteredData = queryData(filteredData, query)
      filteredData = filterData(filteredData, remainingFilters)
    } else {
      filteredData = queryData(filteredData, query)
      filteredData = filterData(filteredData, filterState)
    }

    setFiltered(filteredData)
    setUpdateID(prev => prev + 1) // Update map immediately after filtering

    // Use user's projects list when isMyNodes, otherwise extract from data
    if (isMyNodes && userProjectsList) {
      setProjects(userProjectsList.map(p => ({id: p.name, label: p.name})))
    } else {
      setProjects(getOptions(data, 'project'))
    }
    setFocuses(getOptions(data, 'focus'))
    setCities(getOptions(data, 'city'))
    setStates(getOptions(data, 'state'))

    const sensorOptions = uniqBy(data.flatMap(o => o.sensors), 'hw_model')
      .map(o => ({id: o.hw_model, label: o.hw_model, subText: o.capabilities.join(', ')}))

    setSensors(sensorOptions)
  }


  const handleQuery = ({query}) => {
    if (query) params.set('query', query)
    else params.delete('query')
    setParams(params, {replace: true})
  }


  const handleFilterChange = (field: string, vals: Option[]) => {
    // MUI seems to result in vals may be string or option; todo(nc): address this?
    const newStr = vals.map(item =>
      `"${typeof item == 'string' ? item : item.id}"`
    ).join(',')


    if (!newStr.length) params.delete(field)
    else params.set(field, newStr)
    setParams(params, {replace: true})
  }


  const handleShowAll = (evt) => {
    const checked = evt.target.checked

    if (checked) params.set('show_all', 'true')
    else if (isMyNodes) params.set('show_all', 'false')
    else params.delete('show_all')
    setParams(params, {replace: true})
  }


  const handleRemoveFilters = () => {
    setParams(phase ? {phase} : {}, {replace: true})
  }


  const handleSelect = (sel) => {
    setSelected(sel.objs.length ? sel.objs : [])
  }


  const getSubset = (selected, nodes) => {
    const vsns = selected.map(o => o.vsn)
    const subset = nodes.filter(obj => vsns.includes(obj.vsn))
    return subset
  }


  const handleQueryViewerChange = (field: string, next: string[]) => {
    if (!next.length) params.delete(field)
    else params.set(field, next.map(str => `"${str}"`).join(','))
    setParams(params, {replace: true})
  }


  const hasActiveFilters = Object.values(filterState).some(fList => fList.length > 0)

  return (
    <Root>
      <Overview className="flex">
        {filtered && filtered.length > 0 &&
          <MapContainer>
            {!selected?.length &&
              <Title>
                {filtered.length} Node{filtered.length == 1 ? '' : 's'} | <small>
                  {lastUpdate?.toLocaleTimeString('en-US')}
                </small>
              </Title>
            }
            <MapGL
              data={selected.length ? getSubset(selected, filtered) : filtered}
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
                  <small>
                    If you think this is mistake, please try using the tab <Link to="/all-nodes">
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

                </div> :
                <span className="text-center">
                  <i>
                    A recent issue has delayed node measurement publications and
                    reporting status, <br/> resulting in data transfer delays and
                    a “Not Reporting” status across all nodes.
                    <br/><br/>
                    {/* We expect normal reporting to resume <b>_______</b>, as the system<br/>
                    begins catching up with incoming measurements from nodes. */}
                    Please check back later for updates. We thank you for your patience.
                  </i>
                  <br/>
                  <br/>
                  <small>
                    Consider using the tab <Link to="/all-nodes">View All Nodes</Link>, or
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
                {projects && isMyNodes &&
                  <FilterMenu
                    label="Project"
                    options={projects}
                    value={filterState.projects}
                    onChange={vals => handleFilterChange('project', vals as Option[])}
                    noSelectedSort
                  />
                }
                {focuses &&
                  <FilterMenu
                    label="Focus"
                    options={focuses}
                    value={filterState.focus}
                    onChange={vals => handleFilterChange('focus', vals as Option[])}
                    noSelectedSort
                  />
                }
                {cities &&
                  <FilterMenu
                    label="City"
                    options={cities}
                    value={filterState.city}
                    onChange={vals => handleFilterChange('city', vals as Option[])}
                  />
                }
                {states &&
                  <FilterMenu
                    label="State"
                    options={states}
                    value={filterState.state}
                    onChange={vals => handleFilterChange('state', vals as Option[])}
                  />
                }
                {sensors &&
                  <FilterMenu
                    label="Sensors"
                    options={sensors}
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


const Root = styled('div')`
`

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



