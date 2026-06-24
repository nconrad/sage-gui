import { type ChangeEvent } from 'react'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Tooltip from '@mui/material/Tooltip'
import UndoIcon from '@mui/icons-material/UndoRounded'
import { styled } from '@mui/material'

import FilterMenu from '/components/FilterMenu'
import Checkbox from '/components/input/Checkbox'
import SageProjectFilter from '/apps/sage/dashboard/SageProjectFilter'
import { type FilterState } from '/components/views/statusDataUtils'

type Option = {
  id: string,
  label: string,
  subText?: string
}

type FilterOptions = {
  projects?: Option[],
  partners?: Option[],
  focuses?: Option[],
  cities?: Option[],
  states?: Option[],
  sensors?: Option[]
}

type Props = {
  className?: string,
  data: {project?: string}[] | null,
  projectFilter: 'all' | 'SAGE' | 'SGT',
  onProjectFilterChange: (value: 'all' | 'SAGE' | 'SGT') => void,
  showSGTStatusButton?: boolean,
  onSGTStatusClick?: () => void,
  isSGTStatusActive?: boolean,
  filterOptions: FilterOptions,
  isMyNodes: boolean,
  filterState: FilterState,
  onFilterChange: (field: string, vals: Option[]) => void,
  allNodes: boolean,
  showAll: boolean,
  onShowAllChange: (evt: ChangeEvent<HTMLInputElement>) => void,
  onClearFilters: () => void,
}

export default function NodesFilterCtrls({
  className,
  data,
  projectFilter,
  onProjectFilterChange,
  showSGTStatusButton = false,
  onSGTStatusClick,
  isSGTStatusActive = false,
  filterOptions,
  isMyNodes,
  filterState,
  onFilterChange,
  allNodes,
  showAll,
  onShowAllChange,
  onClearFilters,
}: Props) {
  const activeFilterCount = Object.values(filterState).reduce((sum, vals) => sum + vals.length, 0)
  const hasActiveFilters = activeFilterCount > 0

  return (
    <FilterControls className={className}>
      {data &&
        <SageProjectFilter
          projectFilter={projectFilter}
          onProjectFilterChange={onProjectFilterChange}
          showSGTStatusButton={showSGTStatusButton}
          onSGTStatusClick={onSGTStatusClick}
          isSGTStatusActive={isSGTStatusActive}
          sgtNodesCount={data.filter((node: {project?: string}) => node.project === 'SGT').length}
          sageNodesCount={data.filter((node: {project?: string}) => node.project === 'SAGE').length}
        />
      }

      {filterOptions.projects && isMyNodes &&
        <FilterMenu
          label="My Projects"
          headerText="Filter by projects"
          options={filterOptions.projects}
          value={filterState.project || []}
          onChange={vals => onFilterChange('project', vals as Option[])}
          noSelectedSort
        />
      }


      {filterOptions.partners &&
        <FilterMenu
          label="Partner"
          options={filterOptions.partners.map(opt => ({id: opt.id, label: opt.subText || opt.label}))}
          value={filterState.partner || []}
          onChange={vals => onFilterChange('partner', vals as Option[])}
          noSelectedSort
        />
      }

      {filterOptions.focuses &&
        <FilterMenu
          label="Focus"
          options={filterOptions.focuses}
          value={filterState.focus || []}
          onChange={vals => onFilterChange('focus', vals as Option[])}
          noSelectedSort
        />
      }

      {filterOptions.cities &&
        <FilterMenu
          label="City"
          options={filterOptions.cities}
          value={filterState.city || []}
          onChange={vals => onFilterChange('city', vals as Option[])}
        />
      }

      {filterOptions.states &&
        <FilterMenu
          label="State"
          options={filterOptions.states}
          value={filterState.state || []}
          onChange={vals => onFilterChange('state', vals as Option[])}
        />
      }

      {filterOptions.sensors &&
        <FilterMenu
          label="Sensors"
          options={filterOptions.sensors}
          value={filterState.sensor || []}
          onChange={vals => onFilterChange('sensor', vals as Option[])}
        />
      }

      {!allNodes &&
        <Tooltip
          sx={{mx: 1}}
          placement="top"
          title={
            <>Show nodes which are in maintenance, pending deployment, or not reporting.</>
          }
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={showAll}
                onChange={(evt) => onShowAllChange(evt)}
              />
            }
            label="Show all"
          />
        </Tooltip>
      }

      {hasActiveFilters &&
        <>
          <VertDivider />
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={onClearFilters}
            style={{backgroundColor: '#1c8cc9'}}
            startIcon={<UndoIcon />}
          >
            Clear {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}
          </Button>
        </>
      }
    </FilterControls>
  )
}

const VertDivider = () =>
  <Divider orientation="vertical" flexItem style={{margin: '5px 15px 5px 15px' }} />

const FilterControls = styled('div')`
  margin-left: 1.5em;
`
