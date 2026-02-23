import { Button, ButtonGroup, Tooltip } from '@mui/material'

type ProjectFilterProps = {
  projectFilter: 'all' | 'SAGE' | 'SGT'
  onProjectFilterChange: (value: 'all' | 'SAGE' | 'SGT') => void
  allNodesCount: number
  sageNodesCount: number
  sgtNodesCount: number
}

export default function SageProjectFilter({
  projectFilter,
  onProjectFilterChange,
  allNodesCount,
  sageNodesCount,
  sgtNodesCount
}: ProjectFilterProps) {
  return (
    <ButtonGroup size="small" variant="outlined">
      <Tooltip title="Show all nodes">
        <Button
          onClick={() => onProjectFilterChange('all')}
          variant={projectFilter === 'all' ? 'contained' : 'outlined'}
        >
          All ({allNodesCount})
        </Button>
      </Tooltip>
      <Tooltip title="Show (older) Sage nodes" placement="top">
        <Button
          onClick={() => onProjectFilterChange('SAGE')}
          variant={projectFilter === 'SAGE' ? 'contained' : 'outlined'}
        >
          Sage ({sageNodesCount})
        </Button>
      </Tooltip>
      <Tooltip title="Show (newer) Sage Grande Testbed nodes" placement="top">
        <Button
          onClick={() => onProjectFilterChange('SGT')}
          variant={projectFilter === 'SGT' ? 'contained' : 'outlined'}
        >
          SGT ({sgtNodesCount})
        </Button>
      </Tooltip>
    </ButtonGroup>
  )
}
