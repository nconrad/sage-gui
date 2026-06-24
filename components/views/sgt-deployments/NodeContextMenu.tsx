import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'

import { ListSubheader } from '/components/layout/Layout'
import useIsStaff from '/components/hooks/useIsStaff'

type Props = {
  open: boolean
  label: string | null
  anchorEl: HTMLElement | null
  anchorPosition: { top: number, left: number } | null
  portalNodeUrl: string | undefined
  grafanaUrl: string
  onClose: () => void
}

export default function NodeContextMenu({
  open,
  label,
  anchorEl,
  anchorPosition,
  portalNodeUrl,
  grafanaUrl,
  onClose,
}: Props) {
  const {isStaff} = useIsStaff()

  return (
    <Menu
      open={open}
      anchorEl={anchorEl}
      anchorReference={anchorPosition ? 'anchorPosition' : 'anchorEl'}
      anchorPosition={anchorPosition || undefined}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    >
      {label && <ListSubheader>{label}</ListSubheader>}
      {portalNodeUrl && (
        <MenuItem
          component="a"
          href={portalNodeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
        >
          Portal node page
        </MenuItem>
      )}
      {isStaff && grafanaUrl && (
        <MenuItem
          component="a"
          href={grafanaUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
        >
          Node status dashboard (Grafana)
        </MenuItem>
      )}
    </Menu>
  )
}
