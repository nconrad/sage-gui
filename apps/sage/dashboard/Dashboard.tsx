import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { styled } from '@mui/material'

import Masonry from '@mui/lab/Masonry'
import {
  DashboardRounded, HubOutlined, WorkOutline, AppsRounded, PlaylistAddCheckRounded,
  TrendingUpRounded, ArrowForwardRounded, GroupOutlined,
  FilePresentOutlined,
  TerminalOutlined,
  ViewTimelineOutlined
} from '@mui/icons-material'
import { Button, ButtonGroup, Tooltip } from '@mui/material'

import { useProgress } from '/components/progress/ProgressProvider'
import { Card } from '/components/layout/Layout'
import { CapabilityIconContainer, DisabledOverlay } from '/components/utils/CapabilityIcon'
import Table from '/components/table/Table'
import ErrorMsg from '/apps/sage/ErrorMsg'
import RequireAuth from '/components/auth/RequireAuth'
import MapGL from '/components/Map'

import * as BK from '/components/apis/beekeeper'
import * as User from '/components/apis/user'
import * as ECR from '/components/apis/ecr'
import * as ES from '/components/apis/ses'
import Auth from '/components/auth/auth'
import { relativeTime } from '/components/utils/units'

import { formatters as appFormatters } from '../ecr/formatters'


// Mini table columns for quick view
const nodeColumns = [{
  id: 'vsn',
  label: 'Node',
  format: (vsn) => <Link to={`/node/${vsn}`}><b>{vsn}</b></Link>
}, {
  id: 'city',
  label: 'City',
}, {
  id: 'access',
  label: 'Access',
  format: (access: User.AccessPerm[] = []) => {
    const hasFiles = access.includes('files')
    const hasDevelop = access.includes('develop')
    const hasSchedule = access.includes('schedule')

    return (
      <AccessIconsContainer>
        <Tooltip title="File (image, audio, etc.) Access" placement="top" arrow>
          <CapabilityIconContainer available={hasFiles}>
            <FilePresentOutlined />
            {!hasFiles && <DisabledOverlay />}
          </CapabilityIconContainer>
        </Tooltip>
        <Tooltip title="Develop / ssh Remote Access" placement="top" arrow>
          <CapabilityIconContainer available={hasDevelop}>
            <TerminalOutlined />
            {!hasDevelop && <DisabledOverlay />}
          </CapabilityIconContainer>
        </Tooltip>
        <Tooltip title="Job Scheduling Access" placement="top" arrow>
          <CapabilityIconContainer available={hasSchedule}>
            <ViewTimelineOutlined />
            {!hasSchedule && <DisabledOverlay />}
          </CapabilityIconContainer>
        </Tooltip>
      </AccessIconsContainer>
    )
  }
}]


const appColumns = [{
  id: 'name',
  label: 'App',
  format: appFormatters.name
}, {
  id: 'namespace',
  label: 'Namespace'
}, {
  id: 'versions',
  label: 'Tags',
  format: appFormatters.versions
}, {
  id: 'time_last_updated',
  label: 'Last Update',
  format: appFormatters.time
}]


const jobColumns = [{
  id: 'name',
  label: 'Job',
  format: (val, row) => <Link to={`/jobs/my-jobs?job=${row.id}`}>{val}</Link>
}, {
  id: 'status',
  label: 'Status',
  format: (_, obj) => {
    let status = obj.state.last_state || '-'
    status = status.toLowerCase()
    return <b className={status}>{status}</b>
  }
}, {
  id: 'nodes',
  label: 'Nodes',
  format: (nodes) => nodes.length
}, {
  id: 'last_submitted',
  label: 'Submitted',
  format: (val) => relativeTime(val) || '-'
}]


const projectColumns = [{
  id: 'name',
  label: 'Project',
  format: (name, obj) => <Link to={`/user/${Auth.user}/teams/${obj.name}`}><b>{name}</b></Link>
}, {
  id: 'nodes',
  label: 'Nodes',
  format: (nodes) => nodes.length
}, {
  id: 'members',
  label: 'Members',
  format: (members, obj) =>
    <Link to={`/user/${Auth.user}/teams/${obj.name}`}>
      {members.length}
    </Link>
}]


export default function Dashboard() {
  const {setLoading} = useProgress()

  const [allNodes, setAllNodes] = useState<BK.Node[]>() // All user nodes for map
  const [projects, setProjects] = useState<User.Project[]>()
  const [apps, setApps] = useState<ECR.AppDetails[]>()
  const [jobs, setJobs] = useState<ES.Job[]>()
  const [projectFilter, setProjectFilter] = useState<'all' | 'SAGE' | 'SGT'>('all')
  const [accessFilters, setAccessFilters] = useState<Set<User.AccessPerm>>(new Set())
  const [showAllAchievements, setShowAllAchievements] = useState(false)

  const [error, setError] = useState(null)

  const toggleAccessFilter = (access: User.AccessPerm) => {
    setAccessFilters(prev => {
      const newFilters = new Set(prev)
      if (newFilters.has(access)) {
        newFilters.delete(access)
      } else {
        newFilters.add(access)
      }
      return newFilters
    })
  }

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
      .then(data => setApps(data.slice(0, 5))) // Show only 5 most recent
      .catch(err => setError(err))

    // Fetch jobs
    const p3 = ES.getJobs()
      .then(data => {
        const userJobs = data.filter(job => job.user === Auth.user)
        setJobs(userJobs.slice(0, 5)) // Show only 5 most recent
      })
      .catch(err => setError(err))

    Promise.all([p1, p2, p3])
      .finally(() => setLoading(false))

  }, [setLoading])


  // Calculate stats
  const uniqueNodes = allNodes?.length || 0
  const totalProjects = projects?.length || 0
  const uniqueMembers = projects ? new Set(projects.flatMap(p => p.members.map(m => m.username))).size : 0
  const totalApps = apps?.length || 0
  const activeJobs = jobs?.filter(job => {
    const status = job.state.last_state?.toLowerCase()
    return status === 'scheduled' || status === 'running'
  }).length || 0
  const totalJobs = jobs?.length || 0

  // Filter nodes based on project and access filters
  const filteredNodes = allNodes?.filter(node => {
    // Project filter
    if (projectFilter !== 'all' && !node.project?.includes(projectFilter)) {
      return false
    }

    // Access filter - if any access filters are set, node must have ALL selected access types
    if (accessFilters.size > 0) {
      const nodeAccess = node.access || []
      return Array.from(accessFilters).every(requiredAccess =>
        nodeAccess.includes(requiredAccess)
      )
    }

    return true
  }) || []

  // Map nodes with required properties
  const mapNodes = filteredNodes.map(node => ({
    ...node,
    sensor: node.sensors?.map(s => s.hw_model) || [],
    status: 'unknown', // Status will be determined by MapGL from live data
    elapsedTimes: {} // Will be populated by live data if available
  }))

  // Table nodes (access already included from getUserNodesAndProjects)
  const tableNodes = filteredNodes

  // Define all achievements
  const allAchievements = [
    {
      id: 'app-creator',
      icon: '🚀',
      name: 'App Creator',
      description: 'Create your first app',
      progress: totalApps,
      target: 1,
      earned: totalApps >= 1
    },
    {
      id: 'app-master',
      icon: '⭐',
      name: 'App Master',
      description: 'Create 5 apps',
      progress: totalApps,
      target: 5,
      earned: totalApps >= 5
    },
    {
      id: 'app-publisher',
      icon: '📦',
      name: 'App Publisher',
      description: 'Create 10 apps',
      progress: totalApps,
      target: 10,
      earned: totalApps >= 10
    },
    {
      id: 'job-runner',
      icon: '🔥',
      name: 'Job Runner',
      description: 'Run 10 jobs',
      progress: totalJobs,
      target: 10,
      earned: totalJobs >= 10
    },
    {
      id: 'power-user',
      icon: '💎',
      name: 'Power User',
      description: 'Run 50 jobs',
      progress: totalJobs,
      target: 50,
      earned: totalJobs >= 50
    },
    {
      id: 'job-expert',
      icon: '🏆',
      name: 'Job Expert',
      description: 'Run 100 jobs',
      progress: totalJobs,
      target: 100,
      earned: totalJobs >= 100
    },
    {
      id: 'network-builder',
      icon: '🌐',
      name: 'Network Builder',
      description: 'Access 3+ nodes',
      progress: uniqueNodes,
      target: 3,
      earned: uniqueNodes >= 3
    },
    {
      id: 'node-collector',
      icon: '🎯',
      name: 'Node Collector',
      description: 'Access 10+ nodes',
      progress: uniqueNodes,
      target: 10,
      earned: uniqueNodes >= 10
    },
    {
      id: 'team-player',
      icon: '🤝',
      name: 'Team Player',
      description: 'Join 2+ projects',
      progress: totalProjects,
      target: 2,
      earned: totalProjects >= 2
    },
    {
      id: 'community-builder',
      icon: '🌟',
      name: 'Community Builder',
      description: 'Join 5+ projects',
      progress: totalProjects,
      target: 5,
      earned: totalProjects >= 5
    }
  ]

  // Filter achievements based on toggle
  const displayedAchievements = showAllAchievements
    ? allAchievements
    : allAchievements.filter(a => a.earned)

  const earnedCount = allAchievements.filter(a => a.earned).length

  return (
    <RequireAuth>
      <Root>
        <TopSection>
          <LeftColumn>
            <Header>
              <HeaderIcon><DashboardRounded /></HeaderIcon>
              <div>
                <h1 className="no-margin">Dashboard</h1>
                <Subtitle>Welcome back, {Auth.user}</Subtitle>
              </div>
            </Header>

            {error && <ErrorMsg>{error.message}</ErrorMsg>}

            {/* Stats Overview */}
            <StatsContainer>
              <StatsGrid>
                <StatCard>
                  <StatIcon><HubOutlined /></StatIcon>
                  <StatContent>
                    <StatValue>{uniqueNodes}</StatValue>
                    <StatLabel>My Node{uniqueNodes !== 1 ? 's' : ''}</StatLabel>
                  </StatContent>
                </StatCard>

                <StatCard>
                  <StatIcon><WorkOutline /></StatIcon>
                  <StatContent>
                    <StatValue>{totalProjects}</StatValue>
                    <StatLabel>Project{totalProjects !== 1 ? 's' : ''}</StatLabel>
                  </StatContent>
                </StatCard>

                <StatCard>            <StatIcon><GroupOutlined /></StatIcon>
                  <StatContent>
                    <StatValue>{uniqueMembers}</StatValue>
                    <StatLabel>Team Member{uniqueMembers !== 1 ? 's' : ''}</StatLabel>
                  </StatContent>
                </StatCard>

                <StatCard>            <StatIcon><AppsRounded /></StatIcon>
                  <StatContent>
                    <StatValue>{totalApps}</StatValue>
                    <StatLabel>My App{totalApps !== 1 ? 's' : ''}</StatLabel>
                  </StatContent>
                </StatCard>

                <StatCard>
                  <StatIcon><PlaylistAddCheckRounded /></StatIcon>
                  <StatContent>
                    <StatValue>
                      {activeJobs > 0 ? <ActiveValue>{activeJobs}</ActiveValue> : totalJobs}
                    </StatValue>
                    <StatLabel>
                      {activeJobs > 0 ? `Active Job${activeJobs !== 1 ? 's' : ''}` : 'Recent Jobs'}
                    </StatLabel>
                  </StatContent>
                </StatCard>
              </StatsGrid>
            </StatsContainer>
          </LeftColumn>

          {/* Achievements Section */}
          <AchievementsCard>
            <AchievementsHeader>
              <AchievementsTitle>
                <TrendingUpRounded /> Achievements
              </AchievementsTitle>
              {earnedCount < allAchievements.length && !showAllAchievements && (
                <ToggleButton onClick={() => setShowAllAchievements(true)}>
                  Show All ({allAchievements.length - earnedCount} more)
                </ToggleButton>
              )}
              {showAllAchievements && (
                <ToggleButton onClick={() => setShowAllAchievements(false)}>
                  Show Earned
                </ToggleButton>
              )}
            </AchievementsHeader>
            <BadgesGrid>
              {displayedAchievements.map(achievement => (
                <Tooltip key={achievement.id} title={achievement.description} placement="top" arrow>
                  <Badge earned={achievement.earned} showAll={showAllAchievements}>
                    <BadgeIcon>{achievement.icon}</BadgeIcon>
                    <BadgeName>{achievement.name}</BadgeName>
                    <BadgeProgress>{achievement.progress}/{achievement.target}</BadgeProgress>
                  </Badge>
                </Tooltip>
              ))}
            </BadgesGrid>
          </AchievementsCard>
        </TopSection>

        {/* Filters Section */}
        {allNodes && allNodes.length > 0 && (
          <GlobalFilterSection className="flex justify-between">
            <FilterGroup className="flex column items-start flex-wrap">
              <FilterLabel>Project</FilterLabel>
              <ButtonGroup size="medium" variant="outlined">
                <Button
                  onClick={() => setProjectFilter('all')}
                  variant={projectFilter === 'all' ? 'contained' : 'outlined'}
                >
                  All ({allNodes.length})
                </Button>
                <Button
                  onClick={() => setProjectFilter('SAGE')}
                  variant={projectFilter === 'SAGE' ? 'contained' : 'outlined'}
                >
                  Sage ({allNodes.filter(n => n.project?.includes('SAGE')).length})
                </Button>
                <Button
                  onClick={() => setProjectFilter('SGT')}
                  variant={projectFilter === 'SGT' ? 'contained' : 'outlined'}
                >
                  SGT ({allNodes.filter(n => n.project?.includes('SGT')).length})
                </Button>
              </ButtonGroup>
            </FilterGroup>

            <FilterGroup className="flex column items-start flex-wrap">
              <FilterLabel>Access</FilterLabel>
              <ButtonGroup size="medium" variant="outlined">
                <Button
                  onClick={() => toggleAccessFilter('files')}
                  variant={accessFilters.has('files') ? 'contained' : 'outlined'}
                  startIcon={<FilePresentOutlined />}
                >
                  Files
                </Button>
                <Button
                  onClick={() => toggleAccessFilter('develop')}
                  variant={accessFilters.has('develop') ? 'contained' : 'outlined'}
                  startIcon={<TerminalOutlined />}
                >
                  Develop
                </Button>
                <Button
                  onClick={() => toggleAccessFilter('schedule')}
                  variant={accessFilters.has('schedule') ? 'contained' : 'outlined'}
                  startIcon={<ViewTimelineOutlined />}
                >
                  Schedule
                </Button>
              </ButtonGroup>
            </FilterGroup>
          </GlobalFilterSection>
        )}

        {/* Content Sections */}
        <Masonry columns={{ xs: 1, sm: 1, md: 2, lg: 2 }} spacing={2}>
          {/* Map Section */}
          {allNodes && allNodes.length > 0 && (
            <Section>
              <Card>
                <SectionHeader>
                  <SectionTitle>
                    <HubOutlined /> My Nodes Map
                  </SectionTitle>
                </SectionHeader>
                <MapContainer>
                  <MapGL
                    data={mapNodes}
                    updateID={`${projectFilter}-${Array.from(accessFilters).sort().join(',')}`}
                    markerClass="blue-dot"
                  />
                </MapContainer>
              </Card>
            </Section>
          )}

          {/* Nodes Section */}
          <Section>
            <Card>
              <SectionHeader>
                <SectionTitle>
                  <HubOutlined /> My Nodes
                </SectionTitle>
                {tableNodes && tableNodes.length > 0 &&
                  <ViewAllLink to={`/user/${Auth.user}/nodes`}>
                    View All <ArrowForwardRounded fontSize="small" />
                  </ViewAllLink>
                }
              </SectionHeader>
              {tableNodes && tableNodes.length > 0 ? (
                <ScrollableTableContainer>
                  <Table
                    primaryKey="vsn"
                    columns={nodeColumns}
                    rows={tableNodes}
                  />
                </ScrollableTableContainer>
              ) : (
                <EmptyState>
                  <EmptyIcon><HubOutlined /></EmptyIcon>
                  <p>No nodes found for this filter</p>
                  <Link to="/nodes">Browse Available Nodes</Link>
                </EmptyState>
              )}
            </Card>
          </Section>

          {/* Projects Section */}
          <Section>
            <Card>
              <SectionHeader>
                <SectionTitle>
                  <WorkOutline /> My Projects
                </SectionTitle>
                {projects && projects.length > 0 &&
                  <ViewAllLink to={`/user/${Auth.user}/projects`}>
                    View All <ArrowForwardRounded fontSize="small" />
                  </ViewAllLink>
                }
              </SectionHeader>
              {projects && projects.length > 0 ? (
                <Table
                  primaryKey="name"
                  columns={projectColumns}
                  rows={projects}
                  pagination={false}
                  enableSorting={false}
                />
              ) : (
                <EmptyState>
                  <EmptyIcon><WorkOutline /></EmptyIcon>
                  <p>You're not part of any projects yet</p>
                </EmptyState>
              )}
            </Card>
          </Section>

          {/* Apps Section */}
          <Section>
            <Card>
              <SectionHeader>
                <SectionTitle>
                  <AppsRounded /> My Apps
                </SectionTitle>
                {apps && apps.length > 0 &&
                  <ViewAllLink to="/apps/my-apps">
                    View All <ArrowForwardRounded fontSize="small" />
                  </ViewAllLink>
                }
              </SectionHeader>
              {apps && apps.length > 0 ? (
                <Table
                  primaryKey="id"
                  columns={appColumns}
                  rows={apps}
                  pagination={false}
                  enableSorting={false}
                />
              ) : (
                <EmptyState>
                  <EmptyIcon><AppsRounded /></EmptyIcon>
                  <p>You haven't created any apps yet</p>
                  <Link to="/apps/create-app">Create Your First App</Link>
                </EmptyState>
              )}
            </Card>
          </Section>

          {/* Jobs Section */}
          <Section>
            <Card>
              <SectionHeader>
                <SectionTitle>
                  <PlaylistAddCheckRounded /> Recent Jobs
                </SectionTitle>
                {jobs && jobs.length > 0 &&
                  <ViewAllLink to="/jobs/my-jobs">
                    View All <ArrowForwardRounded fontSize="small" />
                  </ViewAllLink>
                }
              </SectionHeader>
              {jobs && jobs.length > 0 ? (
                <Table
                  primaryKey="id"
                  columns={jobColumns}
                  rows={jobs}
                  pagination={false}
                  enableSorting={false}
                />
              ) : (
                <EmptyState>
                  <EmptyIcon><PlaylistAddCheckRounded /></EmptyIcon>
                  <p>You haven't submitted any jobs yet</p>
                  <Link to="/jobs/create-job">Create Your First Job</Link>
                </EmptyState>
              )}
            </Card>
          </Section>
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
  margin-bottom: 3rem;

  @media (max-width: 1200px) {
    flex-direction: column;
  }
`

const LeftColumn = styled('div')`
  flex: 1;
`

const Header = styled('div')`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
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

const StatsContainer = styled('div')`
  /* Stats layout */
`

const StatsGrid = styled('div')`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  flex: 1;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`

const GlobalFilterSection = styled('div')`
  padding: 1.5rem;
  background: ${({ theme }) => theme.palette.mode === 'dark' ? '#2a2a2a' : '#f8f9fa'};
  border: 1px solid ${({ theme }) => theme.palette.mode === 'dark' ? '#444' : '#e0e0e0'};
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`

const FilterGroup = styled('div')`

`

const FilterLabel = styled('span')`
  font-weight: 600;
  color: ${({ theme }) => theme.palette.mode === 'dark' ? '#fff' : '#333'};
`

const MapContainer = styled('div')`
  height: 400px;
  border-radius: 8px;
  overflow: hidden;
`

const ScrollableTableContainer = styled('div')`
  max-height: 400px;
  overflow-y: auto;
  overflow-x: auto;
`

const StatCard = styled('div')`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-left: 3px solid ${({ theme }) => theme.palette.primary.main};
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  &:hover {
    border-color: ${({ theme }) => theme.palette.primary.main};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
`

const StatIcon = styled('div')`
  svg {
    font-size: 3em;
    color: ${({ theme }) => theme.palette.primary.main};
    opacity: 0.9;
  }
`

const StatContent = styled('div')`
  flex: 1;
`

const StatValue = styled('div')`
  font-size: 2em;
  font-weight: bold;
  color: ${({ theme }) => theme.palette.mode === 'dark' ? '#fff' : '#333'};
  line-height: 1;
  margin-bottom: 0.25rem;
`

const ActiveValue = styled('span')`
  color: ${({ theme }) => theme.palette.success.main};
`

const StatLabel = styled('div')`
  font-size: 0.875em;
  color: ${({ theme }) => theme.palette.mode === 'dark' ? '#999' : '#666'};
  font-weight: 500;
`

const Section = styled('div')`
  /* Card styles handled by Card component */
`

const SectionHeader = styled('div')`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid ${({ theme }) => theme.palette.mode === 'dark' ? '#444' : '#e0e0e0'};
`

const SectionTitle = styled('h2')`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25em;
  color: ${({ theme }) => theme.palette.mode === 'dark' ? '#fff' : '#333'};

  svg {
    color: ${({ theme }) => theme.palette.primary.main};
  }
`

const ViewAllLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: ${({ theme }) => theme.palette.primary.main};
  text-decoration: none;
  font-size: 0.9em;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    gap: 0.5rem;
    text-decoration: underline;
  }

  svg {
    transition: transform 0.2s ease;
  }

  &:hover svg {
    transform: translateX(4px);
  }
`

const EmptyState = styled('div')`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.palette.text.secondary};

  p {
    margin: 1rem 0;
    font-size: 1.1em;
  }

  a {
    color: ${({ theme }) => theme.palette.primary.main};
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
`

const EmptyIcon = styled('div')`
  svg {
    font-size: 4em;
    opacity: 0.3;
  }
`

const AchievementsCard = styled('div')`
  min-width: 450px;
  max-width: 450px;
  display: flex;
  flex-direction: column;

  @media (max-width: 1200px) {
    min-width: 100%;
    max-width: 100%;
  }
`

const AchievementsHeader = styled('div')`
  margin-bottom: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const ToggleButton = styled('button')`
  padding: 0.4rem 0.8rem;
  background: transparent;
  border: 1.5px solid ${({ theme }) => theme.palette.primary.main};
  border-radius: 6px;
  color: ${({ theme }) => theme.palette.primary.main};
  font-weight: 600;
  font-size: 0.75em;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.palette.primary.main};
    color: #fff;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(0);
  }
`

const AchievementsTitle = styled('h3')`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 1.1em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.palette.mode === 'dark' ? '#999' : '#666'};

  svg {
    color: ${({ theme }) => theme.palette.primary.main};
    font-size: 1.2em;
  }
`

const BadgesGrid = styled('div')`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
`

const Badge = styled('div')<{ earned: boolean; showAll: boolean }>`
  background: ${({ theme, earned, showAll }) =>
    showAll
      ? (earned
        ? (theme.palette.mode === 'dark' ? '#1e3a2e' : '#e8f5e9')
        : (theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5'))
      : 'transparent'
};
  border: ${({ theme, earned, showAll }) =>
    showAll
      ? `2px solid ${earned
        ? (theme.palette.mode === 'dark' ? '#4caf50' : '#4caf50')
        : (theme.palette.mode === 'dark' ? '#333' : '#ddd')}`
      : 'none'
};
  border-radius: 12px;
  padding: 1rem 0.75rem;
  text-align: center;
  transition: all 0.2s ease;
  opacity: ${({ earned, showAll }) => (showAll && !earned) ? 0.5 : 1};
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;

  &:hover {
    transform: ${({ showAll }) => showAll ? 'scale(1.05)' : 'scale(1.1)'};
    box-shadow: ${({ showAll }) => showAll ? '0 4px 12px rgba(0, 0, 0, 0.2)' : 'none'};
    opacity: ${({ earned, showAll }) => (showAll && !earned) ? 0.75 : 1};
    border-color: ${({ theme, earned, showAll }) =>
    showAll
      ? (earned
        ? theme.palette.success.light
        : (theme.palette.mode === 'dark' ? '#555' : '#aaa'))
      : 'transparent'
};
  }
`

const BadgeIcon = styled('div')`
  font-size: 3em;
  line-height: 1;
`

const BadgeName = styled('div')`
  font-weight: 600;
  font-size: 0.85em;
  color: ${({ theme }) => theme.palette.mode === 'dark' ? '#fff' : '#333'};
  line-height: 1.2;
`

const BadgeProgress = styled('div')`
  font-size: 0.8em;
  font-weight: 700;
  color: ${({ theme }) => theme.palette.primary.main};
`

const AccessIconsContainer = styled('div')`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`
