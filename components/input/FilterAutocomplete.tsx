import { Autocomplete, TextField, Chip, IconButton, Tooltip } from '@mui/material'
import { Sort, SortByAlpha } from '@mui/icons-material'
import { styled } from '@mui/material/styles'

type FilterAutocompleteProps = {
  options: string[]
  value: string[]
  onChange: (newValue: string[]) => void
  counts: Map<string, number>
  sortByCount: boolean
  onSortChange: (sortByCount: boolean) => void
  placeholder: string
  limitTags?: number
  width?: string
}

export default function FilterAutocomplete({
  options,
  value,
  onChange,
  counts,
  sortByCount,
  onSortChange,
  placeholder,
  limitTags = 5,
  width
}: FilterAutocompleteProps) {
  return (
    <FilterChipsContainer width={width}>
      <Autocomplete
        multiple
        size="small"
        options={options}
        value={value}
        onChange={(_, newValue) => onChange(newValue)}
        limitTags={limitTags}
        getOptionLabel={(option) => option}
        fullWidth
        renderOption={(props, option) => {
          const count = counts.get(option) || 0
          return (
            <li {...props} style={{ display: 'flex', justifyContent: 'space-between', ...props.style }}>
              <span>{option}</span>
              <span style={{ fontWeight: 600, color: '#999', marginLeft: '1rem' }}>
                {count.toLocaleString()}
              </span>
            </li>
          )
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  <Tooltip
                    title={sortByCount
                      ? 'Sorted by count (click for A-Z)'
                      : 'Sorted A-Z (click for count)'}
                  >
                    <IconButton
                      size="small"
                      onClick={() => onSortChange(!sortByCount)}
                      sx={{ mr: 0.5 }}
                    >
                      {sortByCount ? <Sort fontSize="small" /> : <SortByAlpha fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              label={option}
              size="small"
              {...getTagProps({ index })}
              key={option}
            />
          ))
        }
        sx={{ flex: 1 }}
      />
    </FilterChipsContainer>
  )
}

const FilterChipsContainer = styled('div')<{ width?: string }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  ${({ width }) => width ? `width: ${width};` : ''}

  @media (max-width: 768px) {
    width: 100% !important;
  }
`
