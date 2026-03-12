import { useState } from 'react'
import { Skeleton, styled, Popper, Fade } from '@mui/material'
import { TrendingUpRounded } from '@mui/icons-material'


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
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [hoveredAchievement, setHoveredAchievement] = useState<Achievement | null>(null)

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

  const handleBadgeEnter = (event: React.MouseEvent<HTMLElement>, achievement: Achievement) => {
    setAnchorEl(event.currentTarget)
    setHoveredAchievement(achievement)
  }

  const handleBadgeLeave = () => {
    setAnchorEl(null)
    setHoveredAchievement(null)
  }

  const popperOpen = !!anchorEl && !!hoveredAchievement

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
            </Badge>
          ))
        ) : (
          displayedAchievements.map(achievement => (
            <Badge
              key={achievement.id}
              earned={achievement.earned}
              showAll={showAllAchievements}
              onMouseEnter={(event) => handleBadgeEnter(event, achievement)}
              onMouseLeave={handleBadgeLeave}
            >
              <BadgeIcon>{achievement.icon}</BadgeIcon>
            </Badge>
          ))
        )}
      </BadgesGrid>

      <Popper open={popperOpen} anchorEl={anchorEl} placement="top" transition>
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={150}>
            <HoverPopper>
              {hoveredAchievement && (
                <>
                  <HoverHeader>
                    <HoverIcon>{hoveredAchievement.icon}</HoverIcon>
                    <HoverTitle>{hoveredAchievement.name}</HoverTitle>
                  </HoverHeader>
                  <HoverDescription>{hoveredAchievement.description}</HoverDescription>
                  <HoverMeta>
                    <HoverProgress>{`${hoveredAchievement.progress}/${hoveredAchievement.target}`}</HoverProgress>
                    <HoverStatus earned={hoveredAchievement.earned}>
                      {hoveredAchievement.earned ? 'Earned' : 'In progress'}
                    </HoverStatus>
                  </HoverMeta>
                </>
              )}
            </HoverPopper>
          </Fade>
        )}
      </Popper>
    </AchievementsCard>
  )
}


const AchievementsCard = styled('div')`
  width: 100%;
  display: flex;
  flex-direction: column;
`

const AchievementsHeader = styled('div')`
  margin-bottom: 0.35rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const ToggleButton = styled('button')`
  padding: 0.3rem 0.65rem;
  background: transparent;
  border: 1.5px solid ${({ theme }) => theme.palette.primary.main};
  border-radius: 6px;
  color: ${({ theme }) => theme.palette.primary.main};
  font-weight: 600;
  font-size: 0.7em;
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
  font-size: 1em;
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
  grid-template-columns: repeat(auto-fit, minmax(54px, 1fr));
  gap: 0.18rem;
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
  padding: 0.3rem;
  text-align: center;
  transition: all 0.2s ease;
  opacity: ${({ earned, showAll }) => (showAll && !earned) ? 0.5 : 1};
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 46px;
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
  font-size: 2em;
  line-height: 1;
`

const HoverPopper = styled('div')`
  max-width: 280px;
  padding: 0.6rem 0.7rem;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.palette.divider};
  background: ${({ theme }) => theme.palette.background.paper};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 9999;
`

const HoverHeader = styled('div')`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.25rem;
`

const HoverIcon = styled('span')`
  font-size: 1.2rem;
  line-height: 1;
`

const HoverTitle = styled('div')`
  font-size: 0.88rem;
  font-weight: 700;
  color: ${({ theme }) => theme.palette.text.primary};
`

const HoverDescription = styled('div')`
  font-size: 0.78rem;
  color: ${({ theme }) => theme.palette.text.secondary};
  line-height: 1.35;
  margin-bottom: 0.5rem;
`

const HoverMeta = styled('div')`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`

const HoverProgress = styled('span')`
  font-size: 0.76rem;
  font-weight: 700;
  color: ${({ theme }) => theme.palette.primary.main};
`

const HoverStatus = styled('span')<{ earned: boolean }>`
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 999px;
  color: ${({ theme, earned }) => earned ? theme.palette.success.dark : theme.palette.text.secondary};
  background: ${({ theme, earned }) => earned
    ? (theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.15)')
    : (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')};
`
