
import { ListSubheader, MenuItem, Select } from '@mui/material'

type CameraOption = {
  label: string
  value: string
  description: string
}

type Props = {
  value: string
  onChange: (value: string) => void
}

export const cameraOptions: CameraOption[] = [{
  label: 'PTZ (Pan-Tilt-Zoom) Camera',
  value: 'rtsp://10.31.81.27:554/profile1/media.smp',
  description: 'A versatile camera that can pan, tilt, and zoom to capture a wide range of views. '
    + 'Ideal for monitoring large areas or tracking moving subjects.'
}, {
  label: 'Remote HTTP-Connected Camera',
  value: 'rtsp://130.202.23.153:554/profile1/media.smp',
  description: 'A camera locatedat ATMOS.'
}]

export const defaultCameraValue = cameraOptions[0].value

const compactSelectSx = {
  fontSize: '0.75rem',
  minWidth: 160,
  '& .MuiSelect-select': {
    display: 'flex',
    alignItems: 'center',
    minHeight: 'unset',
    paddingTop: 0,
    paddingBottom: 0
  },
  '& .MuiSelect-icon': {
    right: -1,
    top: '50%',
    transform: 'translateY(-50%)'
  }
}

const compactHeaderSx = {
  fontSize: '0.75rem',
  fontWeight: 'bold',
  width: '100%',
  background: '#2e76a3',
  color: '#f2f2f2',
  padding: '4px 5px',
  lineHeight: 1.2
}

const compactMenuItemSx = {
  fontSize: '0.75rem'
}

export default function CameraSelector(props: Props) {
  const { value, onChange } = props

  const selectedLabel = cameraOptions.find((camera) => camera.value == value)?.label || value

  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value as string)}
      variant="standard"
      disableUnderline
      renderValue={() => selectedLabel}
      sx={compactSelectSx}
      MenuProps={{
        PaperProps: {
          sx: {
            maxHeight: 340,
            minWidth: 280,
            width: 'fit-content',
            maxWidth: 460,
            '& .MuiMenuItem-root': {
              whiteSpace: 'normal',
              alignItems: 'flex-start'
            }
          }
        }
      }}
    >
      <ListSubheader sx={compactHeaderSx}>
        camera source
      </ListSubheader>
      {cameraOptions.map((camera) => (
        <MenuItem key={camera.value} value={camera.value} sx={compactMenuItemSx}>
          <div>
            <div>{camera.label}</div>
            <div style={{opacity: 0.72, fontSize: '0.68rem', marginTop: 2}}>{camera.description}</div>
          </div>
        </MenuItem>
      ))}
    </Select>
  )
}