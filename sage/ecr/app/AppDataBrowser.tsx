/* eslint-disable react/display-name */
import { useEffect, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import styled from 'styled-components'

import Table from '../../../components/table/Table'
import * as BH from '../../../admin-ui/apis/beehive'
import { useProgress } from '../../../components/progress/ProgressProvider'

import {msToTime} from '../../../components/utils/units'
import Checkbox from '../../../components/input/Checkbox'
import FilterMenu from '../../../components/FilterMenu'

import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Alert from '@mui/material/Alert'
import ArrowBack from '@mui/icons-material/ArrowBackIosRounded'
import ArrowForward from '@mui/icons-material/ArrowForwardIosRounded'
import CaretIcon from '@mui/icons-material/ExpandMoreRounded'
import UndoIcon from '@mui/icons-material/UndoRounded'
import DownloadIcon from '@mui/icons-material/CloudDownloadOutlined'

import Audio from '../../../admin-ui/views/audio/Audio'

import { Line } from 'react-chartjs-2'


import QueryViewer from '../../../components/QueryViewer'


const relTime = val =>
  msToTime(new Date().getTime() - (new Date(val).getTime()))


const columns = [{
  id: 'relTime',
  label: 'Time'
}, {
  id: 'value',
  label: 'Value',
  format: (val) => {
    const isInOSN = /^https:\/\/storage.sagecontinuum.org/i.test(val)
    if (!isInOSN) return val

    if (val.includes('.jpg')) {
      return (
        <div className="flex column">
          <img src={val} width="550"/>
          <div className="flex justify-center">
            <Button startIcon={<DownloadIcon />} href={val}>
              {val.split('/').pop()}
            </Button>
          </div>
        </div>
      )
    }

    if (val.includes('.flac')) {
      return (
        <div className="flex column">
          <Audio dataURL={val}/>
          <div className="flex justify-center">
            <Button startIcon={<DownloadIcon />} href={val}>
              {val.split('/').pop()}
            </Button>
          </div>
        </div>
      )
    }

    return <a href={val}>{val.split('/').pop()}</a>
  }
}, {
  id: 'name',
  label: 'Name',
}, {
  id: 'vsn',
  label: 'VSN',
  format: (val, r) =>
    <a href={`https://admin.sagecontinuum.org/node/${r.host.split('.')[0].toUpperCase()}`} target="_blank" rel="noreferrer">
      {val}
    </a>
}, {
  id: 'job',
  label: 'Job',
}, {
  id: 'sensor',
  label: 'Sensor',
}, {
  id: 'meta',
  label: 'Meta',
  format: (o) =>
    Object.keys(o).map(k => {
      return <div key={`meta-${k}`}><b>{k}</b>: {o[k]}</div>
    })
  ,
  hide: true
}]


const findColumn = (cols, name) =>
  cols.findIndex(o => o.id == name)


type Unit = 'm' | 'h' | 'd'

const units = {
  'm': 'min',
  'h': 'hour',
  // 'd': 'day'
}

type TIProps = {
  page: number
  unit: 'm' | 'h' | 'd'
}

function TimeIndicator(props: TIProps) {
  const {page, unit} = props

  return (
    <div>
      {page == 1 ?
        `now - 1 ${units[unit]} ago` :
        `${page - 1} ${units[unit]} ago - ${page } ${units[unit]} ago`
      }
    </div>
  )
}


const VertDivider = () =>
  <Divider orientation="vertical" flexItem style={{margin: '5px 15px' }} />

const FilterBtn = ({label}) =>
  <Button size="medium">{label}<CaretIcon /></Button>


const getUniqueOpts = (data) =>
  data.filter((v, i, self) => self.indexOf(v) == i)
    .map(v => ({id: v, label: v}))


const getFilterVal = (items: string[]) => {
  return items.map(v => ({id: v, label: v}))
}


async function getFilterMenus(plugin) {
  const data = await BH.getData({
    start: `-4d`,
    tail: 1,
    filter: {
      plugin
    }
  })

  return {
    names: getUniqueOpts((data).map(o => o.name)),
    nodes: getUniqueOpts((data).map(o => o.meta.vsn)),
    sensors: getUniqueOpts((data).map(o => o.meta.sensor))
  }
}


function LineChart(props) {
  const {data} = props

  return (
    <Line
      data={{
        labels: data.map(o => o.x),
        datasets: [
          {data: data.map(o => o.y)}
        ]
      }}
    />
  )

}


const defaultPlugin = 'plugin-iio:0.4.5'
const initialState = {
  apps: [],
  names: [],
  nodes: [],
  sensors: []
}


export function getFilterState(params) {
  let init = {...initialState}
  for (const [key, val] of params) {
    init[key] = val.split(',')
  }

  return init
}



export default function DataPreview() {
  const params = new URLSearchParams(useLocation().search)
  const history = useHistory()
  const app = params.get('apps')
  const name = params.get('names')
  const node = params.get('nodes')
  const sensor = params.get('sensors')
  const unit = params.get('window') || 'm'


  const {setLoading} = useProgress()

  const [cols, setCols] = useState(columns)

  const [page, setPage] = useState(1)
  const [checked, setChecked] = useState({
    relativeTime: true,
    showMeta: false,
  })

  const [data, setData] = useState()
  const [error, setError] = useState()

  const [chart, setChart] = useState()

  // contents of dropdowns
  const [menus, setMenus] = useState<{[name: string]: string[]}>({
    apps: [],
    names: [],
    nodes: [],
    sensors: []
  })

  // selected filters
  const [filters, setFilters] = useState({
    apps: [defaultPlugin],
    names: [],
    nodes: [],
    sensors: []
  })

  useEffect(() => {
    const filterState = getFilterState(params)
    setFilters(filterState)
  }, [app, name, node, sensor])


  useEffect(() => {
    getFilterMenus(app)
      .then((menuItems) => setMenus(prev => ({...prev, ...menuItems})))
  }, [app])


  useEffect(() => {
    async function fetchAppMenu() {
      const query = {
        start: `-4d`,
        tail: 1,
        filter: {
          plugin: `.*`
        }
      }

      setLoading(true)
      BH.getData(query)
        .then((data) => {
          data = getUniqueOpts(data.map(o => o.meta.plugin).filter(n => n))
          setMenus(prev => ({...prev, apps: data}))
        }).catch(error => setError(error))
    }

    async function fetchData() {
      const query = {
        start: `-${page}${unit}`,
        end: `-${page - 1}${unit}`,
        filter: {
          plugin: app || defaultPlugin,
          ...(node ? {vsn: node} : {}),
          ...(name ? {name} : {}),
          ...(sensor ? {sensor} : {}),
        }
      }

      setLoading(true)
      BH.getData(query)
        .then((data) => {
          data = (data || [])
            .map((o, i) => ({...o, ...o.meta, rowID: i, relTime: relTime(o.timestamp)}))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

          setData(data)

          if (name) {
            const chartData = data.filter(o => o.name == name)
              .map(o => ({x: o.timestamp.split('T')[1].split('.').shift(), y: o.value}))

            setChart(chartData)
          }
        }).catch(error => setError(error))
        .finally(() => setLoading(false))
    }

    setLoading(true)
    fetchAppMenu()
    fetchData()

    getFilterMenus(app)
      .then((menuItems) => setMenus(prev => ({...prev, ...menuItems})))

  }, [setLoading, page, unit, app, node, name, sensor])


  useEffect(() => {
    setCols(prev => {
      let idx
      if (checked.relativeTime) {
        idx = findColumn(prev, 'timestamp')
        prev[idx] = {...prev[idx], id: 'relTime'}
      } else {
        idx = findColumn(prev, 'relTime')
        prev[idx] = {...prev[idx], id: 'timestamp'}
      }

      idx = findColumn(prev, 'meta')
      prev[idx] = {...prev[idx], hide: !checked.showMeta}

      return prev.slice(0)
    })

  }, [checked])


  const handleCheck = (evt, name) => {
    setChecked(prev => ({...prev, [name]: evt.target.checked}))
  }

  const handleFilterChange = (field: string, val: {id: string, label: string}) => {
    params.set(field, val.id)
    history.push({search: params.toString()})
  }

  const handleUnitChange = (val) => {
    params.set('window', val)
    history.push({search: params.toString()})
  }

  const handleRemoveFilters = () => {
    params.delete('names')
    params.delete('nodes')
    params.delete('sensors')
    params.delete('window')
    params.set('apps', defaultPlugin)
    history.push({search: params.toString()})
  }

  return (
    <Root>
      <div className="flex items-center gap">
        <h1>Data Browser</h1>
        <div className="flex items-center">
          <div className="flex items-center">
            <VertDivider />
            {Object.keys(filters).reduce((acc, k) => acc + filters[k].length, 0) > 1 &&
                <Button variant="outlined"
                  onClick={handleRemoveFilters}
                  startIcon={<UndoIcon />}
                >
                  Clear
                </Button>
            }

            <QueryViewer
              filterState={
                Object.keys(filters)
                  .filter(k => !['window'].includes(k))
                  .reduce((acc, k) => ({...acc, [k]: filters[k] }), {})
              }
            />
          </div>
        </div>
      </div>

      {/*chart &&
        <LineChart data={chart} />
      */}

      <br/>

      <div className="flex justify-between">
        <div className="flex items-cetner">
          <FilterMenu
            options={menus.apps}
            value={getFilterVal(filters.apps)[0]}
            onChange={val => handleFilterChange('apps', val)}
            noSelectedSort={true}
            multiple={false}
            disableCloseOnSelect={false}
            ButtonComponent={<div>
              <Button size="medium">{filters.apps.length ? filters.apps[0] : defaultPlugin}<CaretIcon /></Button>
            </div>}
          />
          <FilterMenu
            options={menus.nodes}
            value={getFilterVal(filters.nodes)[0]}
            onChange={vals => handleFilterChange('nodes', vals)}
            noSelectedSort={true}
            multiple={false}
            ButtonComponent={<div><FilterBtn label="Nodes" /></div>}
          />

          <FilterMenu
            options={menus.names}
            value={getFilterVal(filters.names)[0]}
            onChange={vals => handleFilterChange('names', vals)}
            noSelectedSort={true}
            multiple={false}
            ButtonComponent={<div><FilterBtn label="Names" /></div>}
          />

          <FilterMenu
            options={menus.sensors}
            value={getFilterVal(filters.sensors)[0]}
            onChange={vals => handleFilterChange('sensors', vals)}
            noSelectedSort={true}
            multiple={false}
            ButtonComponent={<div><FilterBtn label="Sensors" /></div>}
          />

          <VertDivider />
          <FormControlLabel
            control={
              <Checkbox
                checked={checked.relativeTime}
                onChange={(evt) => handleCheck(evt, 'relativeTime')}
              />
            }
            label="relative time"
          />

          <FormControlLabel
            control={<Checkbox checked={checked.showMeta} onChange={(evt) => handleCheck(evt, 'showMeta')} />}
            label="meta"
          />
        </div>


        <div className="flex items-center">
          <FormControl variant="outlined" style={{width: '80px', marginLeft: 10}}>
            <InputLabel id="unit-label">Window</InputLabel>
            <Select
              labelId="unit-label"
              id="unit"
              value={unit}
              onChange={evt => handleUnitChange(evt.target.value)}
              label="Window"
              margin="dense"
            >
              {Object.keys(units)
                .map(k =>
                  <MenuItem value={k} key={k}>{units[k]}</MenuItem>
                )
              }
            </Select>
          </FormControl>
          <VertDivider />
          {data && <div>{data.length} record{data.length == 1 ? '' : 's'}</div>}
          <VertDivider />
          <TimeIndicator page={page} unit={unit}/>
          <VertDivider />
          <IconButton size="small" onClick={() => setPage(prev => prev - 1)} disabled={page == 1}>
            <ArrowBack fontSize="small"/>
          </IconButton>
          <IconButton size="small" onClick={() => setPage(prev => prev + 1)}>
            <ArrowForward fontSize="small"/>
          </IconButton>
        </div>
      </div>


      {error &&
        <Alert severity="error">{error.message}</Alert>
      }

      {data &&
        <Table
          primaryKey="rowID"
          enableSorting
          columns={cols}
          rows={data}
          emptyNotice={
            <span className="flex"><span>No records found from</span>&nbsp;<TimeIndicator page={page} unit={unit}/></span>
          }
          disableRowSelect={() => true}
        />
      }
    </Root>
  )
}

const Root = styled.div`
  margin: 2em;

  h1 {
    font-size: 1.5em;
  }
`

