import { type ReactNode, useState } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { LABEL_FIELD_OPTIONS, type LabelFieldId, type SortDirection, type SortOptionId } from './types'
import { DeleteOutline } from '@mui/icons-material'
import SortCarets from './SortCarets'

type Props = {
  labelFields: LabelFieldId[]
  activeSortId: SortOptionId
  sortDirection: SortDirection
  onSort: (id: SortOptionId, direction: SortDirection) => void
  onRemoveLabel: (id: LabelFieldId) => void
}

type CaretColumnProps = {
  label: string
  sortId: SortOptionId
  activeSortId: SortOptionId
  sortDirection: SortDirection
  onSort: (id: SortOptionId, direction: SortDirection) => void
  labelColor?: string
  children?: ReactNode
}

function CaretColumn({ label, sortId, activeSortId, sortDirection, onSort, children }: CaretColumnProps) {
  const isActive = activeSortId == sortId

  return (
    <>
      <Box sx={{ position: 'relative', height: '2.2rem', overflow: 'visible', width: '100%' }}>
        <Box
          component="span"
          sx={{
            position: 'absolute',
            bottom: 2,
            left: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.15,
            transform: 'rotate(-45deg)',
            transformOrigin: 'left bottom',
            whiteSpace: 'nowrap',
          }}
        >
          <Typography
            component="span"
            variant="caption"
            sx={{
              fontSize: '0.74rem',
              fontWeight: isActive ? 700 : 600,
              color: isActive ? 'primary.main' : 'text.secondary',
              lineHeight: 1,
            }}
          >
            {label}
          </Typography>
          {children}
        </Box>
      </Box>
      <SortCarets
        label={label}
        isActive={isActive}
        sortDirection={sortDirection}
        onSort={(direction) => onSort(sortId, direction)}
      />
    </>
  )
}

export default function SortStrip({ labelFields, activeSortId, sortDirection, onSort, onRemoveLabel }: Props) {
  const [hoveredCol, setHoveredCol] = useState<LabelFieldId | null>(null)

  return (
    <Box
      sx={{
        display: 'flex',
        mb: -6,
        ml: -0.5,
        px: 0,
        gap: 0,
        alignItems: 'flex-start',
        position: 'relative',
        zIndex: 2,
        pointerEvents: 'none'
      }}
    >
      <Box sx={{ display: 'flex', gap: 4, pointerEvents: 'auto' }}>
        {LABEL_FIELD_OPTIONS.filter((option) => labelFields.includes(option.id)).map((option) => {
          const sortLabel = option.id == 'site_id' ? 'Site' : option.label

          return (
            <Box
              key={option.id}
              onMouseEnter={() => setHoveredCol(option.id)}
              onMouseLeave={() => setHoveredCol(null)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                borderRadius: 0.75,
                px: 0.25,
                py: 0.15
              }}
            >
              <CaretColumn
                label={sortLabel}
                sortId={option.id}
                activeSortId={activeSortId}
                sortDirection={sortDirection}
                onSort={onSort}
              >
                {hoveredCol === option.id && (
                  <Tooltip title={`Remove ${sortLabel} label`} placement="top" arrow>
                    <IconButton
                      size="small"
                      onClick={() => onRemoveLabel(option.id)}
                      sx={{
                        p: 0,
                        lineHeight: 1,
                        color: 'text.secondary',
                        ml: 0.15,
                        '&:hover': { color: 'error.main' },
                      }}
                      aria-label={`Remove ${sortLabel} label`}
                    >
                      <DeleteOutline sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  </Tooltip>
                )}
              </CaretColumn>
            </Box>
          )
        })}
      </Box>

    </Box>
  )
}
