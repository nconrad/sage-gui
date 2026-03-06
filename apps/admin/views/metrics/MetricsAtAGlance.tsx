import { useEffect, useState } from 'react'
import { Alert, CircularProgress } from '@mui/material'
import { styled } from '@mui/material/styles'
import { Masonry } from '@mui/lab'
import {
  AccessTimeOutlined, AssignmentOutlined, SpeakerNotesOutlined, PersonAddOutlined,
  CloudUploadOutlined, CheckCircleOutlined, MoreTimeOutlined, OpenInNewOutlined,
} from '@mui/icons-material'

import MetricStatCard from '/components/layout/MetricStatCard'
import SageLogo from '/components/nav-bar/SageLogo'
import { getUsers, type User } from '/components/apis/user'
import { useProgress } from '/components/progress/ProgressProvider'

type GoogleCell = {
  v?: string | number | boolean | null
}

type GoogleRow = {
  c?: GoogleCell[]
}

type GoogleSheetResponse = {
  table?: {
    cols?: Array<{ label?: string }>
    rows?: GoogleRow[]
  }
}

type PresentationSummary = {
  total: number
  participants: number
  byType: Array<{ type: string; count: number }>
}

type NAIRRApplicationSummary = {
  accepted: number
  inProgress: number
  acceptedByTopic: Array<{ topic: string; count: number; link?: string }>
  inProgressByTopic: Array<{ topic: string; count: number; link?: string }>
}

type UserSummary = {
  totalUsers: number
  newUsersSinceJan2025: number
  approvedSinceJan2025: number
}

const envValue = (name: string) => process.env[name]?.trim()

const officeHoursUrl = envValue('SAGE_METRICS_OFFICE_HOURS_URL') || ''
const presentationsUrl = envValue('SAGE_METRICS_PRESENTATIONS_URL') || ''
const nairrUrl = envValue('SAGE_METRICS_NAIRR_URL') || ''
const supportThreadsValue = envValue('SAGE_METRICS_SUPPORT_THREADS_VALUE') || ''
const slackMembersValue = envValue('SAGE_METRICS_SLACK_MEMBERS_VALUE') || ''
const measurementsValue = envValue('SAGE_METRICS_MEASUREMENTS_VALUE') || ''
const fileVolumeValue = envValue('SAGE_METRICS_FILE_VOLUME_VALUE') || ''

const toDisplayValue = (value: unknown) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return value.toLocaleString()
  return String(value)
}

const parseGoogleSheetResponse = (text: string): GoogleSheetResponse => {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Unexpected Google Sheet response format')
  }

  return JSON.parse(text.slice(start, end + 1))
}

const withTqxJson = (url: string) => {
  if (url.includes('tqx=')) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}tqx=out:json`
}

const fetchGoogleSheet = async (sheetUrl: string) => {
  const response = await fetch(withTqxJson(sheetUrl))

  if (!response.ok) {
    throw new Error(`Failed to fetch sheet data (${response.status})`)
  }

  const text = await response.text()
  if (!text.includes('google.visualization.Query.setResponse')) {
    throw new Error('Sheet is not publicly accessible')
  }

  const parsed = parseGoogleSheetResponse(text)
  const cols = (parsed.table?.cols || []).map(col => col.label || '')
  const rows = parsed.table?.rows || []

  return { cols, rows }
}

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim()

const getColumnIndex = (labels: string[], matcher: (normalized: string) => boolean) => {
  return labels.findIndex(label => matcher(normalize(label)))
}

const extractUrl = (value: string) => {
  const match = value.match(/https?:\/\/[^\s)]+/i)
  return match?.[0]
}

const isDuplicateOutcome = (value: string) => {
  const normalized = normalize(value).replace(/[()]/g, '')
  return normalized === 'duplicate' || normalized.includes('duplicate')
}

const countOfficeHoursHeld = (cols: string[], rows: GoogleRow[]) => {
  const initialOutcomeIndex = getColumnIndex(cols, label => {
    const n = normalize(label)
    return n === 'inital outcome' || n === 'initial outcome'
  })

  if (initialOutcomeIndex === -1) {
    throw new Error('Could not find "Initial Outcome" column in sheet')
  }

  return rows.reduce((count, row) => {
    const cells = row.c || []
    const outcome = toDisplayValue(cells[initialOutcomeIndex]?.v).trim()

    // Skip rows where Initial Outcome contains "(duplicate)"
    if (isDuplicateOutcome(outcome)) return count

    // Count any row that doesn't have a duplicate outcome
    return count + 1
  }, 0)
}

const countPresentationsByType = (cols: string[], rows: GoogleRow[]): PresentationSummary => {
  const typeIndex = getColumnIndex(cols, label => label === 'type')
  const participantsIndex = getColumnIndex(cols, label => label.includes('num reached'))

  if (typeIndex === -1) {
    throw new Error('Could not find "type" column in presentation sheet')
  }

  const counts = new Map<string, number>()
  let participants = 0

  for (const row of rows) {
    const cells = row.c || []
    let type = toDisplayValue(cells[typeIndex]?.v).trim().toLowerCase()
    const participantsRaw = toDisplayValue(cells[participantsIndex]?.v).replace(/,/g, '').trim()
    const participantsValue = Number(participantsRaw)
    if (!Number.isNaN(participantsValue)) participants += participantsValue
    if (!type) continue

    // Normalize "mini-symposium" to "symposium"
    if (type === 'mini-symposium') {
      type = 'symposium'
    } else if (['townhall', 'forum', 'education', 'summit'].includes(type)) {
      // Group specific types into "Other Education and Outreach"
      type = 'Other Ed and Outreach'
    }

    counts.set(type, (counts.get(type) || 0) + 1)
  }

  const byType = Array.from(counts.entries())
    .sort((a, b) => {
      if (a[0] === 'Other Ed and Outreach') return 1
      if (b[0] === 'Other Ed and Outreach') return -1
      return b[1] - a[1]
    })
    .map(([type, count]) => ({ type, count }))

  return {
    total: byType.reduce((acc, entry) => acc + entry.count, 0),
    participants,
    byType
  }
}

const countNAIRRApplications = (cols: string[], rows: GoogleRow[]): NAIRRApplicationSummary => {
  const statusIndex = 0 // First column contains merged cells indicating status groups
  const titleIndex = getColumnIndex(cols, label => normalize(label) === 'title')
  const proposalLinkIndex = getColumnIndex(cols, normalized => normalized === 'url')

  if (titleIndex === -1) {
    throw new Error('Could not find "Title" column in NAIRR applications sheet')
  }

  const acceptedByTopic = new Map<string, { count: number; link?: string }>()
  const inProgressByTopic = new Map<string, { count: number; link?: string }>()
  let acceptedCount = 0
  let inProgressCount = 0
  let currentStatus = '' // Track the current status group from merged cells

  for (const row of rows) {
    const cells = row.c || []
    const statusCell = toDisplayValue(cells[statusIndex]?.v).trim().toLowerCase()
    const title = toDisplayValue(cells[titleIndex]?.v).trim()
    const proposalLinkValue = proposalLinkIndex === -1
      ? ''
      : toDisplayValue(cells[proposalLinkIndex]?.v).trim()
    const proposalLink = extractUrl(proposalLinkValue)

    // Update current status if this row has a status value (merged cell header)
    if (statusCell) {
      currentStatus = statusCell
    }

    // Skip empty title rows
    if (!title) continue

    // Categorize based on current status group from merged cells
    if (currentStatus.includes('accepted')) {
      acceptedCount++
      const current = acceptedByTopic.get(title)
      acceptedByTopic.set(title, {
        count: (current?.count || 0) + 1,
        link: current?.link || proposalLink
      })
    } else {
      inProgressCount++
      const current = inProgressByTopic.get(title)
      inProgressByTopic.set(title, {
        count: (current?.count || 0) + 1,
        link: current?.link || proposalLink
      })
    }
  }

  return {
    accepted: acceptedCount,
    inProgress: inProgressCount,
    acceptedByTopic: Array.from(acceptedByTopic.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([topic, info]) => ({ topic, count: info.count, link: info.link })),
    inProgressByTopic: Array.from(inProgressByTopic.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([topic, info]) => ({ topic, count: info.count, link: info.link }))
  }
}

const summarizeUsersSinceJan2025 = (users: User[]): UserSummary => {
  const start = new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0))

  const eligibleUsers = users.filter(user => {
    const joined = new Date(user.date_joined || '')
    if (Number.isNaN(joined.getTime())) return false
    return joined >= start
  })

  const approvedSinceJan2025 = eligibleUsers.filter(user => !!user.is_approved).length

  return {
    totalUsers: users.length,
    newUsersSinceJan2025: eligibleUsers.length,
    approvedSinceJan2025
  }
}

export default function Numbers() {
  const [officeHoursHeld, setOfficeHoursHeld] = useState<number | null>(null)
  const [presentations, setPresentations] = useState<PresentationSummary | null>(null)
  const [nairrApplications, setNAIRRApplications] = useState<NAIRRApplicationSummary | null>(null)
  const [userSummary, setUserSummary] = useState<UserSummary | null>(null)
  const [officeHoursError, setOfficeHoursError] = useState<string | null>(null)
  const [presentationsError, setPresentationsError] = useState<string | null>(null)
  const [nairrError, setNAIRRError] = useState<string | null>(null)
  const [usersError, setUsersError] = useState<string | null>(null)

  const {loading, setLoading} = useProgress()

  useEffect(() => {
    let active = true

    const fetchNumbers = async () => {
      setLoading(true)
      setOfficeHoursError(null)
      setPresentationsError(null)
      setNAIRRError(null)
      setUsersError(null)

      try {
        const { cols, rows } = await fetchGoogleSheet(officeHoursUrl)
        const heldCount = countOfficeHoursHeld(cols, rows)
        if (active) setOfficeHoursHeld(heldCount)
      } catch (err) {
        if (active) setOfficeHoursError(err?.message || 'Failed to load office hours')
      }

      try {
        const { cols, rows } = await fetchGoogleSheet(presentationsUrl)
        const summary = countPresentationsByType(cols, rows)
        if (active) setPresentations(summary)
      } catch (err) {
        if (active) setPresentationsError(err?.message || 'Failed to load presentations')
      }

      try {
        const { cols, rows } = await fetchGoogleSheet(nairrUrl)
        const summary = countNAIRRApplications(cols, rows)
        if (active) setNAIRRApplications(summary)
      } catch (err) {
        if (active) setNAIRRError(err?.message || 'Failed to load NAIRR applications')
      }

      try {
        const users = await getUsers()
        const summary = summarizeUsersSinceJan2025(users || [])
        if (active) setUserSummary(summary)
      } catch (err) {
        if (active) setUsersError(err?.message || 'Failed to load user metrics')
      }

      if (active) {
        setLoading(false)
      }
    }

    fetchNumbers()

    return () => {
      active = false
    }
  }, [setLoading])

  const allFailed = !!officeHoursError && !!presentationsError && !!nairrError

  return (
    <Root>
      <Header>
        <TitleRow>
          <SageLogo beta={false} />
          <div>
            <Title>
              Metrics at a Glance
              <TitleDivider>|</TitleDivider>
              <TitleMutedSuffix>from January 2025</TitleMutedSuffix>
            </Title>
          </div>
        </TitleRow>
      </Header>

      {allFailed && <Alert severity="error" sx={{ mb: 1 }}>Failed to load metrics from Google Sheets.</Alert>}

      {!!presentationsError && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Presentations sheet is not publicly readable. Share it as “Anyone with the link can view” (or publish the tab)
          so this dashboard can fetch it client-side.
        </Alert>
      )}

      {!!nairrError && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          NAIRR applications sheet is not publicly readable. Share it as
          "Anyone with the link can view" (or publish the tab) so this dashboard
          can fetch it client-side.
        </Alert>
      )}

      {!!usersError && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Could not load user metrics from auth service.
        </Alert>
      )}

      {loading && (
        <LoadingWrap>
          <CircularProgress size={24} />
          <span>Loading numbers...</span>
        </LoadingWrap>
      )}

      {!loading && (
        <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={2}>
          <MetricStatCard
            icon={<AccessTimeOutlined />}
            items={[{
              label: 'Office hours held',
              value: (officeHoursHeld ?? 0).toLocaleString()
            }]}
            content={
              <TypeBreakdown>
                <TypeRow>
                  <TypeName>Support threads</TypeName>
                  <TypeCount>{supportThreadsValue}</TypeCount>
                </TypeRow>
                <TypeRow>
                  <TypeName>Sage Community Slack Members</TypeName>
                  <TypeCount>{slackMembersValue}</TypeCount>
                </TypeRow>
              </TypeBreakdown>
            }
          />

          <MetricStatCard
            icon={<AssignmentOutlined />}
            label="NAIRR Proposals"
            value={nairrError ? '—' : (
              (nairrApplications?.accepted ?? 0) + (nairrApplications?.inProgress ?? 0)
            ).toLocaleString()}
            content={
              !nairrError && (
                <StatusBreakdownGrid>
                  <StatusGroup>
                    <StatusLabelWithIcon>
                      <CheckCircleOutlined sx={{ fontSize: '1.1rem', color: '#4caf50', marginRight: '0.5rem' }} />
                      <span>Accepted</span>
                    </StatusLabelWithIcon>
                    <TopicList>
                      {nairrApplications?.acceptedByTopic.map(item => (
                        <TopicRow key={item.topic}>
                          <TopicName>{item.topic}</TopicName>
                          {item.link && (
                            <ProposalLink
                              href={item.link}
                              target="_blank"
                              rel="noreferrer noopener"
                              aria-label={`Open proposal for ${item.topic}`}
                              title="Open proposal"
                            >
                              <OpenInNewOutlined sx={{ fontSize: '1rem' }} />
                            </ProposalLink>
                          )}
                        </TopicRow>
                      ))}
                    </TopicList>
                  </StatusGroup>
                  <StatusGroup>
                    <StatusLabelWithIcon>
                      <MoreTimeOutlined sx={{ fontSize: '1.1rem', color: '#ff9800', marginRight: '0.5rem' }} />
                      <span>In Progress</span>
                    </StatusLabelWithIcon>
                    <TopicList>
                      {nairrApplications?.inProgressByTopic.map(item => (
                        <TopicRow key={item.topic}>
                          <TopicName>{item.topic}</TopicName>
                          {item.link && (
                            <ProposalLink
                              href={item.link}
                              target="_blank"
                              rel="noreferrer noopener"
                              aria-label={`Open proposal for ${item.topic}`}
                              title="Open proposal"
                            >
                              <OpenInNewOutlined sx={{ fontSize: '1rem' }} />
                            </ProposalLink>
                          )}
                        </TopicRow>
                      ))}
                    </TopicList>
                  </StatusGroup>
                </StatusBreakdownGrid>
              )
            }
          />
          <MetricStatCard
            icon={<SpeakerNotesOutlined />}
            label={<>Presentations | ~{(presentations?.participants ?? 0).toLocaleString()} reached</>}
            value={presentationsError ? '—' : (presentations?.total ?? 0).toLocaleString()}
            content={
              !presentationsError && (
                <TypeBreakdown>
                  {presentations?.byType.map(item => (
                    <TypeRow key={item.type}>
                      <TypeName>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</TypeName>
                      <TypeCount>{item.count.toLocaleString()}</TypeCount>
                    </TypeRow>
                  ))}

                </TypeBreakdown>
              )
            }
          />
          <MetricStatCard
            icon={<PersonAddOutlined />}
            label="New accounts"
            value={usersError ? '—' : (
              <>
                {(userSummary?.newUsersSinceJan2025 ?? 0).toLocaleString()}
                <MutedValueSuffix>
                  {' '}
                  of {(userSummary?.totalUsers ?? 0).toLocaleString()}
                </MutedValueSuffix>
              </>
            )}
            content={
              !usersError && (
                <TypeBreakdown>
                  <TypeRow>
                    <TypeName>New users with node access</TypeName>
                    <TypeCount>{(userSummary?.approvedSinceJan2025 ?? 0).toLocaleString()}</TypeCount>
                  </TypeRow>
                </TypeBreakdown>
              )
            }
          />
          <MetricStatCard
            icon={<CloudUploadOutlined />}
            label="Data"
            content={(
              <UploadsGrid>
                <UploadItem>
                  <UploadValue>{measurementsValue}</UploadValue>
                  <UploadLabel>Measurements<sup>[1]</sup></UploadLabel>
                </UploadItem>
                {/*
                <UploadItem>
                  <UploadValue>9999</UploadValue>
                  <UploadLabel>File Uploads</UploadLabel>
                </UploadItem>
                */}
                <UploadItem>
                  <UploadValue>{fileVolumeValue}</UploadValue>
                  <UploadLabel>File Volume<sup>[2]</sup></UploadLabel>
                </UploadItem>
                <UploadFooter className="flex justify-end gap">
                  <div>[1] Excludes system metrics</div>
                  <div>[2] Includes MSRI</div>
                </UploadFooter>
              </UploadsGrid>
            )}
          />
        </Masonry>
      )}
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

const Header = styled('div')`
  margin-bottom: 1.5rem;
`

const TitleRow = styled('div')`
  display: flex;
  align-items: flex-start;
  gap: 1rem;

  @media (max-width: 480px) {
    gap: 0.75rem;
  }
`

const Title = styled('h1')`
  margin: 0;
  font-size: 2rem;
  color: ${({ theme }) => theme.palette.text.primary};
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
`

const TitleMutedSuffix = styled('span')`
  font-size: 0.95rem;
  font-weight: 500;
  color: ${({ theme }) => theme.palette.text.secondary};
`

const TitleDivider = styled('span')`
  font-size: 0.95rem;
  font-weight: 500;
  color: ${({ theme }) => theme.palette.text.disabled};
`

const LoadingWrap = styled('div')`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: ${({ theme }) => theme.palette.text.secondary};
`

const TypeBreakdown = styled('ul')`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

const TypeRow = styled('li')`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  background: ${({ theme }) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
`

const TypeName = styled('span')`
  font-size: 0.76rem;
  color: ${({ theme }) => theme.palette.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const TypeCount = styled('span')`
  font-size: 0.74rem;
  font-weight: 700;
  background: ${({ theme }) => theme.palette.primary.main};
  color: ${({ theme }) => theme.palette.primary.contrastText};
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  line-height: 1.2;
`

const StatusBreakdownGrid = styled('div')`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const StatusGroup = styled('div')`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const StatusLabelWithIcon = styled('div')`
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.palette.text.primary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const TopicList = styled('div')`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`

const TopicRow = styled('div')`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  background: ${({ theme }) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: 999px;
  padding: 0.15rem 0.4rem;
`

const TopicName = styled('span')`
  font-size: 0.72rem;
  color: ${({ theme }) => theme.palette.text.secondary};
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
`

const ProposalLink = styled('a')`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.palette.text.secondary};
  text-decoration: none;
  opacity: 0.85;
  transition: color 0.15s ease, opacity 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.palette.primary.main};
    opacity: 1;
  }
`

const UploadsGrid = styled('div')`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  width: 100%;
`

const UploadItem = styled('div')`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 0.6rem 0.4rem;
  background: ${({ theme }) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: 6px;
  text-align: center;
`

const UploadValue = styled('div')`
  font-size: 0.9rem;
  font-weight: 700;
  color: ${({ theme }) => theme.palette.primary.main};
`

const UploadLabel = styled('div')`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.palette.text.secondary};
  font-weight: 500;
`

const UploadFooter = styled('div')`
  grid-column: 1 / -1;
  text-align: right;
  font-size: 0.65rem;
  font-weight: 600;
  color: ${({ theme }) => theme.palette.text.disabled};
`

const MutedValueSuffix = styled('span')`
  font-size: 1rem;
  font-weight: 500;
  color: ${({ theme }) => theme.palette.text.secondary};
`