import { useEffect, useState, useMemo } from 'react'
import {type Record} from '/components/apis/beehive'
import {
  TablePagination, TextField, IconButton, InputAdornment, Slider, Typography,
  Select, MenuItem, FormControl, InputLabel, Chip, Box, Button, Autocomplete } from '@mui/material'
import { useSearchParams } from 'react-router-dom'

import PTZYolo, {
  applyFilters, getFormModel
} from './viewers/PTZApp'

import FilterOpts from '../../../components/input/StyledTimeOpts'
import { ToggleButtonGroup, ToggleButton } from '@mui/material'
import { AnalyticsOutlined, TableRowsOutlined, Clear, FilterList, ExpandLess, ExpandMore } from '@mui/icons-material'
import useDebounce from '/components/hooks/useDebounce'

import JsonURL from '@jsonurl/jsonurl'
import { has } from 'lodash'


type Props = {
  data: Record[]
  showViewer: boolean
  onViewModeChange: (val: boolean) => void
}

export default function CustomViewer(props: Props) {
  const {data, showViewer, onViewModeChange} = props
  const [params, setParams] = useSearchParams()
  const [page, setPage] =  useState(0)

  // Initialize query from URL params
  const viewerParamsStr = params.get('viewer-params')
  const viewerParams = viewerParamsStr ? (JsonURL.parse(viewerParamsStr) as {
    query?: string
    confidenceMin?: number
    confidenceMax?: number
    labels?: string[]
    models?: string[]
    showAdvanced?: boolean
  }) : {}

  const initialQuery = viewerParams?.query || ''
  const initialShowAdvanced = viewerParams?.showAdvanced || false

  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)
  const [filteredData, setFilteredData] = useState<Record[]>(data)
  const [showAdvanced, setShowAdvanced] = useState(initialShowAdvanced)

  // Get form model data (labels, models, confidence range) from data
  const formModel = useMemo(() => getFormModel(data || []), [data])
  const {labels: labelCounts, models: modelCounts, confidenceRange} = formModel

  // Initialize confidence filter from URL params or data range
  const initialConfidenceFilter: [number, number] = [
    viewerParams?.confidenceMin ?? confidenceRange.minConf,
    viewerParams?.confidenceMax ?? confidenceRange.maxConf
  ]
  const [confidenceFilter, setConfidenceFilter] = useState<[number, number]>(initialConfidenceFilter)
  const [selectedLabels, setSelectedLabels] = useState<string[]>(viewerParams?.labels || [])
  const [selectedModels, setSelectedModels] = useState<string[]>(viewerParams?.models || [])

  const hasActiveFilters = () => {
    return !!(debouncedQuery ||
      selectedLabels.length > 0 ||
      selectedModels.length > 0 ||
      confidenceFilter[0] !== confidenceRange.minConf ||
      confidenceFilter[1] !== confidenceRange.maxConf)
  }

  const debouncedSearch = useDebounce(() => {
    setDebouncedQuery(query)
  })

  useEffect(() => {
    debouncedSearch()
  }, [debouncedSearch, query])


  // Update URL params when any filter changes
  useEffect(() => {
    if (hasActiveFilters()) {
      const params: any = {}
      if (query) params.query = query
      if (showAdvanced) params.showAdvanced = showAdvanced
      if (confidenceFilter[0] !== confidenceRange.minConf) params.confidenceMin = confidenceFilter[0]
      if (confidenceFilter[1] !== confidenceRange.maxConf) params.confidenceMax = confidenceFilter[1]
      if (selectedLabels.length > 0) params.labels = selectedLabels
      if (selectedModels.length > 0) params.models = selectedModels

      const viewerParams = JsonURL.stringify(params)
      setParams(prev => {
        const newParams = new URLSearchParams(prev)
        newParams.set('viewer-params', viewerParams)
        return newParams
      }, { replace: true })
    } else {
      setParams(prev => {
        const newParams = new URLSearchParams(prev)
        newParams.delete('viewer-params')
        return newParams
      }, { replace: true })
    }
  }, [
    query, showAdvanced, confidenceFilter, selectedLabels,
    selectedModels, confidenceRange.minConf, confidenceRange.maxConf
  ])


  // Apply all filters whenever any filter value changes
  useEffect(() => {
    if (!hasActiveFilters()) {
      return
    }

    const filtered = applyFilters(data, confidenceFilter, selectedLabels, selectedModels, debouncedQuery)
    setFilteredData(filtered)

    if (debouncedQuery.trim().length > 0) {
      setPage(0)
    }
  }, [debouncedQuery, confidenceFilter, selectedLabels, selectedModels, data])

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value)
  }


  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex gap">
          <ToggleButtonGroup>
            <ToggleButton
              value="show-viewer"
              selected={showViewer}
              onChange={() => onViewModeChange(true)}
            >
              <AnalyticsOutlined fontSize="small" />Custom Viewer
            </ToggleButton>
            <ToggleButton
              value="show-table"
              selected={!showViewer}
              onChange={() => onViewModeChange(false)}
            >
              <TableRowsOutlined fontSize="small"/> Table
            </ToggleButton>
          </ToggleButtonGroup>

          {showViewer &&
            <TextField
              label="Search for label(s)"
              variant="outlined"
              sx={{width: 300}}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={'e.g., "deer|elk|animal"'}
              InputProps={{
                endAdornment: query && (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setQuery('')}
                      edge="end"
                      size="small"
                    >
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          }

          {showViewer &&
            <Button
              startIcon={showAdvanced ? <ExpandLess /> : <ExpandMore />}
              onClick={() => setShowAdvanced(!showAdvanced)}
              sx={{marginLeft: 2}}
            >
              {showAdvanced ? 'Hide Filters' : 'Show Filters'}
            </Button>
          }
        </div>




        {showViewer &&
          <TablePagination
            rowsPerPageOptions={[20]}
            count={filteredData?.length}
            rowsPerPage={20}
            page={page}
            onPageChange={handlePageChange}
          />
        }
      </div>

      {showViewer && showAdvanced &&
        <div className="flex items-end">
          <Autocomplete
            multiple
            options={labelCounts.map(([label]) => label)}
            value={selectedLabels}
            onChange={(_, newValue) => setSelectedLabels(newValue)}
            size="small"
            sx={{width: 250, marginRight: 2}}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Filter by Label"
                InputLabelProps={{ shrink: true }}
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option}
                  label={option.replace(/_/g, ' ')}
                  size="small"
                />
              ))
            }
            renderOption={(props, option) => {
              const count = labelCounts.find(([label]) => label === option)?.[1] || 0
              return (
                <li {...props} key={option}>
                  {option.replace(/_/g, ' ')} ({count})
                </li>
              )
            }}
          />

          <Autocomplete
            multiple
            options={modelCounts.map(([model]) => model)}
            value={selectedModels}
            onChange={(_, newValue) => setSelectedModels(newValue)}
            size="small"
            sx={{width: 250, marginRight: 2}}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Filter by Model"
                InputLabelProps={{ shrink: true }}
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option}
                  label={option}
                  size="small"
                />
              ))
            }
            renderOption={(props, option) => {
              const count = modelCounts.find(([model]) => model === option)?.[1] || 0
              return (
                <li {...props} key={option}>
                  {option} ({count})
                </li>
              )
            }}
          />


          <FormControl sx={{width: 400}}>
            <Typography variant="caption" gutterBottom>
                Confidence Range
            </Typography>
            <div className="flex items-center gap">
              <TextField
                type="number"
                value={confidenceFilter[0]}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  if (!isNaN(val) && val <= confidenceFilter[1]) {
                    setConfidenceFilter([val, confidenceFilter[1]])
                  }
                }}
                inputProps={{
                  min: confidenceRange.minConf,
                  max: confidenceFilter[1],
                  step: 0.01
                }}
                size="small"
                sx={{width: 80}}
              />
              <Slider
                value={confidenceFilter}
                onChange={(_, newValue) => setConfidenceFilter(newValue as [number, number])}
                valueLabelDisplay="auto"
                min={confidenceRange.minConf}
                max={confidenceRange.maxConf}
                step={0.01}
                sx={{flex: 1}}
              />
              <TextField
                type="number"
                value={confidenceFilter[1]}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  if (!isNaN(val) && val >= confidenceFilter[0]) {
                    setConfidenceFilter([confidenceFilter[0], val])
                  }
                }}
                inputProps={{
                  min: confidenceFilter[0],
                  max: confidenceRange.maxConf,
                  step: 0.01
                }}
                size="small"
                sx={{width: 80}}
              />
            </div>
          </FormControl>
        </div>
      }


      {showViewer &&
        <PTZYolo
          data={filteredData.slice(page * 20, (page + 1) * 20)}
          activeFilters={hasActiveFilters()}
        />
      }

      {showViewer &&
        <div className="flex justify-center">
          <div></div>
          <TablePagination
            rowsPerPageOptions={[20]}
            count={filteredData?.length}
            rowsPerPage={20}
            page={page}
            onPageChange={handlePageChange}
          />
        </div>
      }
    </>
  )
}