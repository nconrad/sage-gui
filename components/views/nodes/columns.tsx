/* eslint-disable react/display-name */
import settings from '/components/settings'
import * as formatters from '/components/views/nodes/nodeFormatters'
import type { Column } from '/components/table/Table'
import type { Node } from '/components/apis/beekeeper'


const PROJECT = settings.project?.toLowerCase()


const columns: Column<Node>[] = [{
  id: 'status',
  label: 'Status',
  format: formatters.statusWithPhase,
  width: '1px'
}, {
  id: 'vsn',
  label: 'Node',
  format: formatters.vsnLinkWithEdit, // vsnLinkWithEdit is used if permissions are found,
  width: '138px'
}, {
  id: 'type',
  label: 'Type',
  hide: PROJECT != 'sage'
}, {
  id: 'focus',
  label: 'Focus',
  format: formatters.focus
}, {
  id: 'elapsedTimes',
  label: 'Last Reported Metrics',
  format: formatters.lastUpdated,
  hide: true
}, {
  id: 'uptimes',
  label: 'Uptime',
  format: formatters.uptimes,
  hide: true
}, {
  id: 'city',
  label: 'City',
  hide: true
}, {
  id: 'state',
  label: 'State',
  format: (val, obj) =>
    <div className="flex items-center">
      <formatters.GPSIcon obj={obj} />&nbsp;
      {val || '-'}
    </div>
}, {
  id: 'gps',
  label: 'GPS',
  format: formatters.gps,
  dlFormat: (_, obj) => (obj.lat && obj.lng) ? `${obj.lat}, ${obj.lng}` : '',
  hide: true
}, {
  id: 'alt',
  label: 'Elevation (m)',
  format: (val) => {
    return val || '-'
  },
  hide: true
}, {
  id: 'sensors',
  label: 'Sensors',
  format: (val) => <formatters.HardwareList data={val} path="/sensors/" />,
  dlFormat: (val) => val.map(v => v.hw_model).join(', '),
  hide: true
}, {
  id: 'sensorIcons',
  label: 'Sensor Capabilities',
  format: (_, obj) => <formatters.SensorIcons data={obj.sensors} />,
  dlFormat: (_, obj) => {
    const caps = new Set()
    obj.sensors?.forEach(s => s.capabilities?.forEach(c => caps.add(c)))
    return Array.from(caps).sort().join(', ')
  }
}, {
  id: 'sensorModels',
  label: 'Sensor Models',
  format: (_, obj) => <formatters.HardwareListSimple data={obj.sensors} path="/sensors/" />,
  dlFormat: (_, obj) => obj.sensors.map(v => v.hw_model).join(', '),
  hide: true
},{
  id: 'sensorCapabilities',
  label: 'Sensor Capabilities',
  format: (val) => val.join(', '),
  dlFormat: (val) => val.join(', '),
  hide: true
}, {
  id: 'computes',
  label: 'Computes',
  format: (val) => <formatters.HardwareList data={val} />,
  dlFormat: (val) => val.map(v => v.hw_model).join(', '),
  width: '200px',
  hide: true
}, {
  id: 'commissioned_at',
  label: 'Commission Time',
  hide: true,
  format: (val) => val ? new Date(val).toLocaleString() : '-'
}, {
  id: 'modem_model',
  label: 'Modem',
  format: formatters.modem,
  hide: true
}, {
  id: 'modem_sim',
  label: 'Modem Sim',
  format: formatters.modemSim,
  hide: true
}]


if (PROJECT != 'sage') {
  columns.splice(4, 0, {
    id: 'phase',
    label: 'Phase',
    hide: true
  })
}

export default columns


