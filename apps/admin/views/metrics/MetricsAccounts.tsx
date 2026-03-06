import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, ButtonGroup } from '@mui/material'
import { styled, useTheme } from '@mui/material/styles'
import {
  Chart as ChartJS,
  Tooltip,
  Legend,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js'
import { Download } from '@mui/icons-material'

import DateRangePicker from '/components/input/DateRangePicker'
import Checkbox from '/components/input/Checkbox'
import { getUsers, type User } from '/components/apis/user'
import { useProgress } from '/components/progress/ProgressProvider'
import MetricStatCard from '../../../../components/layout/MetricStatCard'


ChartJS.register(Tooltip, Legend, BarController, BarElement, CategoryScale, LinearScale)


type DailyPoint = {
  key: string
  label: string
  count: number
  users: User[]
}

type MonthPoint = {
  key: string
  label: string
  count: number
  users: User[]
}

type QuarterPoint = {
  key: string
  label: string
  count: number
  users: User[]
}

type RangeMode = 'custom' | 'last12' | 'ytd' | 'since2025' | 'alltime'
type GroupBy = 'daily' | 'month' | 'quarter'

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

const toDayStart = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

const monthKey = (date: Date) => (
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
)

const monthLabel = (date: Date) => date.toLocaleDateString('en-US', {
  month: 'short',
  timeZone: 'UTC'
})

const toMonthStart = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))

const toQuarterStart = (date: Date) => {
  const quarter = Math.floor(date.getUTCMonth() / 3)
  return new Date(Date.UTC(date.getUTCFullYear(), quarter * 3, 1))
}

const quarterKey = (date: Date) => {
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1
  return `${date.getUTCFullYear()}-Q${quarter}`
}

const quarterLabel = (date: Date) => {
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1
  return `Q${quarter}`
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

const listQuartersBetween = (start: Date, end: Date) => {
  const out: Date[] = []
  const cursor = toQuarterStart(start)
  const endQuarter = toQuarterStart(end)

  while (cursor <= endQuarter) {
    out.push(new Date(cursor))
    const quarter = Math.floor(cursor.getUTCMonth() / 3)
    cursor.setUTCMonth((quarter + 1) * 3)
  }

  return out
}

const isOct2022 = (date: Date) => (
  date.getUTCFullYear() === 2022 && date.getUTCMonth() === 9
)

const isCurrentMonth = (date: Date) => {
  const now = new Date()
  return date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCMonth() === now.getUTCMonth()
}

const formatRangeDate = (date: Date) => date.toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC'
})

export default function MetricsAccounts() {
  const theme = useTheme()
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<ChartJS | null>(null)

  const {loading, setLoading} = useProgress()
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null)
  const [rangeMode, setRangeMode] = useState<RangeMode>('alltime')
  const [groupBy, setGroupBy] = useState<GroupBy>('month')
  const [showYearDividers, setShowYearDividers] = useState(true)
  const [showUserNames, setShowUserNames] = useState(false)
  const [ignoreOct2022Migration, setIgnoreOct2022Migration] = useState(false)
  const [excludeCurrentMonth, setExcludeCurrentMonth] = useState(false)

  const datedUsers = useMemo(() => users.filter(u => !Number.isNaN(new Date(u.date_joined || '').getTime())), [users])

  const earliestJoinedDate = useMemo(() => {
    if (!datedUsers.length) return null
    return datedUsers
      .map(u => new Date(u.date_joined || ''))
      .sort((a, b) => a.getTime() - b.getTime())[0]
  }, [datedUsers])

  useEffect(() => {
    let active = true
    setLoading(true)

    getUsers()
      .then((res: User[]) => {
        if (!active) return
        setUsers(res || [])
      })
      .catch(err => {
        if (!active) return
        setError(err?.message || 'Failed to load account metrics')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [setLoading])

  useEffect(() => {
    if (!users.length || dateRange) return

    const joinedDates = users
      .map(u => new Date(u.date_joined || ''))
      .filter(d => !Number.isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())

    if (!joinedDates.length) return

    setDateRange([toMonthStart(joinedDates[0]), new Date()])
  }, [users, dateRange])

  // Update date range when rangeMode changes
  useEffect(() => {
    const now = new Date()

    if (rangeMode === 'last12') {
      const twelveMonthsAgo = new Date(now)
      twelveMonthsAgo.setMonth(now.getMonth() - 12)
      setDateRange([toMonthStart(twelveMonthsAgo), now])
    } else if (rangeMode === 'ytd') {
      const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
      setDateRange([yearStart, now])
    } else if (rangeMode === 'since2025') {
      const jan2025 = new Date(Date.UTC(2025, 0, 1))
      setDateRange([jan2025, now])
    } else if (rangeMode === 'alltime' && earliestJoinedDate) {
      setDateRange([toMonthStart(earliestJoinedDate), now])
    }
    // For 'custom', we don't change the dateRange
  }, [rangeMode, earliestJoinedDate])

  const chartData = useMemo(() => {
    if (!dateRange) return [] as (DailyPoint | MonthPoint | QuarterPoint)[]

    const [rawStart, rawEnd] = dateRange
    let start: Date
    if (groupBy === 'daily') {
      start = toDayStart(rawStart)
    } else if (groupBy === 'month') {
      start = toMonthStart(rawStart)
    } else {
      start = toQuarterStart(rawStart)
    }
    const end = new Date(Date.UTC(rawEnd.getUTCFullYear(), rawEnd.getUTCMonth() + 1, 0, 23, 59, 59, 999))

    const shouldIgnoreMigration = rangeMode === 'alltime' && ignoreOct2022Migration

    if (groupBy === 'daily') {
      const countsByDay: Record<string, { count: number, users: User[] }> = {}
      for (const user of users) {
        const joined = new Date(user.date_joined || '')
        if (Number.isNaN(joined.getTime())) continue
        if (joined < start || joined > end) continue
        if (shouldIgnoreMigration && isOct2022(joined)) continue

        const key = dailyKey(joined)
        if (!countsByDay[key]) {
          countsByDay[key] = { count: 0, users: [] }
        }
        countsByDay[key].count++
        countsByDay[key].users.push(user)
      }

      return listDaysBetween(start, end).map(day => {
        const key = dailyKey(day)
        const data = countsByDay[key] || { count: 0, users: [] }
        return {
          key,
          label: dailyLabel(day),
          count: data.count,
          users: data.users
        }
      })
    } else if (groupBy === 'quarter') {
      const countsByQuarter: Record<string, { count: number, users: User[] }> = {}
      for (const user of users) {
        const joined = new Date(user.date_joined || '')
        if (Number.isNaN(joined.getTime())) continue
        if (joined < start || joined > end) continue
        if (shouldIgnoreMigration && isOct2022(joined)) continue

        const key = quarterKey(joined)
        if (!countsByQuarter[key]) {
          countsByQuarter[key] = { count: 0, users: [] }
        }
        countsByQuarter[key].count++
        countsByQuarter[key].users.push(user)
      }

      return listQuartersBetween(start, end).map(quarter => {
        const key = quarterKey(quarter)
        const data = countsByQuarter[key] || { count: 0, users: [] }
        return {
          key,
          label: quarterLabel(quarter),
          count: data.count,
          users: data.users
        }
      })
    } else {
      const countsByMonth: Record<string, { count: number, users: User[] }> = {}
      for (const user of users) {
        const joined = new Date(user.date_joined || '')
        if (Number.isNaN(joined.getTime())) continue
        if (joined < start || joined > end) continue
        if (shouldIgnoreMigration && isOct2022(joined)) continue
        if (excludeCurrentMonth && isCurrentMonth(joined)) continue

        const key = monthKey(joined)
        if (!countsByMonth[key]) {
          countsByMonth[key] = { count: 0, users: [] }
        }
        countsByMonth[key].count++
        countsByMonth[key].users.push(user)
      }

      return listMonthsBetween(start, end)
        .filter(month => !excludeCurrentMonth || !isCurrentMonth(month))
        .map(month => {
          const key = monthKey(month)
          const data = countsByMonth[key] || { count: 0, users: [] }
          return {
            key,
            label: monthLabel(month),
            count: data.count,
            users: data.users
          }
        })
    }
  }, [users, dateRange, groupBy, rangeMode, ignoreOct2022Migration, excludeCurrentMonth])

  const totalNewInRange = chartData.reduce((acc, point) => acc + point.count, 0)
  const totalAccounts = users.length
  const maxMonth = chartData.reduce((acc, point) => Math.max(acc, point.count), 0)
  const avgPerMonth = chartData.length ? (totalNewInRange / chartData.length) : 0

  const rangeText = useMemo(() => {
    if (!dateRange) return 'Selected range'
    const [start, end] = dateRange
    const base = `${formatRangeDate(start)} - ${formatRangeDate(end)}`
    if (rangeMode === 'alltime' && ignoreOct2022Migration) {
      return `${base} (excluding Oct 2022 migration)`
    }
    return base
  }, [dateRange, rangeMode, ignoreOct2022Migration])

  useEffect(() => {
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
          label: `New Accounts${groupBy === 'daily' ? ' (by Day)' : groupBy === 'quarter' ? ' (by Quarter)' : ''}`,
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
                const point = chartData[ctx.dataIndex]
                const lines = [`${ctx.raw} new account${Number(ctx.raw) === 1 ? '' : 's'}`]
                if (showUserNames && point.users.length > 0) {
                  lines.push('', 'Users:')
                  point.users.forEach(user => {
                    const displayName = user.name
                      ? `${user.name} (${user.username})`
                      : user.username
                    lines.push(`  • ${displayName}`)
                  })
                }
                return lines
              },
              title: (items) => {
                const idx = items[0].dataIndex
                const monthLabel = labels[idx]
                const yearLabel = yearLabels[idx]
                return yearLabel ? `${monthLabel} ${yearLabel}` : monthLabel
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
              autoSkip: false,
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

                // For daily view, only show labels on first day of each month
                if (groupBy === 'daily') {
                  const [yearStr, monthStr, dayStr] = point.key.split('-')
                  if (dayStr !== '01') {
                    return ''  // Hide label for non-first days
                  }
                  // Show month label for first day
                  const monthName = new Date(Date.UTC(parseInt(yearStr), parseInt(monthStr) - 1, 1))
                    .toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })

                  // Add year if it's January or if year dividers are shown and it's a year boundary
                  if (showYearDividers && yearLabel) {
                    return `${monthName}\n${yearLabel}`
                  }
                  if (!showYearDividers && monthStr === '01') {
                    return `${monthName}\n${yearStr}`
                  }
                  return monthName
                }

                // If year dividers are shown, use existing logic for month/quarter
                if (showYearDividers && yearLabel) {
                  return `${labels[index]}\n${yearLabel}`
                }

                // If year dividers are hidden but it's January (or Q1 for quarters), show year
                if (!showYearDividers) {
                  if (groupBy === 'month') {
                    // Check if this is January (month key like "2024-01")
                    const [yearStr, monthStr] = point.key.split('-')
                    if (monthStr === '01') {
                      return `${labels[index]}\n${yearStr}`
                    }
                  } else if (groupBy === 'quarter') {
                    // Check if this is Q1 (quarter key like "2024-Q1")
                    const quarterNum = point.key.split('-Q')[1]
                    if (quarterNum === '1') {
                      const yearStr = point.key.split('-')[0]
                      return `${labels[index]}\n${yearStr}`
                    }
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
  }, [chartData, theme, showYearDividers, groupBy, showUserNames])

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
    link.download = `account-metrics-${new Date().toISOString().split('T')[0]}.png`
    link.href = url
    link.click()
  }

  if (loading) {
    return (
      <Root>
        <h1>Account Metrics</h1>
        <p>Loading account metrics...</p>
      </Root>
    )
  }

  return (
    <Root>
      <ContentCard>
        <Header>
          <HeaderTitle>Account Metrics</HeaderTitle>
          <HeaderSubtitle>Track user account growth and registration trends</HeaderSubtitle>
        </Header>

        {error && <Alert severity="error">{error}</Alert>}

        <ControlsSection>
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
                <Button
                  onClick={() => setGroupBy('quarter')}
                  variant={groupBy === 'quarter' ? 'contained' : 'outlined'}
                >
                  Quarter
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
                <CheckboxLabel>
                  <Checkbox
                    checked={excludeCurrentMonth}
                    onChange={(e) => setExcludeCurrentMonth(e.target.checked)}
                    disabled={groupBy !== 'month'}
                  />
                  No current month
                </CheckboxLabel>
                {rangeMode === 'alltime' && (
                  <CheckboxLabel>
                    <Checkbox
                      checked={ignoreOct2022Migration}
                      onChange={(e) => setIgnoreOct2022Migration(e.target.checked)}
                    />
                    No Oct 2022 (DB Migration)
                  </CheckboxLabel>
                )}
              </div>
            </ControlBlock>
          </TopControlRow>


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
            label="Total accounts (all time)"
            value={totalAccounts}
          />
          <MetricStatCard
            label={<>Total new accounts<br/>{rangeText}</>}
            value={totalNewInRange}
          />
          <MetricStatCard
            label={`Peak ${groupBy} signups`}
            value={maxMonth}
          />
          <MetricStatCard
            label={`Average per ${groupBy}`}
            value={avgPerMonth.toFixed(1)}
          />
        </StatsGrid>
      </ContentCard>

      <ChartCard>
        <ChartHeader>
          <div>
            <ChartTitle>New Accounts Over Time</ChartTitle>
            <ChartSubtitle>
              {groupBy === 'daily' ? 'Daily' : groupBy === 'month' ? 'Monthly' : 'Quarterly'}
              {' '}account creation counts ({rangeText})
            </ChartSubtitle>
          </div>
          <div className="flex">
            <CheckboxLabel>
              <Checkbox
                checked={showUserNames}
                onChange={(e) => setShowUserNames(e.target.checked)}
              />
              Show users on hover
            </CheckboxLabel>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Download />}
              onClick={handleDownloadChart}
              disabled={!chartData.length}
            >
              Download Chart
            </Button>
          </div>
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

`

const ContentCard = styled('div')`
  background: ${({ theme }) => theme.palette.mode === 'dark' ? '#1e1e1e' : '#fff'};
  border-left: 3px solid ${({ theme }) => theme.palette.primary.main};
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`

const Header = styled('div')`
  margin-bottom: 2rem;
`

const HeaderTitle = styled('h1')`
  margin: 0;
  font-size: 2.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.palette.text.primary};
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

const TopControlRow = styled('div')`
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  flex-wrap: wrap;
`

const ControlBlock = styled('div')`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.45rem;
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

  color: ${({ theme }) => theme.palette.text.primary};
  cursor: pointer;
  user-select: none;
  margin-right: 1rem;
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

const ChartHeader = styled('div')`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
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
