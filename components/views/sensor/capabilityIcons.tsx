import {
  BugReportOutlined, RoomOutlined, Thermostat, Compress, GasMeterOutlined,
  Grain, Mic, RouterOutlined, Air, CameraAltOutlined, OpacityOutlined,
  ScienceOutlined, MoreOutlined
} from '@mui/icons-material'

import WbCloudyIcon from '/assets/weathermix.svg'
import Humidity from '/assets/humidity.svg'
import Level from '/assets/level.svg'


/**
 * Mapping of sensor capability names to their corresponding icon components
 */
export const capabilityIcons = {
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
  lorawan: RouterOutlined,
  'Additional Sensors/Capabilities': MoreOutlined,
  'Thermal Camera': CameraAltOutlined
}

/**
 * Get the appropriate icon component for a given capability
 * @param capability - The capability name
 * @returns The icon component or null if not found
 */
export const getCapabilityIcon = (capability: string) => {
  const Icon = capabilityIcons[capability]
  if (!Icon) return null

  // Handle function components (like Humidity)
  if (typeof Icon === 'function' && Icon.name && Icon.name !== 'SvgIcon') {
    return <Icon />
  }
  // Handle MUI icon components
  return <Icon fontSize="small" />
}
