import { Link } from 'react-router-dom'
import { styled } from '@mui/material'
import {
  HubOutlined, WorkOutline, AppsRounded,
  PlaylistAddCheckRounded, GroupOutlined
} from '@mui/icons-material'

import Auth from '/components/auth/auth'


type StatsOverviewProps = {
  uniqueNodes?: number
  totalProjects?: number
  uniqueMembers?: number
  totalApps?: number
  activeJobs?: number
  totalJobs?: number
  loading?: boolean
}


export default function StatsOverview({
  uniqueNodes,
  totalProjects,
  uniqueMembers,
  totalApps,
  activeJobs,
  totalJobs,
  loading = false
}: StatsOverviewProps) {
  const formatValue = (value?: number) => (loading || value === undefined ? '...' : value)
  const isLoaded = (value?: number) => !loading && value !== undefined
  const jobsLoaded = isLoaded(activeJobs) && isLoaded(totalJobs)
  const hasActiveJobs = jobsLoaded && (activeJobs ?? 0) > 0

  return (
    <StatsContainer>
      <StatsGrid>
        <StatCard as={Link} to={`/user/${Auth.user}/nodes`}>
          <StatIcon><HubOutlined /></StatIcon>
          <StatContent>
            <StatValue>{formatValue(uniqueNodes)}</StatValue>
            <StatLabel>
              My Node{isLoaded(uniqueNodes) && uniqueNodes !== 1 ? 's' : ''}
            </StatLabel>
          </StatContent>
        </StatCard>

        <StatCard as={Link} to={`/user/${Auth.user}/projects`}>
          <StatIcon><WorkOutline /></StatIcon>
          <StatContent>
            <StatValue>{formatValue(totalProjects)}</StatValue>
            <StatLabel>
              Project{isLoaded(totalProjects) && totalProjects !== 1 ? 's' : ''}
            </StatLabel>
          </StatContent>
        </StatCard>

        <StatCard as={Link} to={`/user/${Auth.user}/projects`}>
          <StatIcon><GroupOutlined /></StatIcon>
          <StatContent>
            <StatValue>{formatValue(uniqueMembers)}</StatValue>
            <StatLabel>
              Team Member{isLoaded(uniqueMembers) && uniqueMembers !== 1 ? 's' : ''}
            </StatLabel>
          </StatContent>
        </StatCard>

        <StatCard as={Link} to="/apps/my-apps">
          <StatIcon><AppsRounded /></StatIcon>
          <StatContent>
            <StatValue>{formatValue(totalApps)}</StatValue>
            <StatLabel>
              App{isLoaded(totalApps) && totalApps !== 1 ? 's' : ''}
            </StatLabel>
          </StatContent>
        </StatCard>

        <StatCard as={Link} to="/jobs/my-jobs">
          <StatIcon><PlaylistAddCheckRounded /></StatIcon>
          <StatContent>
            <StatValue>
              {loading || !jobsLoaded
                ? '...'
                : (hasActiveJobs
                  ? <ActiveValue>{activeJobs}</ActiveValue>
                  : totalJobs)}
            </StatValue>
            <StatLabel>
              {loading || !jobsLoaded
                ? 'Active Jobs'
                : (hasActiveJobs
                  ? `Active Job${activeJobs !== 1 ? 's' : ''}`
                  : 'Recent Jobs')}
            </StatLabel>
          </StatContent>
        </StatCard>
      </StatsGrid>
    </StatsContainer>
  )
}


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

const StatCard = styled('div')`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-left: 3px solid ${({ theme }) => theme.palette.primary.main};
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  text-decoration: none;
  color: inherit;
  cursor: pointer;

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
