import { useState } from 'react'
import { Skeleton, styled } from '@mui/material'
import { TrendingUpRounded } from '@mui/icons-material'
import { Tooltip } from '@mui/material'


type Achievement = {
  id: string
  icon: string
  name: string
  description: string
  category: 'apps' | 'jobs' | 'nodes' | 'projects'
  progress: number
  target: number
  earned: boolean
}

type AchievementsProps = {
  totalApps?: number
  totalJobs?: number
  uniqueNodes?: number
  totalProjects?: number
  loading?: boolean
}


export default function Achievements({
  totalApps,
  totalJobs,
  uniqueNodes,
  totalProjects,
  loading = false
}: AchievementsProps) {
  const appsCount = totalApps ?? 0
  const jobsCount = totalJobs ?? 0
  const nodesCount = uniqueNodes ?? 0
  const projectsCount = totalProjects ?? 0

  // Define all achievements
  const allAchievements: Achievement[] = [
    {
      id: 'app-creator',
      category: 'apps',
      icon: '🚀',
      name: 'App Creator',
      description: 'Create your first app',
      progress: appsCount,
      target: 1,
      earned: appsCount >= 1
    },
    {
      id: 'app-master',
      category: 'apps',
      icon: '⭐',
      name: 'App Master',
      description: 'Create 5 apps',
      progress: appsCount,
      target: 5,
      earned: appsCount >= 5
    },
    {
      id: 'app-publisher',
      category: 'apps',
      icon: '📦',
      name: 'App Publisher',
      description: 'Create 10 apps',
      progress: appsCount,
      target: 10,
      earned: appsCount >= 10
    },
    {
      id: 'job-runner',
      category: 'jobs',
      icon: '🔥',
      name: 'Job Runner',
      description: 'Run 10 jobs',
      progress: jobsCount,
      target: 10,
      earned: jobsCount >= 10
    },
    {
      id: 'power-user',
      category: 'jobs',
      icon: '💎',
      name: 'Power User',
      description: 'Run 50 jobs',
      progress: jobsCount,
      target: 50,
      earned: jobsCount >= 50
    },
    {
      id: 'job-expert',
      category: 'jobs',
      icon: '🏆',
      name: 'Job Expert',
      description: 'Run 100 jobs',
      progress: jobsCount,
      target: 100,
      earned: jobsCount >= 100
    },
    {
      id: 'network-builder',
      category: 'nodes',
      icon: '🌐',
      name: 'Network Builder',
      description: 'Access 3+ nodes',
      progress: nodesCount,
      target: 3,
      earned: nodesCount >= 3
    },
    {
      id: 'node-collector',
      category: 'nodes',
      icon: '🎯',
      name: 'Node Collector',
      description: 'Access 10+ nodes',
      progress: nodesCount,
      target: 10,
      earned: nodesCount >= 10
    },
    {
      id: 'team-player',
      category: 'projects',
      icon: '🤝',
      name: 'Team Player',
      description: 'Join 2+ projects',
      progress: projectsCount,
      target: 2,
      earned: projectsCount >= 2
    },
    {
      id: 'community-builder',
      category: 'projects',
      icon: '🌟',
      name: 'Community Builder',
      description: 'Join 5+ projects',
      progress: projectsCount,
      target: 5,
      earned: projectsCount >= 5
    }
  ]

  const [showAllAchievements, setShowAllAchievements] = useState(false)

  // Filter achievements based on toggle
  const highestByCategory = Object.values(
    allAchievements.reduce<Record<string, Achievement[]>>((acc, achievement) => {
      acc[achievement.category] = acc[achievement.category] || []
      acc[achievement.category].push(achievement)
      return acc
    }, {})
  ).map(list => {
    const sorted = [...list].sort((a, b) => a.target - b.target)
    const earned = sorted.filter(a => a.earned)
    return earned.length > 0 ? earned[earned.length - 1] : sorted[0]
  })

  const displayedAchievements = showAllAchievements
    ? [...allAchievements].sort((a, b) => {
      if (a.earned !== b.earned) return a.earned ? -1 : 1
      return a.target - b.target
    })
    : highestByCategory

  const earnedCount = loading ? 0 : allAchievements.filter(a => a.earned).length

  return (
    <AchievementsCard>
      <AchievementsHeader>
        <AchievementsTitle>
          <TrendingUpRounded /> Achievements
        </AchievementsTitle>
        {!loading && earnedCount < allAchievements.length && !showAllAchievements && (
          <ToggleButton onClick={() => setShowAllAchievements(true)}>
            Show All ({allAchievements.length - earnedCount} more)
          </ToggleButton>
        )}
        {!loading && showAllAchievements && (
          <ToggleButton onClick={() => setShowAllAchievements(false)}>
            Show Earned
          </ToggleButton>
        )}
      </AchievementsHeader>
      <BadgesGrid>
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Badge key={`achievement-skeleton-${index}`} earned={false} showAll={false}>
              <BadgeIcon>
                <Skeleton variant="circular" width={44} height={44} />
              </BadgeIcon>
              <BadgeName>
                <Skeleton width={90} />
              </BadgeName>
              <BadgeProgress>
                <Skeleton width={60} />
              </BadgeProgress>
            </Badge>
          ))
        ) : (
          displayedAchievements.map(achievement => (
            <Tooltip key={achievement.id} title={achievement.description} placement="top" arrow>
              <Badge earned={achievement.earned} showAll={showAllAchievements}>
                <BadgeIcon>{achievement.icon}</BadgeIcon>
                <BadgeName>{achievement.name}</BadgeName>
                <BadgeProgress>
                  {`${achievement.progress}/${achievement.target}`}
                </BadgeProgress>
              </Badge>
            </Tooltip>
          ))
        )}
      </BadgesGrid>
    </AchievementsCard>
  )
}


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
  grid-template-columns: repeat(4, 1fr);
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
