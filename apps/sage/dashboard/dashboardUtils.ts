import * as BK from '/components/apis/beekeeper'

type RollupData = {
  [vsn: string]: {
    [plugin: string]: Array<{
      timestamp: string
      value: number
      meta: {
        plugin: string
        vsn: string
        [key: string]: unknown
      }
    }>
  }
}

type AggregatedRecord = {
  timestamp: string
  value: number
  meta: Record<string, unknown>
}

type TimelineData = {
  [label: string]: AggregatedRecord[]
}

/**
 * Filters rollup data to only include specified nodes
 */
export function filterDataByNodes(data: RollupData, nodes: BK.Node[]): RollupData {
  const userVSNs = new Set(nodes.map(node => node.vsn))
  const filteredData: RollupData = {}

  Object.keys(data).forEach(vsn => {
    if (userVSNs.has(vsn as BK.VSN)) {
      filteredData[vsn] = data[vsn]
    }
  })

  return filteredData
}

/**
 * Shortens plugin name to just the app name (removes IP/registry prefix and version)
 * Example: "192.168.1.1:5000/my-app:1.0.0" -> "my-app"
 */
function shortenPluginName(plugin: string): string {
  const isIP = /\d+\.\d+\.\d+\.\d+:\d+/.test(plugin)
  return isIP ? plugin.slice(plugin.indexOf('/') + 1).split(':')[0] :
    plugin.split(':')[0].slice(plugin.lastIndexOf('/') + 1)
}

/**
 * Aggregates timeline data by node (VSN)
 * Each row represents a node with all apps aggregated
 */
export function aggregateByNode(filteredData: RollupData): TimelineData {
  const byNode: TimelineData = {}

  Object.keys(filteredData).forEach(vsn => {
    const plugins = filteredData[vsn]
    const aggregated = []

    // Collect all records across all plugins for this node
    Object.keys(plugins).forEach(pluginName => {
      // Shorten plugin names
      const records = plugins[pluginName].map(record => ({
        ...record,
        meta: {
          ...record.meta,
          plugin: shortenPluginName(record.meta.plugin),
          origPluginName: record.meta.plugin
        }
      }))
      aggregated.push(...records)
    })

    // Group by timestamp and sum values
    const byTimestamp: { [ts: string]: AggregatedRecord } = {}
    aggregated.forEach(record => {
      const ts = record.timestamp
      if (!byTimestamp[ts]) {
        byTimestamp[ts] = {
          timestamp: ts,
          value: 0,
          meta: { ...record.meta, apps: {} }
        }
      }
      byTimestamp[ts].value += record.value
      byTimestamp[ts].meta.apps[record.meta.plugin] =
        (byTimestamp[ts].meta.apps[record.meta.plugin] || 0) + record.value
    })

    byNode[vsn] = Object.values(byTimestamp)
  })

  return byNode
}

/**
 * Aggregates timeline data by app (plugin)
 * Each row represents an app with all nodes aggregated
 * Returns apps sorted alphabetically by their short name
 */
export function aggregateByApp(filteredData: RollupData): TimelineData {
  const byApp: TimelineData = {}

  Object.keys(filteredData).forEach(vsn => {
    const plugins = filteredData[vsn]

    Object.keys(plugins).forEach(pluginName => {
      const shortName = shortenPluginName(pluginName)

      if (!byApp[pluginName]) {
        byApp[pluginName] = []
      }

      plugins[pluginName].forEach(record => {
        const existing = byApp[pluginName].find(r => r.timestamp === record.timestamp)
        if (existing) {
          existing.value += record.value
          existing.meta.nodes = existing.meta.nodes || {}
          existing.meta.nodes[vsn] = (existing.meta.nodes[vsn] || 0) + record.value
        } else {
          byApp[pluginName].push({
            ...record,
            meta: {
              ...record.meta,
              plugin: shortName,
              origPluginName: record.meta.plugin,
              nodes: { [vsn]: record.value }
            }
          })
        }
      })
    })
  })

  // Sort apps alphabetically by their short name
  const sortedByApp: TimelineData = {}
  Object.keys(byApp)
    .sort((a, b) => {
      const shortA = shortenPluginName(a)
      const shortB = shortenPluginName(b)
      return shortA.toLowerCase().localeCompare(shortB.toLowerCase())
    })
    .forEach(key => {
      sortedByApp[key] = byApp[key]
    })

  return sortedByApp
}

/**
 * Processes rollup data and returns both node and app aggregations
 */
export function processTimelineData(data: RollupData, nodes: BK.Node[]) {
  const filteredData = filterDataByNodes(data, nodes)
  const timelineByNode = aggregateByNode(filteredData)
  const timelineByApp = aggregateByApp(filteredData)

  return { timelineByNode, timelineByApp }
}
