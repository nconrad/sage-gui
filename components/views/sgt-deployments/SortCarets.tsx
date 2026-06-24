import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

import { type SortDirection } from './types'

type Props = {
  label: string
  isActive: boolean
  sortDirection: SortDirection
  onSort: (direction: SortDirection) => void
  descendingTooltipPlacement?: 'top' | 'bottom'
}

const CARET_BUTTON_SX = {
  p: 0,
  lineHeight: 1,
  width: 18,
  height: 18,
  border: 'none !important',
  boxShadow: 'none !important',
  backgroundColor: 'transparent !important',
  '&:hover': {
    border: 'none !important',
    backgroundColor: 'transparent !important',
  },
}

function caretIconSx(isSelected: boolean, isActive: boolean) {
  return {
    fontSize: '1.2rem',
    color: isActive ? 'primary.main' : 'text.secondary',
    opacity: isSelected ? 1 : (isActive ? 0.65 : 0.45),
  }
}

export default function SortCarets({
  label,
  isActive,
  sortDirection,
  onSort,
  descendingTooltipPlacement = 'top',
}: Props) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <Tooltip title={`Sort ${label} ascending`} placement="top" arrow>
        <span>
          <IconButton
            size="small"
            onClick={() => onSort('asc')}
            sx={CARET_BUTTON_SX}
            aria-label={`Sort ${label} ascending`}
          >
            <ExpandLessIcon sx={caretIconSx(isActive && sortDirection == 'asc', isActive)} />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title={`Sort ${label} descending`} placement={descendingTooltipPlacement} arrow>
        <span>
          <IconButton
            size="small"
            onClick={() => onSort('desc')}
            sx={{ ...CARET_BUTTON_SX, mt: -1.4 }}
            aria-label={`Sort ${label} descending`}
          >
            <ExpandMoreIcon sx={caretIconSx(isActive && sortDirection == 'desc', isActive)} />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  )
}
