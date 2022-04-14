/* eslint-disable react/display-name */
import styled from 'styled-components'
import {Link} from 'react-router-dom'

import CheckIcon from '@mui/icons-material/CheckCircleRounded'
import Badge from '@mui/material/Badge'
import MapIcon from '@mui/icons-material/RoomOutlined'
import Chip from '@material-ui/core/Chip'
import Tooltip from '@mui/material/Tooltip'

import * as utils from '/components/utils/units'
import config from '/config'
import settings from '../../settings'


const dateOpts = {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric'
}

const sysTimeOpts = {
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric'
}


const LiveGPSDot = styled(Badge)`
  .MuiBadge-badge {
    right: 3px;
    top: 2px;
    padding: 0px;
  }
`

export function getColorClass(val, severe: number, warning: number, defaultClass?: string) {
  if (!val || val >= severe) return 'severe font-bold'
  else if (val > warning) return 'warning font-bold'
  else if (defaultClass) return defaultClass
  return ''
}

const shortMntName = name =>
  name.replace('root-', '')
    .replace('plugin-data', 'plugins')
    .replace('core_sdcard_test', 'sdcard')



const FSItem = styled.div`
  margin-right: 1em;
  font-size: .85em;
  width: 40px;
`

const columns = [ {
  id: 'node_type',
  label: 'Type',
  hide: false
}, {
  id: 'vsn',
  label: 'VSN',
  width: '50px',
  format: (val, obj) =>
    <NodeCell className="flex items-center justify-between">
      {obj.node_type != 'Blade' ?
        <Link to={`/node/${obj.id}`}>{val || `-`}</Link> : (val || `-`)
      }
      {obj.lat && obj.lng &&
        <LiveGPSDot invisible={!obj.hasLiveGPS} color="primary" variant="dot">
          {obj.hasStaticGPS ?
            <MapIcon fontSize="small"/> :
            <MapIcon fontSize="small" style={{color: "#36b8ff"}}/>
          }
        </LiveGPSDot>
      }
    </NodeCell>
},  {
  id: 'id',
  label: 'ID',
  width: '100px',
  format: (val, obj) =>
    obj.node_type != 'Blade' ?
      <Link to={`/node/${val}`}>{val}</Link> : val,
  hide: true
}, {
  id: 'focus',
  label: 'Focus'
}, {
  id: 'location',
  label: 'Location',
}, {
  id: 'gps',
  label: 'GPS',
  format: (val, obj) => {
    if (!obj || !obj.lat || !obj.lng) return '-'
    return `${obj.lat}, ${obj.lng}`
  }
}, {
  id: 't_sensors',
  label: 'Top Sensors',
  format: (v, obj) => {
    if (obj.node_type != 'WSN')
      return '-'

    const {top_camera: cam, shield} = obj

    return <SensorList>
      {cam != 'none' ? <li><TT title="Top camera">{cam}</TT></li> : ''}
      <li><TT title="Rainfall sensor">RG-15</TT></li>
    </SensorList>
  }
}, {
  id: 'b_sensors',
  label: 'Botttom Sensors',
  format: (v, obj) => {
    if (obj.node_type != 'WSN')
      return '-'

    const {bottom_camera: cam, shield} = obj

    return <SensorList>
      {cam != 'none' ? <li><TT title="Bottom camera">{cam}</TT></li> : '-'}
    </SensorList>
  }
}, {
  id: 'l_sensors',
  label: 'Left Sensors',
  format: (v, obj) => {
    if (obj.node_type != 'WSN')
      return '-'

    const {left_camera: cam, shield} = obj

    return <SensorList>
      {cam != 'none' ? <li><TT title="Left camera">{cam}</TT></li> : '-'}
    </SensorList>
  }
}, {
  id: 'r_sensors',
  label: 'Right Sensors',
  format: (v, obj) => {
    const {right_camera: cam, shield} = obj

    if (cam == 'none' && !shield)
      return '-'

    return <SensorList>
      {cam != 'none' ? <li><TT title="Right camera">{cam}</TT></li> : ''}
      {shield ? <li><TT title="Microphone">ETS ML1-WS</TT></li> : ''}
      {shield ? <li><TT title="temp, humidity, pressure, and gas sensor">BME680</TT></li> : ''}
    </SensorList>
  }
}, {
  id: 'additional_sensors',
  label: 'Addional Sensors'
}, {
  id: 'registration_event',
  label: 'Registered',
  format: (val) => new Date(val).toLocaleString('en-US', dateOpts),
  hide: true
}, {
  id: 'commission_date',
  label: 'Commission Date',
}, {
  id: 'top_camera',
  label: 'Top Camera',
  hide: true
}, {
  id: 'right_camera',
  label: 'Right Camera',
  hide: true
}, {
  id: 'left_camera',
  label: 'Left Camera',
  hide: true
}, {
  id: 'bottom_camera',
  label: 'Bottom Camera',
  hide: true
}, {
  id: 'shield',
  label: 'Has Shield',
  format: (val) => val ? <CheckIcon className="success" /> : 'no',
  hide: true,
}, {
  id: 'modem',
  label: 'Modem',
  format: (val) => val ? <CheckIcon className="success" /> : 'no',
  hide: true
}, {
  id: 'modem_sim',
  label: 'Modem Sim',
  format: (val) => val ? <CheckIcon className="success" /> : 'no',
  hide: true
}]


const NodeCell = styled.div`
  margin-right: .2em;
  .MuiButtonBase-root {
    margin-bottom: 2px;
  }
`

const SensorList = styled.ul`
  padding: 0;
  font-size: 9pt;
  li {
    white-space: nowrap;
  }
`

const TT = (props) =>
  <Tooltip placement="right" {...props}><span>{props.children}</span></Tooltip>


export default columns
