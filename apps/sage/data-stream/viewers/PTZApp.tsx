import { ImageCard } from '../../image-search/ImageCard'
import { type Record as BeehiveRecord } from '/components/apis/beehive'
import { Chip } from '@mui/material'
import { parseTimestamp, parseFilename, type ParsedFilename } from './parsers'

type ExtendedRecord = BeehiveRecord & {
  parsedFilename: ParsedFilename
}

function groupByDebugSets(records: ExtendedRecord[]) {
  const items = records.sort((a, b) => {
    const t1 = a.parsedFilename.datetime
    const t2 = b.parsedFilename.datetime

    return parseTimestamp(t1) > parseTimestamp(t2) ? 1 : -1
  })

  const groups = []
  let group = []

  items?.forEach((record) => {
    if (record.parsedFilename.isDebug) {
      groups.push(group)
      group = []
      group.push(record)
    } else { // regular
      group.push(record)
    }
  })

  if (group.length > 0) {
    groups.push(group)
  }

  return groups
}


function renderRecord(record: ExtendedRecord, i: number) {
  const {meta, timestamp, parsedFilename} = record
  const {model} = meta

  const {pan, tilt, zoom, label, confidence, datetime, isDebug} = parsedFilename
  const imageTimestamp = parseTimestamp(datetime)

  return (
    <div key={i} style={{marginRight: 25, marginBottom: 25}}>
      <h3>{
        isDebug ?
          <>
            <div className="flex justify-between">
              <div>Debug</div>
              <div>{`(${pan}°, ${tilt}°, ${zoom}x)`}</div>
            </div>
            <div className="flex justify-between">
              <div></div>
              <small>&nbsp;</small>
            </div>
          </> :
          <>
            <div className="flex justify-between">
              <Chip label={`${label.replace('_', ' ')}`} color="primary" variant="filled" />
              <div>{`(${pan}°, ${tilt}°, ${zoom}x)`}</div>
            </div>
            <div className="flex justify-between">
              <small style={{marginLeft: 8}}>{confidence && `${confidence} confidence`}</small>
              <small className="muted">{model}</small>
            </div>
          </>
      }
      </h3>
      {/* <small>{filename}</small><br/> */}
      <ImageCard obj={{...record, link: record.value}} />
      <div className="flex justify-between">
        <small className="muted">{new Date(timestamp).toLocaleString()}</small>
        <small>{new Date(imageTimestamp).toLocaleString()}</small>
      </div>
    </div>
  )
}


function renderGroup(group: ExtendedRecord[]) {
  return (
    <div className="flex">
      {group.map((record, i) => renderRecord(record, i))}
    </div>
  )
}


type Props = {
  data: BeehiveRecord[]
  activeFilters: boolean
}

export default function PTZYolo(props: Props) {
  const {data, activeFilters} = props

  // Parse filenames once for all records
  const extendedData: ExtendedRecord[] = data.map(record => ({
    ...record,
    parsedFilename: parseFilename(record.meta.filename)
  }))

  const groups = groupByDebugSets(extendedData)

  if (activeFilters) {
    return (
      <div className="flex flex-wrap">
        {extendedData.map((record, i) => renderRecord(record, i))}
      </div>
    )
  }

  return (
    <>
      {groups?.map((records, i) => {
        return (
          <div key={i}>
            {renderGroup(records)}
          </div>
        )
      })}
    </>
  )
}




/**
 * plugin functions for filtering
 */

export function applyFilters(
  data: BeehiveRecord[],
  confidenceFilter: [number, number],
  selectedLabels: string[],
  selectedModels: string[],
  searchQuery: string = ''
) {
  return data.filter(record => {
    const {meta} = record
    const {filename, model} = meta
    const parsed = parseFilename(filename)

    // Debug images don't have confidence values, so exclude them when filtering
    if (parsed.isDebug) {
      return false
    }

    // Apply search query filter
    if (searchQuery.trim().length > 0) {
      const searchMatch = searchQuery.split('|')
        .some(part => {
          if (!part.trim().length) return false
          return parsed.label?.toLowerCase().includes(part.trim().toLowerCase())
        })
      if (!searchMatch) return false
    }

    const conf = Number(parsed.confidence)
    const confidenceMatch = conf >= confidenceFilter[0] && conf <= confidenceFilter[1]

    // Apply label filter if selected
    const labelMatch = selectedLabels.length === 0 || selectedLabels.includes(parsed.label || '')

    // Apply model filter if selected
    const modelMatch = selectedModels.length === 0 || selectedModels.includes(model || '')

    return confidenceMatch && labelMatch && modelMatch
  })
}



export function getFormModel(data: BeehiveRecord[]) {
  const labelCounts: Record<string, number> = {}
  const modelCounts: Record<string, number> = {}
  let minConf = Infinity
  let maxConf = -Infinity

  data.forEach(record => {
    const {meta} = record
    const {filename, model} = meta
    const parsed = parseFilename(filename)

    // Count labels
    if (parsed.label) {
      labelCounts[parsed.label] = (labelCounts[parsed.label] || 0) + 1
    }

    // Count models
    if (model) {
      modelCounts[model] = (modelCounts[model] || 0) + 1
    }

    // Calculate confidence range
    if (parsed.confidence) {
      const confNum = Number(parsed.confidence)
      if (confNum < minConf) {
        minConf = confNum
      }
      if (confNum > maxConf) {
        maxConf = confNum
      }
    }
  })

  // Sort labels by count descending
  const labels = Object.entries(labelCounts).sort((a, b) => b[1] - a[1])

  // Sort models by count descending
  const models = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])

  // Set default confidence range if no values found
  const confidenceRange = minConf === Infinity || maxConf === -Infinity
    ? {minConf: 0, maxConf: 1}
    : {minConf, maxConf}

  return {
    labels,
    models,
    confidenceRange
  }
}


