import {
  Divider,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  styled
} from '@mui/material'
import { toggleButtonGroupClasses } from '@mui/material/ToggleButtonGroup'

type ProjectFilterProps = {
  projectFilter: 'all' | 'SAGE' | 'SGT'
  onProjectFilterChange: (value: 'all' | 'SAGE' | 'SGT') => void
  allNodesCount?: number
  sageNodesCount?: number
  sgtNodesCount?: number
  showSGTStatusButton?: boolean
  onSGTStatusClick?: () => void
  isSGTStatusActive?: boolean
}

const StyledToggleButtonGroup = styled(ToggleButtonGroup)(({ theme }) => ({
  [`& .${toggleButtonGroupClasses.grouped}`]: {
    margin: theme.spacing(0, 0.5),
    border: 0,
    borderRadius: theme.shape.borderRadius,
    paddingTop: theme.spacing(0.25),
    paddingBottom: theme.spacing(0.25),
    '&.Mui-selected, &.Mui-selected:hover': {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
    },
    [`&.${toggleButtonGroupClasses.disabled}`]: {
      border: 0,
    },
  },
  [`& .${toggleButtonGroupClasses.middleButton},& .${toggleButtonGroupClasses.lastButton}`]: {
    marginLeft: -1,
    borderLeft: '1px solid transparent',
  },
}))

export default function SageProjectFilter({
  projectFilter,
  onProjectFilterChange,
  allNodesCount,
  sageNodesCount,
  sgtNodesCount,
  showSGTStatusButton = false,
  onSGTStatusClick,
  isSGTStatusActive = false,
}: ProjectFilterProps) {
  return (
    <Paper
      elevation={0}
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        height: '36.5px',
        border: `1px solid ${theme.palette.primary.main}`,
        borderRadius: 1,
        flexWrap: 'wrap',
        marginRight: 1,
      })}
    >
      <StyledToggleButtonGroup
        size="small"
        exclusive
        value={isSGTStatusActive ? null : projectFilter}
        onChange={(_, next: 'all' | 'SAGE' | 'SGT' | null) => {
          if (next) onProjectFilterChange(next)
        }}
        aria-label="project filter"
      >
        <Tooltip title="Show all nodes" placement="top">
          <ToggleButton value="all" aria-label="all nodes" size="small">
            All{allNodesCount != null ? ` (${allNodesCount})` : ''}
          </ToggleButton>
        </Tooltip>
        <Tooltip title="Show Sage Grande Testbed nodes (newer)" placement="top">
          <ToggleButton value="SGT" aria-label="sgt nodes" size="small">
            SGT{sgtNodesCount != null ? ` (${sgtNodesCount})` : ''}
          </ToggleButton>
        </Tooltip>
        <Tooltip title="Show Sage nodes (legacy)" placement="top">
          <ToggleButton value="SAGE" aria-label="sage nodes" size="small">
            Sage{sageNodesCount != null ? ` (${sageNodesCount})` : ''}
          </ToggleButton>
        </Tooltip>
      </StyledToggleButtonGroup>

      {showSGTStatusButton && (
        <>
          <Divider flexItem orientation="vertical" sx={{ mx: 0.5, my: 1, borderColor: 'primary.main' }} />

          <Tooltip title="Show the Sage Grande node status timeline" placement="top">
            <StyledToggleButtonGroup
              size="small"
              exclusive
              value={isSGTStatusActive ? 'SGT_STATUS' : null}
              onChange={() => onSGTStatusClick?.()}
              aria-label="sgt status filter"
            >
              <ToggleButton value="SGT_STATUS" aria-label="SGT Status" size="small">
                SGT Status
              </ToggleButton>
            </StyledToggleButtonGroup>
          </Tooltip>
        </>
      )}
    </Paper>
  )
}
