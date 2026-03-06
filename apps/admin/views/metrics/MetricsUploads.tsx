import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  ButtonGroup,
} from '@mui/material'
import { styled, useTheme } from '@mui/material/styles'
import {
  Chart as ChartJS,
  Tooltip as ChartTooltip,
  Legend,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js'
import { Download } from '@mui/icons-material'

import DateRangePicker from '/components/input/DateRangePicker'
import Checkbox from '/components/input/Checkbox'
import FilterAutocomplete from '/components/input/FilterAutocomplete'
import { getUploadHourlyCounts, type UploadHourlyCount } from '/components/apis/beehive'
import { listNodeProjects, listUserProjects } from '/components/apis/beekeeper'
import { useProgress } from '/components/progress/ProgressProvider'
import MetricStatCard from '/components/layout/MetricStatCard'


ChartJS.register(ChartTooltip, Legend, BarController, BarElement, CategoryScale, LinearScale)


type HourlyPoint = {
  key: string
  label: string
  count: number
}

type DailyPoint = {
  key: string
  label: string
  count: number
}

type MonthPoint = {
  key: string
  label: string
  count: number
}

type RangeMode = 'custom' | 'last12' | 'last30' | 'ytd' | 'since2025' | 'alltime'
type GroupBy = 'hourly' | 'daily' | 'month'

const hourlyKey = (date: Date) => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hour = String(date.getUTCHours()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:00`
}

const hourlyLabel = (date: Date) => {
  const hour = date.getUTCHours()
  return `${hour}:00`
}

const toHourStart = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours()))

const dailyKey = (date: Date) => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const dailyLabel = (date: Date) => date.toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC'
})

const toDayStart = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

const monthKey = (date: Date) => (
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
)

const monthLabel = (date: Date) => date.toLocaleDateString('en-US', {
  month: 'short',
  timeZone: 'UTC'
})

const toMonthStart = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))

const listHoursBetween = (start: Date, end: Date) => {
  const out: Date[] = []
  const cursor = toHourStart(start)
  const endHour = toHourStart(end)

  while (cursor <= endHour) {
    out.push(new Date(cursor))
    cursor.setUTCHours(cursor.getUTCHours() + 1)
  }

  return out
}

const listDaysBetween = (start: Date, end: Date) => {
  const out: Date[] = []
  const cursor = toDayStart(start)
  const endDay = toDayStart(end)

  while (cursor <= endDay) {
    out.push(new Date(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return out
}

const listMonthsBetween = (start: Date, end: Date) => {
  const out: Date[] = []
  const cursor = toMonthStart(start)
  const endMonth = toMonthStart(end)

  while (cursor <= endMonth) {
    out.push(new Date(cursor))
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }

  return out
}

const formatRangeDate = (date: Date) => date.toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC'
})

export default function MetricsUploads() {
  const theme = useTheme()
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<ChartJS | null>(null)

  const {setLoading} = useProgress()
  const [uploads, setUploads] = useState<UploadHourlyCount[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null)
  const [rangeMode, setRangeMode] = useState<RangeMode>('last30')
  const [groupBy, setGroupBy] = useState<GroupBy>('daily')
  const [showYearDividers, setShowYearDividers] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState<{current: number; total: number | null} | null>(null)
  const [selectedVsns, setSelectedVsns] = useState<string[]>([])
  const [sortVsnsByCount, setSortVsnsByCount] = useState(true)
  const [selectedNodeProjects, setSelectedNodeProjects] = useState<string[]>([])
  const [sortNodeProjectsByCount, setSortNodeProjectsByCount] = useState(true)
  const [selectedUserProjects, setSelectedUserProjects] = useState<string[]>([])
  const [sortUserProjectsByCount, setSortUserProjectsByCount] = useState(true)
  const [selectedApps, setSelectedApps] = useState<string[]>([])
  const [sortAppsByCount, setSortAppsByCount] = useState(true)
  const [nodeProjectVsnsByName, setNodeProjectVsnsByName] = useState<Map<string, Set<string>>>(new Map())
  const [userProjectVsnsByName, setUserProjectVsnsByName] = useState<Map<string, Set<string>>>(new Map())
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    let active = true

    Promise.all([listNodeProjects(), listUserProjects()])
      .then(([nodeProjects, userProjects]) => {
        if (!active) return

        const nextNodeProjectVsnsByName = new Map<string, Set<string>>()
        for (const project of nodeProjects || []) {
          const name = project.name
          if (!name) continue
          const vsnSet = new Set<string>()
          for (const node of (project.nodes || [])) {
            if (node?.vsn) vsnSet.add(String(node.vsn))
          }
          nextNodeProjectVsnsByName.set(name, vsnSet)
        }

        const nextUserProjectVsnsByName = new Map<string, Set<string>>()
        for (const project of userProjects || []) {
          const name = project.name
          if (!name) continue
          const vsnSet = new Set<string>()
          for (const node of (project.nodes || [])) {
            if (node?.vsn) vsnSet.add(String(node.vsn))
          }
          nextUserProjectVsnsByName.set(name, vsnSet)
        }
        console.log('nextNodeProjectVsnsByName', nextNodeProjectVsnsByName)
        console.log('nextUserProjectVsnsByName', nextUserProjectVsnsByName)

        setNodeProjectVsnsByName(nextNodeProjectVsnsByName)
        setUserProjectVsnsByName(nextUserProjectVsnsByName)
      })
      .catch((projectErr) => {
        console.error('Failed to load project filters:', projectErr)
      })

    return () => {
      active = false
    }
  }, [])

  const datedUploads = useMemo(() =>
    uploads.filter(u => !Number.isNaN(new Date(u.timestamp).getTime())),
  [uploads]
  )

  const earliestUploadDate = useMemo(() => {
    if (!datedUploads.length) return null
    return datedUploads
      .map(u => new Date(u.timestamp))
      .sort((a, b) => a.getTime() - b.getTime())[0]
  }, [datedUploads])

  const nodeProjectNamesByVsn = useMemo(() => {
    const byVsn = new Map<string, string[]>()
    for (const [projectName, vsnSet] of nodeProjectVsnsByName.entries()) {
      for (const vsn of vsnSet) {
        const names = byVsn.get(vsn) || []
        names.push(projectName)
        byVsn.set(vsn, names)
      }
    }
    return byVsn
  }, [nodeProjectVsnsByName])

  const userProjectNamesByVsn = useMemo(() => {
    const byVsn = new Map<string, string[]>()
    for (const [projectName, vsnSet] of userProjectVsnsByName.entries()) {
      for (const vsn of vsnSet) {
        const names = byVsn.get(vsn) || []
        names.push(projectName)
        byVsn.set(vsn, names)
      }
    }
    return byVsn
  }, [userProjectVsnsByName])

  const nodeProjectCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const upload of uploads) {
      const vsn = upload.meta?.vsn
      if (!vsn) continue
      const projectNames = nodeProjectNamesByVsn.get(vsn) || []
      for (const projectName of projectNames) {
        counts.set(projectName, (counts.get(projectName) || 0) + upload.value)
      }
    }
    return counts
  }, [nodeProjectNamesByVsn, uploads])

  const sortedNodeProjects = useMemo(() => {
    const entries = Array.from(nodeProjectCounts.entries())
    if (sortNodeProjectsByCount) {
      entries.sort((a, b) => b[1] - a[1])
    } else {
      entries.sort((a, b) => a[0].localeCompare(b[0]))
    }
    return entries.map(([projectName]) => projectName)
  }, [nodeProjectCounts, sortNodeProjectsByCount])

  const filteredByNodeProjectUploads = useMemo(() => {
    if (!selectedNodeProjects.length) return uploads

    const selectedVsns = new Set<string>()
    for (const projectName of selectedNodeProjects) {
      const vsnSet = nodeProjectVsnsByName.get(projectName)
      if (!vsnSet) continue
      for (const vsn of vsnSet) selectedVsns.add(vsn)
    }

    return uploads.filter(upload => {
      const vsn = upload.meta?.vsn
      return !!vsn && selectedVsns.has(vsn)
    })
  }, [nodeProjectVsnsByName, selectedNodeProjects, uploads])

  const userProjectCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const upload of filteredByNodeProjectUploads) {
      const vsn = upload.meta?.vsn
      if (!vsn) continue
      const projectNames = userProjectNamesByVsn.get(vsn) || []
      for (const projectName of projectNames) {
        counts.set(projectName, (counts.get(projectName) || 0) + upload.value)
      }
    }
    return counts
  }, [filteredByNodeProjectUploads, userProjectNamesByVsn])

  const sortedUserProjects = useMemo(() => {
    const entries = Array.from(userProjectCounts.entries())
    if (sortUserProjectsByCount) {
      entries.sort((a, b) => b[1] - a[1])
    } else {
      entries.sort((a, b) => a[0].localeCompare(b[0]))
    }
    return entries.map(([projectName]) => projectName)
  }, [sortUserProjectsByCount, userProjectCounts])

  const filteredByUserProjectUploads = useMemo(() => {
    if (!selectedUserProjects.length) return filteredByNodeProjectUploads

    const selectedVsns = new Set<string>()
    for (const projectName of selectedUserProjects) {
      const vsnSet = userProjectVsnsByName.get(projectName)
      if (!vsnSet) continue
      for (const vsn of vsnSet) selectedVsns.add(vsn)
    }

    return filteredByNodeProjectUploads.filter(upload => {
      const vsn = upload.meta?.vsn
      return !!vsn && selectedVsns.has(vsn)
    })
  }, [filteredByNodeProjectUploads, selectedUserProjects, userProjectVsnsByName])

  const vsnCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const upload of filteredByUserProjectUploads) {
      const vsn = upload.meta?.vsn
      if (!vsn) continue
      counts.set(vsn, (counts.get(vsn) || 0) + upload.value)
    }
    return counts
  }, [filteredByUserProjectUploads])

  const sortedVsns = useMemo(() => {
    const entries = Array.from(vsnCounts.entries())
    if (sortVsnsByCount) {
      entries.sort((a, b) => b[1] - a[1])
    } else {
      entries.sort((a, b) => a[0].localeCompare(b[0]))
    }
    return entries.map(([vsn]) => vsn)
  }, [sortVsnsByCount, vsnCounts])

  const filteredByVsnUploads = useMemo(() => {
    if (!selectedVsns.length) return filteredByUserProjectUploads
    const selectedSet = new Set(selectedVsns)
    return filteredByUserProjectUploads.filter(upload => {
      const vsn = upload.meta?.vsn
      return !!vsn && selectedSet.has(vsn)
    })
  }, [filteredByUserProjectUploads, selectedVsns])

  const appCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const upload of filteredByVsnUploads) {
      const app = upload.meta?.plugin
      if (!app) continue
      counts.set(app, (counts.get(app) || 0) + upload.value)
    }
    return counts
  }, [filteredByVsnUploads])

  const sortedApps = useMemo(() => {
    const entries = Array.from(appCounts.entries())
    if (sortAppsByCount) {
      entries.sort((a, b) => b[1] - a[1])
    } else {
      entries.sort((a, b) => a[0].localeCompare(b[0]))
    }
    return entries.map(([app]) => app)
  }, [appCounts, sortAppsByCount])

  const filteredUploads = useMemo(() => {
    if (!selectedApps.length) return filteredByVsnUploads
    const selectedSet = new Set(selectedApps)
    return filteredByVsnUploads.filter(upload => {
      const app = upload.meta?.plugin
      return !!app && selectedSet.has(app)
    })
  }, [filteredByVsnUploads, selectedApps])

  useEffect(() => {
    let active = true

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Handle monthly incremental fetching for alltime, last12, ytd, since2025
        if (['alltime', 'last12', 'ytd', 'since2025'].includes(rangeMode)) {
          const allUploads: UploadHourlyCount[] = []
          const now = new Date()
          let currentMonth = new Date()
          const isAllTime = rangeMode === 'alltime'
          let maxMonths = 360 // 30 years for alltime
          let totalMonths: number | null = null

          if (rangeMode === 'last12') {
            maxMonths = 12
            totalMonths = 12
          } else if (rangeMode === 'ytd') {
            maxMonths = now.getUTCMonth() + 1
            totalMonths = maxMonths
          } else if (rangeMode === 'since2025') {
            const yearsDiff = now.getUTCFullYear() - 2025
            maxMonths = (yearsDiff * 12) + now.getUTCMonth() + 1
            totalMonths = maxMonths
          }

          // Reset to start of current month
          currentMonth = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth(), 1))

          let hasFoundData = false

          for (let i = 0; i < maxMonths; i++) {
            if (!active) return

            if (active) {
              setLoadingProgress({
                current: i + 1,
                total: totalMonths
              })
            }

            try {
              const monthStart = new Date(currentMonth)
              const monthData = await getUploadHourlyCounts({start: monthStart})
              const hasData = monthData && monthData.length > 0

              if (hasData) {
                hasFoundData = true
                // Avoid spread operator to prevent stack overflow with large datasets
                for (const item of monthData) {
                  allUploads.push(item)
                }
              } else if (hasFoundData && isAllTime) {
                // Stop after first empty month once we've found data
                break
              }
            } catch (monthErr) {
              console.error(`Error fetching month ${i}:`, monthErr)
              if (hasFoundData) break // Stop on error after we have data
            }

            currentMonth.setUTCMonth(currentMonth.getUTCMonth() - 1)
          }

          if (active) {
            // Reverse since we fetched months backwards
            allUploads.reverse()
            setUploads(allUploads)
            setLoadingProgress(null)
            setIsInitialized(true)
          }
        } else if (rangeMode === 'custom' && dateRange) {
          // Custom range fetch
          const res = await getUploadHourlyCounts({start: dateRange[0], end: dateRange[1]})
          if (active) {
            setUploads(res || [])
            setIsInitialized(true)
          }
        } else {
          // Simple range mode: last30
          const now = new Date()
          const thirtyDaysAgo = new Date(now)
          thirtyDaysAgo.setUTCDate(now.getUTCDate() - 30)
          const startParam: Date = toDayStart(thirtyDaysAgo)

          const res = await getUploadHourlyCounts({start: startParam})
          if (active) {
            setUploads(res || [])
            setIsInitialized(true)
          }
        }
      } catch (err) {
        if (active) {
          setError(err?.message || 'Failed to load upload metrics')
          setLoadingProgress(null)
          setIsInitialized(true)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      active = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeMode])

  // Separate effect for custom date range changes (only after initialization)
  useEffect(() => {
    if (!isInitialized || rangeMode !== 'custom' || !dateRange) return

    let active = true
    setLoading(true)

    getUploadHourlyCounts({start: dateRange[0]})
      .then((res: UploadHourlyCount[]) => {
        if (!active) return
        setUploads(res || [])
      })
      .catch(err => {
        if (!active) return
        setError(err?.message || 'Failed to load upload metrics')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [dateRange, isInitialized, rangeMode, setLoading])

  const computedDateRange = useMemo(() => {
    if (rangeMode === 'custom' && dateRange) {
      return dateRange
    }

    const now = new Date()

    if (rangeMode === 'last30') {
      const thirtyDaysAgo = new Date(now)
      thirtyDaysAgo.setDate(now.getDate() - 30)
      return [toDayStart(thirtyDaysAgo), now] as [Date, Date]
    } else if (rangeMode === 'last12') {
      const twelveMonthsAgo = new Date(now)
      twelveMonthsAgo.setMonth(now.getMonth() - 12)
      return [toMonthStart(twelveMonthsAgo), now] as [Date, Date]
    } else if (rangeMode === 'ytd') {
      const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
      return [yearStart, now] as [Date, Date]
    } else if (rangeMode === 'since2025') {
      const jan2025 = new Date(Date.UTC(2025, 0, 1))
      return [jan2025, now] as [Date, Date]
    } else if (rangeMode === 'alltime' && earliestUploadDate) {
      return [toMonthStart(earliestUploadDate), now] as [Date, Date]
    }

    return null
  }, [rangeMode, dateRange, earliestUploadDate])

  const chartData = useMemo(() => {
    if (!computedDateRange) return [] as (HourlyPoint | DailyPoint | MonthPoint)[]

    const [rawStart, rawEnd] = computedDateRange
    let start: Date
    if (groupBy === 'hourly') {
      start = toHourStart(rawStart)
    } else if (groupBy === 'daily') {
      start = toDayStart(rawStart)
    } else {
      start = toMonthStart(rawStart)
    }
    const end = new Date(Date.UTC(rawEnd.getUTCFullYear(), rawEnd.getUTCMonth() + 1, 0, 23, 59, 59, 999))

    if (groupBy === 'hourly') {
      const countsByHour: Record<string, number> = {}
      for (const upload of filteredUploads) {
        const uploadTime = new Date(upload.timestamp)
        if (Number.isNaN(uploadTime.getTime())) continue
        if (uploadTime < start || uploadTime > end) continue

        const key = hourlyKey(uploadTime)
        countsByHour[key] = (countsByHour[key] || 0) + upload.value
      }

      return listHoursBetween(start, end).map(hour => {
        const key = hourlyKey(hour)
        return {
          key,
          label: hourlyLabel(hour),
          count: countsByHour[key] || 0
        }
      })
    } else if (groupBy === 'daily') {
      const countsByDay: Record<string, number> = {}
      for (const upload of filteredUploads) {
        const uploadTime = new Date(upload.timestamp)
        if (Number.isNaN(uploadTime.getTime())) continue
        if (uploadTime < start || uploadTime > end) continue

        const key = dailyKey(uploadTime)
        countsByDay[key] = (countsByDay[key] || 0) + upload.value
      }

      return listDaysBetween(start, end).map(day => {
        const key = dailyKey(day)
        return {
          key,
          label: dailyLabel(day),
          count: countsByDay[key] || 0
        }
      })
    } else {
      const countsByMonth: Record<string, number> = {}
      for (const upload of filteredUploads) {
        const uploadTime = new Date(upload.timestamp)
        if (Number.isNaN(uploadTime.getTime())) continue
        if (uploadTime < start || uploadTime > end) continue

        const key = monthKey(uploadTime)
        countsByMonth[key] = (countsByMonth[key] || 0) + upload.value
      }

      return listMonthsBetween(start, end).map(month => {
        const key = monthKey(month)
        return {
          key,
          label: monthLabel(month),
          count: countsByMonth[key] || 0
        }
      })
    }
  }, [computedDateRange, filteredUploads, groupBy])

  const totalUploads = chartData.reduce((acc, point) => acc + point.count, 0)
  const maxPeriod = chartData.reduce((acc, point) => Math.max(acc, point.count), 0)
  const avgPerPeriod = chartData.length ? (totalUploads / chartData.length) : 0

  const rangeText = useMemo(() => {
    if (!computedDateRange) return 'Selected range'
    const [start, end] = computedDateRange
    return `${formatRangeDate(start)} - ${formatRangeDate(end)}`
  }, [computedDateRange])

  useEffect(() => {
    if (!isInitialized) return
    if (!chartRef.current || !chartData.length) return

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
      chartInstanceRef.current = null
    }

    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    const gradient = ctx.createLinearGradient(0, 0, 0, 320)
    gradient.addColorStop(0, theme.palette.primary.main)
    gradient.addColorStop(1, theme.palette.primary.light)

    // Create year divider labels
    const labels = chartData.map(point => point.label)
    const yearLabels = chartData.map((point, idx) => {
      const [yearStr] = point.key.split('-')
      const currentYear = parseInt(yearStr)

      const prevYear = idx > 0
        ? parseInt(chartData[idx - 1].key.split('-')[0])
        : null

      return prevYear !== currentYear ? String(currentYear) : ''
    })

    chartInstanceRef.current = new ChartJS(chartRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: `Uploads${groupBy === 'hourly' ? ' (by Hour)' : groupBy === 'daily' ? ' (by Day)' : ''}`,
          data: chartData.map(point => point.count),
          backgroundColor: gradient,
          borderColor: theme.palette.primary.dark,
          borderWidth: 1,
          maxBarThickness: 26,
          hoverBackgroundColor: theme.palette.secondary.main
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 500,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: theme.palette.mode === 'dark' ? '#222' : '#fff',
            titleColor: theme.palette.text.primary,
            bodyColor: theme.palette.text.primary,
            borderColor: theme.palette.divider,
            borderWidth: 1,
            displayColors: false,
            callbacks: {
              label: (ctx) => {
                return `${ctx.raw} upload${Number(ctx.raw) === 1 ? '' : 's'}`
              },
              title: (items) => {
                const idx = items[0].dataIndex
                const label = labels[idx]
                const yearLabel = yearLabels[idx]
                return yearLabel ? `${label} ${yearLabel}` : label
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: true,
              drawOnChartArea: true,
              drawTicks: true,
              color: (context) => {
                if (!showYearDividers) return 'transparent'
                const idx = context.index
                if (!yearLabels[idx]) return 'transparent'
                return theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'
              },
              lineWidth: (context) => {
                if (!showYearDividers) return 0
                const idx = context.index
                return yearLabels[idx] ? 1 : 0
              }
            },
            ticks: {
              autoSkip: groupBy === 'hourly' ? true : false,
              maxRotation: 45,
              minRotation: 0,
              color: theme.palette.text.secondary,
              font: (context) => {
                const idx = context.index
                return {
                  weight: showYearDividers && yearLabels[idx] ? 'bold' : 'normal'
                }
              },
              callback: function(value, index) {
                const point = chartData[index]
                const yearLabel = yearLabels[index]

                // For hourly view, auto-skip handles it
                if (groupBy === 'hourly') {
                  return labels[index]
                }

                // For daily view, only show labels on first day of each month
                if (groupBy === 'daily') {
                  const [yearStr, monthStr, dayStr] = point.key.split('-')
                  if (dayStr !== '01') {
                    return ''  // Hide label for non-first days
                  }
                  const monthName = new Date(Date.UTC(parseInt(yearStr), parseInt(monthStr) - 1, 1))
                    .toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })

                  if (showYearDividers && yearLabel) {
                    return `${monthName}\n${yearLabel}`
                  }
                  if (!showYearDividers && monthStr === '01') {
                    return `${monthName}\n${yearStr}`
                  }
                  return monthName
                }

                // For month view
                if (showYearDividers && yearLabel) {
                  return `${labels[index]}\n${yearLabel}`
                }

                if (!showYearDividers) {
                  const [yearStr, monthStr] = point.key.split('-')
                  if (monthStr === '01') {
                    return `${labels[index]}\n${yearStr}`
                  }
                }

                return labels[index]
              }
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: theme.palette.text.secondary
            },
            grid: {
              color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
            }
          }
        }
      }
    })

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
        chartInstanceRef.current = null
      }
    }
  }, [chartData, groupBy, isInitialized, showYearDividers, theme])

  const handleRangeChange = (value) => {
    if (!Array.isArray(value)) return

    const [start, end] = value
    if (!start || !end) return

    const startDate = new Date(start)
    const endDate = new Date(end)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return

    setDateRange([startDate, endDate])
    setRangeMode('custom')
  }

  const handleDownloadChart = () => {
    if (!chartInstanceRef.current) return

    const url = chartInstanceRef.current.toBase64Image()
    const link = document.createElement('a')
    link.download = `upload-metrics-${new Date().toISOString().split('T')[0]}.png`
    link.href = url
    link.click()
  }

  const handleDownloadChartWhiteBg = () => {
    if (!chartInstanceRef.current) return

    const sourceCanvas = chartInstanceRef.current.canvas
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = sourceCanvas.width
    exportCanvas.height = sourceCanvas.height

    const exportCtx = exportCanvas.getContext('2d')
    if (!exportCtx) return

    exportCtx.fillStyle = '#ffffff'
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
    exportCtx.drawImage(sourceCanvas, 0, 0)

    const url = exportCanvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `upload-metrics-white-bg-${new Date().toISOString().split('T')[0]}.png`
    link.href = url
    link.click()
  }

  if (!isInitialized) {
    return (
      <Root>
        <h1>Upload Metrics</h1>
        <p>Loading upload metrics...</p>
      </Root>
    )
  }

  return (
    <Root>
      <ContentCard>
        <Header>
          <HeaderTitle>Upload Metrics</HeaderTitle>
          <HeaderSubtitle>Track data upload trends</HeaderSubtitle>
        </Header>

        {error && <Alert severity="error">{error}</Alert>}

        {loadingProgress && (
          <Alert severity="info">
            Loading data... Month {loadingProgress.current}
            {' '}
            {loadingProgress.total ? `of ${loadingProgress.total}` : '(scanning...)'}
          </Alert>
        )}

        <ControlsSection>
          <FilterRow>
            {sortedNodeProjects.length > 0 && (
              <FilterAutocomplete
                options={sortedNodeProjects}
                value={selectedNodeProjects}
                onChange={(newValue) => setSelectedNodeProjects(newValue)}
                counts={nodeProjectCounts}
                sortByCount={sortNodeProjectsByCount}
                onSortChange={(sortByCount) => setSortNodeProjectsByCount(sortByCount)}
                placeholder="Node Projects"
                limitTags={4}
                width="50%"
              />
            )}

            {sortedUserProjects.length > 0 && (
              <FilterAutocomplete
                options={sortedUserProjects}
                value={selectedUserProjects}
                onChange={(newValue) => setSelectedUserProjects(newValue)}
                counts={userProjectCounts}
                sortByCount={sortUserProjectsByCount}
                onSortChange={(sortByCount) => setSortUserProjectsByCount(sortByCount)}
                placeholder="User Projects"
                limitTags={4}
                width="50%"
              />
            )}
          </FilterRow>

          <TopControlRow>

            <ControlBlock>
              <MutedLabel>Range</MutedLabel>
              <ButtonGroup size="small" variant="outlined">
                <Button
                  onClick={() => setRangeMode('alltime')}
                  variant={rangeMode === 'alltime' ? 'contained' : 'outlined'}
                >
                  All Time
                </Button>
                <Button
                  onClick={() => setRangeMode('custom')}
                  variant={rangeMode === 'custom' ? 'contained' : 'outlined'}
                >
                  Custom Range
                </Button>
                <Button
                  onClick={() => setRangeMode('last30')}
                  variant={rangeMode === 'last30' ? 'contained' : 'outlined'}
                >
                  Last 30 Days
                </Button>
                <Button
                  onClick={() => setRangeMode('since2025')}
                  variant={rangeMode === 'since2025' ? 'contained' : 'outlined'}
                >
                  From Jan 2025
                </Button>
                <Button
                  onClick={() => setRangeMode('last12')}
                  variant={rangeMode === 'last12' ? 'contained' : 'outlined'}
                >
                  Last 12 Months
                </Button>
                <Button
                  onClick={() => setRangeMode('ytd')}
                  variant={rangeMode === 'ytd' ? 'contained' : 'outlined'}
                >
                  YTD
                </Button>
              </ButtonGroup>
            </ControlBlock>

            <ControlBlock>
              <MutedLabel>Group by</MutedLabel>
              <ButtonGroup size="small" variant="outlined">
                <Button
                  onClick={() => setGroupBy('hourly')}
                  variant={groupBy === 'hourly' ? 'contained' : 'outlined'}
                >
                  Hourly
                </Button>
                <Button
                  onClick={() => setGroupBy('daily')}
                  variant={groupBy === 'daily' ? 'contained' : 'outlined'}
                >
                  Daily
                </Button>
                <Button
                  onClick={() => setGroupBy('month')}
                  variant={groupBy === 'month' ? 'contained' : 'outlined'}
                >
                  Month
                </Button>
              </ButtonGroup>
            </ControlBlock>

            <ControlBlock>
              <MutedLabel>Options</MutedLabel>
              <div className="flex">
                <CheckboxLabel>
                  <Checkbox
                    checked={showYearDividers}
                    onChange={(e) => setShowYearDividers(e.target.checked)}
                  />
                  Year dividers
                </CheckboxLabel>
              </div>
            </ControlBlock>
          </TopControlRow>

          <FilterRow>
            {sortedVsns.length > 0 && (
              <FilterAutocomplete
                options={sortedVsns}
                value={selectedVsns}
                onChange={(newValue) => setSelectedVsns(newValue)}
                counts={vsnCounts}
                sortByCount={sortVsnsByCount}
                onSortChange={(sortByCount) => setSortVsnsByCount(sortByCount)}
                placeholder="VSNs"
                limitTags={5}
                width="50%"
              />
            )}

            {sortedApps.length > 0 && (
              <FilterAutocomplete
                options={sortedApps}
                value={selectedApps}
                onChange={(newValue) => setSelectedApps(newValue)}
                counts={appCounts}
                sortByCount={sortAppsByCount}
                onSortChange={(sortByCount) => setSortAppsByCount(sortByCount)}
                placeholder="Apps"
                limitTags={5}
                width="50%"
              />
            )}
          </FilterRow>

          {rangeMode === 'custom' && (
            <ControlBlock>
              <MutedLabel>Date range</MutedLabel>
              <DateRangePicker
                value={dateRange}
                onChange={handleRangeChange}
                format="y-MM-dd"
              />
            </ControlBlock>
          )}

        </ControlsSection>

        <StatsGrid>
          <MetricStatCard
            label={`Total uploads (${rangeText})`}
            value={totalUploads.toLocaleString()}
          />
          <MetricStatCard
            label={`Peak ${groupBy} uploads`}
            value={maxPeriod.toLocaleString()}
          />
          <MetricStatCard
            label={`Average per ${groupBy}`}
            value={avgPerPeriod.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          />
        </StatsGrid>
      </ContentCard>

      <ChartCard>
        <ChartHeader>
          <div>
            <ChartTitle>Upload Counts Over Time</ChartTitle>
            <ChartSubtitle>
              {groupBy === 'hourly' ? 'Hourly' : groupBy === 'daily' ? 'Daily' : 'Monthly'}
              {' '}upload counts for {rangeText}
            </ChartSubtitle>
          </div>
          <DownloadButtons>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Download />}
              onClick={handleDownloadChart}
              disabled={!chartData.length}
            >
              Download Chart
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Download />}
              onClick={handleDownloadChartWhiteBg}
              disabled={!chartData.length}
            >
              Download White BG
            </Button>
          </DownloadButtons>
        </ChartHeader>
        {chartData.length > 0 ? (
          <ChartWrap>
            <canvas ref={chartRef}></canvas>
          </ChartWrap>
        ) : (
          <EmptyState>No data available for the selected range.</EmptyState>
        )}
      </ChartCard>
    </Root>
  )
}

const Root = styled('div')`
  max-width: 1400px;
  margin: 1rem auto;
  padding: 0 2rem 2rem 2rem;

  @media (max-width: 768px) {
    padding: 0 1rem 1rem 1rem;
  }

  @media (max-width: 480px) {
    padding: 0 0.5rem 0.5rem 0.5rem;
    margin: 0.5rem auto;
  }
`

const ContentCard = styled('div')`
  background: ${({ theme }) => theme.palette.mode === 'dark' ? '#1e1e1e' : '#fff'};
  border-left: 3px solid ${({ theme }) => theme.palette.primary.main};
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  @media (max-width: 768px) {
    padding: 1.5rem;
  }

  @media (max-width: 480px) {
    padding: 1rem;
    border-left-width: 2px;
  }
`

const Header = styled('div')`
  margin-bottom: 2rem;
`

const HeaderTitle = styled('h1')`
  margin: 0;
  font-size: 2.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.palette.text.primary};

  @media (max-width: 768px) {
    font-size: 2rem;
  }

  @media (max-width: 480px) {
    font-size: 1.5rem;
  }
`

const HeaderSubtitle = styled('p')`
  margin: 0.5rem 0 0 0;
  color: ${({ theme }) => theme.palette.text.secondary};
  font-size: 1.1rem;
`

const ControlsSection = styled('div')`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: ${({ theme }) => theme.palette.mode === 'dark' ? '#2a2a2a' : '#f8f9fa'};
  border-radius: 8px;

`

const ControlBlock = styled('div')`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.45rem;
`

const TopControlRow = styled('div')`
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  flex-wrap: wrap;

`

const FilterRow = styled('div')`
  display: flex;
  gap: 1.5rem;
  width: 100%;
`

const MutedLabel = styled('span')`
  font-size: 0.78rem;
  font-weight: 600;
  color: ${({ theme }) => theme.palette.text.secondary};
  letter-spacing: 0.04em;
`

const CheckboxLabel = styled('label')`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: ${({ theme }) => theme.palette.text.primary};
  cursor: pointer;
  user-select: none;
`

const StatsGrid = styled('div')`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
`

const ChartCard = styled('div')`
  background: ${({ theme }) => theme.palette.mode === 'dark' ? '#1e1e1e' : '#fff'};
  border-left: 3px solid ${({ theme }) => theme.palette.primary.main};
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`

const ChartTitle = styled('h2')`
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.palette.text.primary};
`

const ChartSubtitle = styled('p')`
  margin: 0;
  color: ${({ theme }) => theme.palette.text.secondary};
  font-size: 1rem;
`

const ChartHeader = styled('div')`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
`

const DownloadButtons = styled('div')`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`

const ChartWrap = styled('div')`
  height: 380px;
`

const EmptyState = styled('div')`
  border-radius: 8px;
  border: 1px dashed ${({ theme }) => theme.palette.divider};
  color: ${({ theme }) => theme.palette.text.secondary};
  text-align: center;
  padding: 1.2rem;
`
