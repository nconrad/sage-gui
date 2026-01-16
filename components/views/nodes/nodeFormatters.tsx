import { useState } from 'react'
import styled from 'styled-components'
import { Link } from 'react-router-dom'

import { IconButton, Badge, Tooltip, Popover, List, ListItem, ListItemText } from '@mui/material'

import {
  BugReportOutlined, CheckRounded, CheckCircleRounded, ReportProblemOutlined,
  PendingOutlined, ErrorOutlineRounded, RoomOutlined, Edit, LaunchRounded,
  Thermostat, Compress, GasMeterOutlined, Grain, Mic, Router, Air,
  CameraAltOutlined, OpacityOutlined, Whatshot, ScienceOutlined,
} from '@mui/icons-material'

import WbCloudyIcon from '/assets/weathermix.svg'
import Humidity from '/assets/humidity.svg'
import Level from '/assets/level.svg'

import { NODE_STATUS_RANGE } from '/components/apis/beehive'
import NodeLastReported from '/components/utils/NodeLastReported'
import Dot from '/components/utils/Dot'

import * as utils from '/components/utils/units'
import * as BK from '/components/apis/beekeeper'
import config from '/config'
import { Box } from '@mui/material'


export function GPSIcon(props: {obj: BK.Node}) {
  const {hasLiveGPS, hasStaticGPS, lat, lng} = props.obj
  const [copied, setCopied] = useState(false)

  const handleCopyGPS = (evt) => {
    evt.stopPropagation()
    if (lat && lng) {
      navigator.clipboard.writeText(`${lat}, ${lng}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const gpsCoords = (lat && lng) ? `${lat}, ${lng}` : 'No coordinates'

  if (hasStaticGPS) {
    return (
      <Tooltip
        placement="top"
        title={
          <>
            Static GPS
            {hasLiveGPS && <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<Dot size="8" /> {'=='} recent live GPS found<br/></>}
            <br/>
            {gpsCoords}<br/>
            <small><i>{copied ? 'Copied!' : 'Click to copy'}</i></small>
          </>
        }
      >
        <IconButton size="small" onClick={handleCopyGPS}>
          {copied ? (
            <CheckRounded fontSize="small" />
          ) : (
            <LiveGPSDot invisible={!hasLiveGPS} color="primary" variant="dot">
              <RoomOutlined fontSize="small"/>
            </LiveGPSDot>
          )}
        </IconButton>
      </Tooltip>
    )
  } else if (!hasStaticGPS && hasLiveGPS) {
    return (
      <Tooltip
        placement="top"
        title={
          <>
            Live GPS&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(no static gps found)<br/>
            <br/>
            {gpsCoords}<br/>
            <small><i>{copied ? 'Copied!  ' : 'Click to copy'}</i></small>
          </>
        }
      >
        <IconButton size="small" onClick={handleCopyGPS}>
          {copied ? (
            <CheckRounded fontSize="small" />
          ) : (
            <RoomOutlined fontSize="small" style={{color: '#36b8ff'}}/>
          )}
        </IconButton>
      </Tooltip>
    )
  }

  return <></>
}


const LiveGPSDot = styled(Badge)`
  .MuiBadge-badge {
    right: 3px;
    top: 2px;
    padding: 0px;
  }
`

const ThermalCameraIcon = () => (
  <div style={{position: 'relative', display: 'inline-flex', alignItems: 'center'}}>
    <CameraAltOutlined fontSize='small'/>
    <Whatshot
      fontSize="inherit"
      sx={{
        position: 'absolute',
        top: -2,
        right: -2,
        background: ({palette}) => palette.background.paper,
        color: ({palette}) => palette.error.main,
      }}
    />
  </div>
)


// Mapping of capability keywords to icons
const capabilityIcons = {
  Camera: CameraAltOutlined,
  Microphone: Mic,
  GPS: RoomOutlined,
  Precipitation: WbCloudyIcon,
  Temperature: Thermostat,
  Pressure: Compress,
  Humidity: () => <Humidity />,
  Gas: GasMeterOutlined,
  'Particulate Matter': Grain,
  Wind: Air,
  Moisture: OpacityOutlined,
  Biological: BugReportOutlined,
  Chemical: ScienceOutlined,
  Accelerometer: Level,
  lorawan: Router,
}

const capabilityLabels = {
  Pa: 'Pressure',
  RH: 'Humidity',
  Precip: 'Precipitation',
  PM: 'Particulate Matter'
}

export function SensorIcons({data}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [popoverSensors, setPopoverSensors] = useState<{hw_model: string, isThermal: boolean}[]>([])
  const [popoverCapability, setPopoverCapability] = useState<string>('')

  // Count sensors by capability and track thermal cameras
  const capabilityCounts = new Map<string, string[]>()
  const sensorCapabilityMap = new Map<string, Set<string>>()

  if (!data || data.length === 0) return <>-</>

  data.forEach(sensor => {
    sensorCapabilityMap.set(sensor.hw_model, new Set(sensor.capabilities))
    sensor.capabilities?.forEach(cap => {
      // Merge Camera and Thermal Camera into Camera
      const normalizedCap = cap === 'Thermal Camera' ? 'Camera' : cap
      if (!capabilityCounts.has(normalizedCap)) {
        capabilityCounts.set(normalizedCap, [])
      }
      if (!capabilityCounts.get(normalizedCap).includes(sensor.hw_model)) {
        capabilityCounts.get(normalizedCap).push(sensor.hw_model)
      }
    })
  })

  const hasThermalCamera = data.some(sensor =>
    sensor.capabilities?.includes('Thermal Camera')
  )

  const handleClick = (event: React.MouseEvent<HTMLElement>, capability: string, sensors: string[]) => {
    event.stopPropagation()
    if (sensors && sensors.length > 0) {
      setAnchorEl(event.currentTarget)
      // For Camera capability, check if each sensor is thermal
      const sensorsWithType = sensors.map(hw_model => ({
        hw_model,
        isThermal: sensorCapabilityMap.get(hw_model)?.has('Thermal Camera') || false
      }))
      setPopoverSensors(sensorsWithType)
      setPopoverCapability(capability)
    }
  }

  const handleClose = () => {
    setAnchorEl(null)
    setPopoverSensors([])
    setPopoverCapability('')
  }

  const open = Boolean(anchorEl)

  return (
    <>
      <div style={{display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center'}}>
        {Object.keys(capabilityIcons).map(capability => {
          const Icon = capabilityIcons[capability]
          const sensors = capabilityCounts.get(capability)
          const count = sensors ? sensors.length : 0
          const isPresent = count > 0
          const label = capabilityLabels[capability] || capability

          // Use ThermalCameraIcon for Camera if any thermal cameras exist
          const DisplayIcon = (capability === 'Camera' && hasThermalCamera) ? ThermalCameraIcon : Icon

          // For Camera capability, count regular vs thermal
          let cameraBreakdown = ''
          if (capability === 'Camera' && isPresent) {
            const thermalCount = sensors.filter(hw_model =>
              sensorCapabilityMap.get(hw_model)?.has('Thermal Camera')
            ).length
            const regularCount = count - thermalCount
            if (thermalCount > 0 && regularCount > 0) {
              cameraBreakdown = ` (${regularCount} regular, ${thermalCount} thermal)`
            } else if (thermalCount > 0) {
              cameraBreakdown = ` (${thermalCount} thermal)`
            }
          }

          return (
            <Tooltip
              key={capability}
              title={
                isPresent ? (
                  <>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '16px'
                    }}>
                      <span>
                        <strong>{label}</strong> {count > 1 && `(${count} total)`}
                      </span>
                      {cameraBreakdown && (
                        <strong style={{whiteSpace: 'nowrap'}}>{cameraBreakdown.trim().replace(/[()]/g, '')}</strong>
                      )}
                    </div>
                    <small>{sensors.join(', ')}</small>
                    <br/><small><i>Click for details</i></small>
                  </>
                ) : (
                  <><strong>{label}</strong><br/><small>(not present)</small></>
                )
              }
              placement="top"
              slotProps={{
                tooltip: {
                  sx: { fontSize: '.8rem' }
                }
              }}
            >
              <Box
                onClick={(e) => handleClick(e, capability, sensors)}
                sx={(theme) => ({
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  minWidth: '28px',
                  position: 'relative',
                  opacity: isPresent ? 1 : 0.3,
                  filter: isPresent ? 'none' : 'grayscale(100%)',
                  cursor: isPresent ? 'pointer' : 'default',

                  color: isPresent ? theme.palette.mode === 'dark' ?
                    '#fff' : '#000' : theme.palette.mode === 'dark' ? '#555' : '#aaa'

                })}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <DisplayIcon
                    fontSize="small"
                  />
                  {!isPresent && (
                    <Box
                      sx={(theme) => ({
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: '120%',
                        height: '2px',
                        bgcolor: theme.palette.mode === 'dark' ? '#555' : '#aaa',
                        transform: 'translate(-50%, -50%) rotate(-45deg)',
                        pointerEvents: 'none'
                      })}
                    />
                  )}
                </Box>
                {count > 1 && <Box sx={{fontSize: '0.7em', fontWeight: 500, minWidth: '16px'}}>x{count}</Box>}
                {count <= 1 && <Box sx={{fontSize: '0.7em', minWidth: '16px', visibility: 'hidden'}}>x1</Box>}
              </Box>
            </Tooltip>
          )
        })}
      </div>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <List dense sx={{ minWidth: 200, py: 1 }}>
          <ListItem sx={{ pb: 1, borderBottom: 1, borderColor: 'divider' }}>
            <ListItemText
              primary={capabilityLabels[popoverCapability] || popoverCapability}
              primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9em' }}
            />
          </ListItem>
          {popoverSensors.map((sensor, idx) => {
            const SensorIcon = popoverCapability === 'Camera'
              ? (sensor.isThermal ? ThermalCameraIcon : CameraAltOutlined)
              : null

            return (
              <ListItem
                key={idx}
                component={Link}
                to={`/sensors/${sensor.hw_model}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  '&:hover': {
                    bgcolor: 'action.hover',
                    textDecoration: 'none'
                  }
                }}
              >
                {SensorIcon && (
                  <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 24 }}>
                    <SensorIcon fontSize="small" />
                  </Box>
                )}
                <ListItemText
                  primary={sensor.hw_model}
                  primaryTypographyProps={{ fontSize: '0.85em' }}
                />
              </ListItem>
            )
          })}
        </List>
      </Popover>
    </>
  )
}


export function status(val, obj) {
  if (!obj.elapsedTimes) {
    return (
      <Tooltip
        title={`No sys.uptime(s) in ${NODE_STATUS_RANGE}`}
        componentsProps={{tooltip: {sx: {background: '#000'}}}}
        placement="top">
        <ReportProblemOutlined className="inactive status-icon" />
      </Tooltip>
    )
  }

  let icon
  if (val == 'reporting')
    icon = <CheckCircleRounded className="success status-icon" />
  else
    icon = <ErrorOutlineRounded className="failed status-icon" />

  return (
    <Tooltip
      title={
        <>
          Last reported metric<br/>
          <NodeLastReported computes={obj.computes} elapsedTimes={obj.elapsedTimes} />
        </>
      }
      componentsProps={{tooltip: {sx: {background: '#000'}}}}
      placement="top"
    >
      {icon}
    </Tooltip>
  )
}


const phaseNotes = {
  Maintenance: 'In Maintenance'
}

export function statusWithPhase(val, obj) {
  const phase = obj.phase
  const phaseTitle = phaseNotes[phase] || phase

  let icon
  if (phase == 'Deployed' && val == 'reporting')
    icon = <CheckCircleRounded className="success status-icon" />
  else if (phase == 'Deployed' && val != 'reporting')
    icon = <ErrorOutlineRounded className="failed status-icon" />
  else if (phase == 'Maintenance')
    icon = <ReportProblemOutlined className="in-progress status-icon" />
  else if (phase == 'Awaiting Deployment')
    icon = <PendingOutlined className="inactive status-icon" />
  else
    icon = <PendingOutlined className="inactive status-icon" />

  return (
    <Tooltip
      title={
        <>
          <b>{phaseTitle}</b><br/>
          {phase == 'Deployed' &&
            <div>
              <br/>
              Last reported metrics:<br/>
              {obj.elapsedTimes ?
                <NodeLastReported computes={obj.computes} elapsedTimes={obj.elapsedTimes} /> :
                `No sys.uptime(s) in ${NODE_STATUS_RANGE}`
              }
            </div>
          }
        </>
      }
      componentsProps={{tooltip: {sx: {background: '#000'}}}}
      placement="top"
    >
      {icon}
    </Tooltip>
  )
}


export function vsn(vsn, node) {
  const {site_id} = node
  return <Link to={`/node/${vsn}`}>
    {site_id || vsn}
  </Link>
}

export function vsnLink(vsn, node: BK.Node) {
  const {site_id} = node
  return <Link to={`/node/${vsn}`}>
    {site_id || vsn} <small className="muted">{site_id && `${vsn}` }</small>
  </Link>
}

export function vsnLinkWithEdit(vsn, node: BK.Node) {
  const {site_id} = node
  return <div className="flex items-center">
    <Link to={`/node/${vsn}`}>
      {site_id || vsn} <small className="muted">{site_id && `${vsn}` }</small>
    </Link>
    <Tooltip
      placement="top"
      title={<>Edit node meta <LaunchRounded style={{fontSize: '1.1em'}}/></>}
      className="edit-btn" // show/hide on hover with css
    >
      <IconButton
        href={`${config.auth}/admin/manifests/nodedata/${node.id}`}
        onClick={(evt) => evt.stopPropagation()}
        target="_blank" rel="noreferrer" size="small">
        <Edit fontSize="small"/>
      </IconButton>
    </Tooltip>
  </div>
}


export function vsnLinkNameOnly(vsn, node: BK.Node) {
  const {site_id} = node
  return <Link to={`/node/${vsn}`}>
    {site_id || vsn}
  </Link>
}

export function vsnToDisplayName(vsn, node: BK.Node) {
  const {site_id} = node
  return <>
    {site_id || vsn}&nbsp;<small className="muted">{site_id && vsn}</small>
  </>
}

export function vsnToDisplayStr(vsn, site_id) {
  return `${site_id || vsn}${site_id ? ` | ${vsn}` : ''}`
}

export function vsnToDisplayStrAlt(vsn, site_id) {
  return `${site_id || vsn}${site_id ? ` (${vsn})` : ''}`
}

export function focus(focus, {partner}) {
  return (!focus && !partner) ? '-' :
    `${focus ? focus : ''}${partner ? ` (${partner})` : ''}`
}

export function gps(_, obj, newline = false) {
  return <div className="flex items-center">
    <span className="gps-icon"><GPSIcon obj={obj} /></span>

    {(!obj.lat || !obj.lng) ?
      '-' :
      `${obj.lat},` + (newline ? '\n' : '') + `${obj.lng}`
    }
  </div>
}



export function lastUpdated(elapsedTimes, obj) {
  if (!elapsedTimes) return '-'

  return <NodeLastReported computes={obj.computes} elapsedTimes={elapsedTimes} />
}


export function uptimes(val) {
  if (!val) return '-'

  return Object.keys(val).map(host =>
    <div key={host}>{utils.prettyTime(val[host])}</div>
  )
}

// todo(nc): use new /nodes endpoint?
export function modem(_, obj) {
  const hwModel = obj.modem_model
  return (
    <>
      <small className="muted font-bold">
        {obj.modem_carrier ?
          'Cellular Connected' :
          (hwModel ? <i>No Sim Configured</i> : '-')
        }
      </small>
      <div>
        {hwModel && <Link to={`/node/${obj.vsn}?tab=peripherals`}>{hwModel}</Link>}
      </div>
    </>
  )
}

// details on a sim card for a node
export function modemSim(_, obj: BK.Node) {
  return (
    <>
      <small className="muted"><b>{obj.modem_carrier_name}</b></small>
      <div>
        {obj.modem_carrier || '-'}{' '}
        {obj.modem_sim && <span className="muted">{obj.modem_sim}</span>}
      </div>
    </>
  )
}

type SensorsProps = {
  data: BK.Node['sensors'] | BK.Node['computes']
  path?: string  // url path if avail; e.g., /sesnors/
}

export function HardwareListSimple(props: SensorsProps) {
  const {data, path} = props

  if (!data.length) return <>-</>

  const len = data.length

  return (
    <HardwareRoot>
      {data.map((sensor, i) => {
        const {hw_model, name} = sensor
        return (
          <span key={i}>
            <Tooltip placement="top" title={name}>
              {path ?
                <Link to={`${path}${hw_model}`}>
                  {hw_model}
                </Link> :
                <span>{hw_model}</span>
              }
            </Tooltip>
            {i < len - 1  && ', '}
          </span>
        )
      })
      }
    </HardwareRoot>
  )
}



const HardwareRoot = styled.ul`
  padding: 0;
  font-size: 9pt;
  list-style: none;
  li {
    white-space: nowrap;
  }
`

const capabilityAbbrev = {
  'Temperature': 'Temp',
  'Humidity': 'RH',
  'Pressure': 'Pa',
  'Air Quality': 'AQ',
  'Particulate Matter': 'PM',
  'Wind Speed': 'Wind',
  'Wind Direction': 'Dir',
  'Precipitation': 'Precip',
  'Solar Radiation': 'Solar',
  'Microphone': 'Mic'
}


export function HardwareList(props: SensorsProps) {
  const {data, path} = props

  if (!data.length) return <>-</>

  return (
    <HardwareRoot style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
      {data.map((sensor, i) => {
        const {hw_model, name, capabilities} = sensor
        return (
          <div key={i}>
            <Tooltip placement="top" title={name}>
              {path ?
                <Link to={`${path}${hw_model}`}>
                  {hw_model}
                </Link> :
                <span>{hw_model}</span>
              }
            </Tooltip><br/>
            <span className="muted" style={{fontSize: '8pt'}}>
              {capabilities.map(v => capabilityAbbrev[v] || v).join(', ')}
            </span>
          </div>
        )
      })
      }
    </HardwareRoot>
  )
}


const TT = (props) =>
  <Tooltip placement="right" {...props}><span>{props.children}</span></Tooltip>



/**
 * helpers for admin listing of sensors by typical WSN positions; todo(nc): remove
 */

export function topSensors(v, obj) {
  const {sensors} = obj
  const sens = sensors.filter(({name}) => name.match(/top|raingauge/gi))

  return <HardwareRoot>
    {sens.map(({name, hw_model, hardware}, i) =>
      <li key={i}>
        <TT title={`${name} | ${hardware}`}>
          <Link to={`/sensors/${hw_model}`}>{hw_model}</Link>
        </TT>
      </li>
    )}
  </HardwareRoot>
}



export function bottomSensors(v, obj) {
  const {sensors} = obj
  const sens = sensors.filter(({name}) => name.match(/bottom/gi))

  return <HardwareRoot>
    {sens.map(({name, hw_model, hardware}, i) =>
      <li key={i}>
        <TT title={`${name} | ${hardware}`}>
          <Link to={`/sensors/${hw_model}`}>{hw_model}</Link>
        </TT>
      </li>
    )}
  </HardwareRoot>
}



export function leftSensors(v, obj) {
  const {sensors} = obj
  const sens = sensors.filter(({name}) => name?.match(/left/gi))

  return <HardwareRoot>
    {sens.map(({name, hw_model, hardware}, i) =>
      <li key={i}>
        <TT title={`${name} | ${hardware}`}>
          <Link to={`/sensors/${hw_model}`}>{hw_model}</Link>
        </TT>
      </li>
    )}
  </HardwareRoot>
}



export function rightSensors(v, obj) {
  const {sensors} = obj
  const sens = sensors.filter(({name, scope}) =>
    (name.match(/right/gi) || (scope || '').match(/^rpi$/i)) && !name.match(/raingauge/gi)
  )

  return <HardwareRoot>
    {sens.map(({name, hw_model, hardware}, i) =>
      <li key={i}>
        <TT title={`${name} | ${hardware}`}>
          <Link to={`/sensors/${hw_model}`}>{hw_model}</Link>
        </TT>
      </li>
    )}
  </HardwareRoot>
}



export function additionalSensors(v, obj) {
  const {sensors} = obj
  const sens = sensors.filter(({name}) =>
    !name?.match(/top|bottom|left|right|gps|bme280|microphone|raingauge|bme680/gi)
  )

  return <HardwareRoot>
    {sens.map(({name, hw_model, hardware}, i) =>
      <li key={i}>
        <TT title={`${name} | ${hardware}`}>
          <Link to={`/sensors/${hw_model}`}>{hw_model}</Link>
        </TT>
      </li>
    )}
  </HardwareRoot>
}

