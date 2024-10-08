/* eslint-disable react/display-name */
import { useState, useEffect, useRef } from 'react'
import styled from 'styled-components'
import { useSearchParams } from 'react-router-dom'

import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import UndoIcon from '@mui/icons-material/UndoRounded'
import Alert from '@mui/material/Alert'

import columns from './columns'
import {
  filterData,
  getFilterState,
  mergeMetrics,
  type FilterState
} from '/components/views/statusDataUtils'

import Table, { type Column } from '/components/table/Table'
import FilterMenu from '/components/FilterMenu'
import Map from '/components/Map'
// import Charts from './charts/Charts'
import QueryViewer from '/components/QueryViewer'
import { useProgress } from '/components/progress/ProgressProvider'
import { queryData } from '/components/data/queryData'
import { useIsSuper } from '/components/auth/PermissionProvider'
import { vsnLinkWithEdit } from '/components/views/nodes/nodeFormatters'


import * as BK from '/components/apis/beekeeper'
import * as BH from '/components/apis/beehive'



const SPARKLINE_START = '-12h'
const TIME_OUT = 5000


const getOptions = (data: object[], field: string) : Option[] =>
  [...new Set(data.map(obj => obj[field])) ]
    .map(name => ({id: name, label: name}))
    .filter(o => o.id?.length)


const pingRequests = () => [
  BH.getNodeAdminData(),
  BH.getHealthData({start: SPARKLINE_START}),
  BH.getSanitySummary({start: SPARKLINE_START})
]


type Option = {
  id: string,
  label: string
}


export default function StatusView() {
  const [params, setParams] = useSearchParams()
  const {isSuper} = useIsSuper()

  const phase = params.get('phase') as BK.PhaseTabs

  const query = params.get('query') || ''
  const status = params.get('status')
  const project = params.get('project')
  const focus = params.get('focus')
  const city = params.get('city')
  const state = params.get('state')

  // all data and current state of filtered data
  const { setLoading } = useProgress()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [filtered, setFiltered] = useState(null)
  const [filterState, setFilterState] = useState<FilterState>({})
  const [cols, setCols] = useState<Column[]>(columns)

  // filter options
  const [statuses, setStatuses] = useState<Option[]>()
  const [projects, setProjects] = useState<Option[]>()
  const [focuses, setFocuses] = useState<Option[]>()
  const [cities, setCities] = useState<Option[]>()
  const [states, setStates] = useState<Option[]>()

  // filter state
  const [updateID, setUpdateID] = useState(0)
  const [nodeType, setNodeType] = useState<'all' | 'WSN' | 'Blade'>('all')

  const [selected, setSelected] = useState([])
  const [lastUpdate, setLastUpdate] = useState(null)

  const dataRef = useRef(null)
  dataRef.current = data


  /**
   * load data
   */
  useEffect(() => {
    let done = false
    let handle

    // get latest metrics
    function ping() {
      handle = setTimeout(async () => {
        if (done) return
        const results = await Promise.allSettled(pingRequests())
        const [metrics, health, sanity] = results.map(r => r.value)

        setData(mergeMetrics(dataRef.current, metrics, health, sanity))
        setLastUpdate(new Date().toLocaleTimeString('en-US'))

        // recursive
        ping()
      }, TIME_OUT)
    }

    setLoading(true)
    const proms = [BK.getNodes(), ...pingRequests()]
    Promise.allSettled(proms)
      .then((results) => {
        if (done) return
        const [state, metrics, health, sanity] = results.map(r => r.value)

        setData(state)

        const allData = mergeMetrics(state, metrics, health, sanity)
        setData(allData)
        setLastUpdate(new Date().toLocaleTimeString('en-US'))
        ping()
      }).catch(err => setError(err))
      .finally(() => setLoading(false))

    return () => {
      done = true
      clearTimeout(handle)
    }
  }, [])


  // updating on state changes
  useEffect(() => {
    if (!data) return
    updateAll(data, phase)

    // force mapbox rerender and avoid unnecessary rerenders
    setUpdateID(prev => prev + 1)
  }, [query, status, project, focus, city, state, nodeType, phase])


  // re-apply updates in case of sorting or such (remove?)
  useEffect(() => {
    if (!data) return
    updateAll(data, phase)
  }, [data, phase])


  // filter data (todo: this can probably be done more efficiently)
  const updateAll = (d, phase) => {
    const filterState = getFilterState(params)
    setFilterState(filterState)

    let filteredData = d
    if (phase)
      filteredData = d.filter(obj => obj.phase == BK.phaseMap[phase])

    filteredData = queryData(filteredData, query)
    filteredData = filterData(filteredData, filterState)

    // sort by not reporting to place not reporting in top layer of map
    setFiltered(filteredData.sort((a) => a.status == 'not reporting' ? 1 : -1))

    setStatuses(getOptions(data, 'status'))
    setProjects(getOptions(data, 'project'))
    setFocuses(getOptions(data, 'focus'))
    setCities(getOptions(data, 'city'))
    setStates(getOptions(data, 'state'))
  }


  useEffect(() => {
    if (!isSuper) return

    setCols(prev => {
      const idx = prev.findIndex(o => o.id == 'vsn')
      prev.splice(idx, 1, {...prev[idx], format: vsnLinkWithEdit})
      return [...prev]
    })

  }, [isSuper])


  const handleQuery = ({query}) => {
    if (query) params.set('query', query)
    else params.delete('query')
    setParams(params, {replace: true})
  }


  const handleFilterChange = (field: string, vals: ({id: string, label: string} | string)[]) => {
    // MUI seems to result in vals may be string or option; todo(nc): address this?
    const newStr = vals.map(item =>
      `"${typeof item == 'string' ? item : item.id}"`
    ).join(',')


    if (!newStr.length) params.delete(field)
    else params.set(field, newStr)
    setParams(params, {replace: true})
  }


  const handleRemoveFilters = () => {
    setNodeType('all')
    setParams(phase ? {phase} : {}, {replace: true})
  }


  const handleSelect = (sel) => {
    setSelected(sel.objs.length ? sel.objs : [])
    setUpdateID(prev => prev + 1)
  }


  const getSubset = (selected, nodes) => {
    const ids = selected.map(o => o.id)
    const subset = nodes.filter(obj => ids.includes(obj.id))
    return subset
  }


  const handleQueryViewerChange = (field: string, next: string[]) => {
    if (!next.length) params.delete(field)
    else params.set(field, next.join(','))
    setParams(params, {replace: true})
  }


  return (
    <Root>
      <Overview className="flex">
        {filtered && !selected?.length &&
          <Title>
            {filtered.length} Node{filtered.length == 1 ? '' : 's'} | <small>{lastUpdate}</small>
          </Title>
        }

        {filtered &&
          <Map
            data={selected.length ? getSubset(selected, filtered) : filtered}
            updateID={updateID}
          />
        }
      </Overview>

      {/*
        <ChartsContainer className="flex column" >
          {filtered && !selected?.length &&
            <ChartsTitle>
              {filtered.length} Node{filtered.length == 1 ? '' : 's'} | <small>{lastUpdate}</small>
            </ChartsTitle>
          }

          {selected?.length == 1 &&
            <div className="flex items-center">
              <h3>
                {selected[0].id}
              </h3>
            </div>
          }

          {selected?.length > 1 &&
            <h2>{selected.map(o => o.id).join(', ')}</h2>
          }

          {!selected?.length &&
            <Charts
              data={filtered}
              selected={selected}
              column
            />
          }
        </ChartsContainer>
        */}


      {error &&
        <Alert severity="error">{error.message}</Alert>
      }

      <TableContainer>
        {filtered &&
          <Table
            primaryKey="id"
            rows={filtered}
            columns={cols}
            storageKey="/nodes"
            enableDownload
            enableSorting
            search={query}
            onSearch={handleQuery}
            onColumnMenuChange={() => { /* do nothing */ }}
            onSelect={handleSelect}
            emptyNotice="No nodes found"
            middleComponent={
              <FilterControls className="flex items-center">
                {statuses ?
                  <FilterMenu
                    label="Status"
                    options={statuses}
                    value={filterState.status}
                    onChange={vals => handleFilterChange('status', vals as Option[])}
                    noSelectedSort
                  /> : <></>
                }
                {projects &&
                  <FilterMenu
                    label="Project"
                    options={projects}
                    value={filterState.project}
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

                {Object.values(filterState).reduce((acc, fList) => acc + fList.length, 0) as number > 0 &&
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


const Root = styled.div`
`

const Overview = styled.div`
  top: 60px;
  z-index: 100;
  padding: 20px 0 10px 0;
  background: #fff;
  border-bottom: 1px solid #f2f2f2;
`

const Title = styled.h2`
  margin: .5em;
  position: absolute;
  z-index: 1000;
`

const TableContainer = styled.div`
  margin-top: .5em;
  table thead th:first-child {
    text-align: center;
  }

  .status-icon {
    margin: 0 10px;
  }

  .edit-btn {
    margin-left: .5em;
    visibility: hidden;
  }

  tr:hover .edit-btn {
    visibility: visible;
  }
`

const FilterControls = styled.div`
  margin-left: 1.5em;
`



