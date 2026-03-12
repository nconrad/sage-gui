import { Button, ButtonGroup, Tooltip } from '@mui/material'

type ProjectFilterProps = {
  projectFilter: 'all' | 'SAGE' | 'SGT'
  onProjectFilterChange: (value: 'all' | 'SAGE' | 'SGT') => void
  allNodesCount?: number
  sageNodesCount?: number
  sgtNodesCount?: number
}

export default function SageProjectFilter({
  projectFilter,
  onProjectFilterChange,
  allNodesCount,
  sageNodesCount,
  sgtNodesCount
}: ProjectFilterProps) {
  return (
    <ButtonGroup size="small" variant="outlined" sx={{ marginRight: 1 }}>
      <Tooltip title="Show all nodes">
        <Button
          onClick={() => onProjectFilterChange('all')}
          variant={projectFilter === 'all' ? 'contained' : 'outlined'}
        >
          All{allNodesCount != null ? ` (${allNodesCount})` : ''}
        </Button>
      </Tooltip>
      <Tooltip title="Show (newer) Sage Grande Testbed nodes" placement="top">
        <Button
          onClick={() => onProjectFilterChange('SGT')}
          variant={projectFilter === 'SGT' ? 'contained' : 'outlined'}
        >
          SGT{sgtNodesCount != null ? ` (${sgtNodesCount})` : ''}
        </Button>
      </Tooltip>
      <Tooltip title="Show Sage nodes" placement="top">
        <Button
          onClick={() => onProjectFilterChange('SAGE')}
          variant={projectFilter === 'SAGE' ? 'contained' : 'outlined'}
        >
          Sage{sageNodesCount != null ? ` (${sageNodesCount})` : ''}
        </Button>
      </Tooltip>
    </ButtonGroup>
  )
}
