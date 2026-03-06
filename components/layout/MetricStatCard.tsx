import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { styled } from '@mui/material'


type MetricStatCardProps = {
  label?: string | ReactNode
  value?: string | number | ReactNode
  items?: Array<{
    value: string | number | ReactNode
    label: string | ReactNode
  }>
  to?: string
  icon?: ReactNode
  content?: ReactNode
}


export default function MetricStatCard({
  label,
  value,
  items,
  to,
  icon,
  content,
}: MetricStatCardProps) {
  const hasItems = !!items?.length

  const cardContent = (
    <>
      {icon && <StatIcon>{icon}</StatIcon>}
      <StatContent>
        {hasItems ? (
          <StatItems>
            {items.map((item, index) => (
              <StatItem key={index}>
                <StatValue>{item.value}</StatValue>
                <StatLabel>{item.label}</StatLabel>
              </StatItem>
            ))}
          </StatItems>
        ) : (
          <StatItem>
            <StatValue>{value}</StatValue>
            <StatLabel>{label}</StatLabel>
          </StatItem>
        )}
      </StatContent>
      {content && <StatAdditional>{content}</StatAdditional>}
    </>
  )

  if (to) {
    return (
      <StatCard as={Link} to={to}>
        {cardContent}
      </StatCard>
    )
  }

  return <StatCard>{cardContent}</StatCard>
}


const StatCard = styled('div')`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
  padding: .5rem;
  border-left: 3px solid ${({ theme }) => theme.palette.primary.main};
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  text-decoration: none;
  color: inherit;
  background: ${({ theme }) => theme.palette.mode === 'dark' ? '#1e1e1e' : '#fff'};
  cursor: ${({ as }) => (as ? 'pointer' : 'default')};
  position: relative;

  &:hover {
    border-color: ${({ theme }) => theme.palette.primary.main};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: ${({ as }) => (as ? 'translateY(-2px)' : 'none')};
  }
`

const StatIcon = styled('div')`
  display: flex;
  align-items: center;
  justify-content: center;
  svg {
    font-size: 2.5em;
    color: ${({ theme }) => theme.palette.primary.main};
    opacity: 0.8;
  }
`

const StatContent = styled('div')`
  grid-column: 2;
  flex: 1;
`

const StatAdditional = styled('div')`
  grid-column: 1 / -1;
  width: 100%;
`

const StatItems = styled('div')`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const StatItem = styled('div')`
  display: flex;
  flex-direction: column;
`

const StatValue = styled('div')`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.palette.text.primary};
  line-height: 1;
  margin-bottom: 0.5rem;
`

const StatLabel = styled('div')`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.palette.text.secondary};
  font-weight: 500;
  letter-spacing: 0.5px;
`
