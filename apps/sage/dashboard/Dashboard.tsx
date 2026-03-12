import { useEffect, useState } from 'react'
import { styled } from '@mui/material'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Masonry from '@mui/lab/Masonry'
import { DashboardRounded } from '@mui/icons-material'

import { useProgress } from '/components/progress/ProgressProvider'
import ErrorMsg from '/apps/sage/ErrorMsg'
import RequireAuth from '/components/auth/RequireAuth'

import StatsOverview from './StatsOverview'
import Achievements from './Achievements'
import DataSummary from './DataSummary'
import NodesOverview from './NodesOverview'
import ProjectsSection from './ProjectsSection'
import AppsSection from './AppsSection'
import JobsSection from './JobsSection'
import Calendar from './Calendar'
import News from './News'
import { Card } from '/components/layout/Layout'
import { NewspaperRounded, CalendarMonthRounded } from '@mui/icons-material'

import * as BK from '/components/apis/beekeeper'
import * as ECR from '/components/apis/ecr'
import * as ES from '/components/apis/ses'
import Auth from '/components/auth/auth'


type DashboardProject = Awaited<ReturnType<typeof BK.getUserNodesAndProjects>>['projects'][number] & {
  members?: { username: string }[]
}



export default function Dashboard() {
  const {setLoading} = useProgress()

  const [allNodes, setAllNodes] = useState<BK.Node[]>()
  const [projects, setProjects] = useState<DashboardProject[]>()
  const [apps, setApps] = useState<ECR.AppDetails[]>()
  const [userJobs, setUserJobs] = useState<ES.Job[]>()
  const [sensors, setSensors] = useState<BK.SensorListRow[]>()
  const [projectFilter, setProjectFilter] = useState<'all' | 'SAGE' | 'SGT'>('all')
  const [selectedNodes, setSelectedNodes] = useState<BK.Node[]>([])
  const [feedTab, setFeedTab] = useState<'news' | 'calendar'>('news')

  const [error, setError] = useState(null)

  useEffect(() => {
    if (!Auth.isSignedIn) return

    setLoading(true)

    // Fetch user nodes and projects (includes access info)
    const p1 = BK.getUserNodesAndProjects()
      .then(({nodes, projects}) => {
        setAllNodes(nodes)
        setProjects(projects)
      })
      .catch(err => setError(err))

    // Fetch apps
    const p2 = ECR.listApps('mine')
      .then(data => setApps(data))
      .catch(err => setError(err))

    // Fetch jobs
    const p3 = ES.getJobs()
      .then(data => {
        const userJobs = data.filter(job => job.user === Auth.user)
        setUserJobs(userJobs)
      })
      .catch(err => setError(err))

    // Fetch sensors - will be filtered by user's nodes after nodes are loaded
    const p4 = BK.getSensors()
      .then(data => setSensors(data))
      .catch(err => setError(err))

    Promise.all([p1, p2, p3, p4])
      .finally(() => setLoading(false))

  }, [setLoading])


  // Calculate stats
  const uniqueNodes = allNodes?.length
  const totalProjects = projects?.length
  const uniqueMembers = projects
    ? new Set(projects.flatMap(p => (p.members || []).map(m => m.username))).size
    : undefined
  const totalApps = apps?.length
  const activeJobs = userJobs?.filter(job => {
    const status = job.state.last_state?.toLowerCase()
    return status === 'scheduled' || status === 'running'
  }).length

  const totalJobs = userJobs?.length

  const statsLoading = [
    uniqueNodes,
    totalProjects,
    uniqueMembers,
    totalApps,
    activeJobs,
    totalJobs
  ].some(value => value === undefined)

  const achievementsLoading = [
    totalApps,
    totalJobs,
    uniqueNodes,
    totalProjects
  ].some(value => value === undefined)

  const filteredNodes = allNodes?.filter(node => {
    if (projectFilter === 'all') return true
    return node.project?.includes(projectFilter)
  })

  const filteredNodeVSNs = new Set(filteredNodes?.map(node => node.vsn) || [])

  const filteredSensors = sensors?.filter(sensor =>
    sensor.vsns.some(vsn => filteredNodeVSNs.has(vsn))
  )

  const filteredAllJobs = userJobs?.filter(job =>
    job.nodes.some(vsn => filteredNodeVSNs.has(vsn))
  )

  return (
    <RequireAuth>
      <Root>
        <TopSection>
          <LeftColumn>
            <HeaderRow>
              <Header>
                <HeaderIcon><DashboardRounded /></HeaderIcon>
                <div>
                  <h1 className="no-margin">Dashboard</h1>
                  <Subtitle>Welcome back, {Auth.user}</Subtitle>
                </div>
              </Header>
            </HeaderRow>

            {error && <ErrorMsg>{error.message}</ErrorMsg>}

            <StatsOverview
              uniqueNodes={uniqueNodes}
              totalProjects={totalProjects}
              uniqueMembers={uniqueMembers}
              totalApps={totalApps}
              activeJobs={activeJobs}
              totalJobs={totalJobs}
              loading={statsLoading}
              lastSlot={
                <Achievements
                  totalApps={totalApps}
                  totalJobs={totalJobs}
                  uniqueNodes={uniqueNodes}
                  totalProjects={totalProjects}
                  loading={achievementsLoading}
                />
              }
            />
          </LeftColumn>

          <RightColumn>
            <FeedTabsCard>
              <Tabs
                value={feedTab}
                onChange={(_, value) => setFeedTab(value)}
                variant="fullWidth"
                sx={{minHeight: 42}}
              >
                <Tab
                  value="news"
                  label="News"
                  icon={<NewspaperRounded />}
                  iconPosition="start"
                  sx={{minHeight: 42}}
                />
                <Tab
                  value="calendar"
                  label="Calendar"
                  icon={<CalendarMonthRounded />}
                  iconPosition="start"
                  sx={{minHeight: 42}}
                />
              </Tabs>

              <FeedBody>
                {feedTab === 'news' ? <News /> : <Calendar />}
              </FeedBody>
            </FeedTabsCard>
          </RightColumn>
        </TopSection>

        <DataSummary
          allNodes={selectedNodes.length > 0 ? selectedNodes : filteredNodes}
          allJobs={filteredAllJobs}
          projectFilter={projectFilter}
          onProjectFilterChange={setProjectFilter}
          allNodesCount={allNodes?.length ?? 0}
          sageNodesCount={allNodes?.filter(n => n.project?.includes('SAGE')).length}
          sgtNodesCount={allNodes?.filter(n => n.project?.includes('SGT')).length}
        />

        <NodesOverview
          allNodes={filteredNodes}
          sensors={filteredSensors}
          projectFilter={projectFilter}
          onProjectFilterChange={setProjectFilter}
          onNodeSelect={setSelectedNodes}
          allNodesCount={allNodes?.length ?? 0}
          sageNodesCount={allNodes?.filter(n => n.project?.includes('SAGE')).length}
          sgtNodesCount={allNodes?.filter(n => n.project?.includes('SGT')).length}
        />

        <Masonry columns={{ xs: 1, sm: 1, md: 2, lg: 2 }} spacing={2}>
          <ProjectsSection projects={projects} />
          <AppsSection apps={apps} />
          <JobsSection jobs={userJobs} />
        </Masonry>
      </Root>
    </RequireAuth>
  )
}


const Root = styled('div')`
  max-width: 1400px;
  margin: 2rem auto;
  padding: 0 2rem;
`

const TopSection = styled('div')`
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;

  @media (max-width: 1200px) {
    flex-direction: column;
  }
`

const LeftColumn = styled('div')`
  flex: 1;
`

const HeaderRow = styled('div')`
  display: block;
  margin-bottom: 0.75rem;
`

const RightColumn = styled('div')`
  width: 400px;
  min-width: 400px;
  display: flex;
  flex-direction: column;

  @media (max-width: 1200px) {
    width: 100%;
    min-width: 100%;
  }
`

const Header = styled('div')`
  display: flex;
  align-items: center;
  gap: 1rem;
`

const HeaderIcon = styled('div')`
  svg {
    font-size: 3em;
    color: ${({ theme }) => theme.palette.primary.main};
  }
`

const Subtitle = styled('p')`
  margin: 0.5rem 0 0 0;
  color: ${({ theme }) => theme.palette.text.secondary};
  font-size: 1.1em;
`

const FeedTabsCard = styled(Card)`
  margin: 1rem 0 0;
  padding: 0;
  overflow: hidden;
`

const FeedBody = styled('div')`
  padding: 0.85rem 1rem 1rem;
`


