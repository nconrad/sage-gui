import { Divider, styled, Tooltip, IconButton } from '@mui/material'
import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ArrowDropDown } from '@mui/icons-material'

import { Sidebar } from '/components/layout/Layout'
import * as LS from '/components/apis/localStorage'

const AnimatedSidebar = styled(Sidebar)`
  transition: width .5s ease;
  position: fixed;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;

  /* Hide content that overflows during animation */
  .nav-label {
    opacity: 1;
    transition: opacity 0.2s ease;
  }

  /* Delay showing labels when expanding */
  &[data-minimized="false"] .nav-label {
    transition-delay: 0.3s;
  }

  /* Hide labels immediately when minimizing */
  &[data-minimized="true"] .nav-label {
    opacity: 0;
    transition-delay: 0s;
  }
`

const Item = styled(NavLink)`
  width: 100%;
  font-size: 1.1em;
  color: ${({ theme }) => theme.palette.mode === 'dark' ? '#bbb' : '#444'};
  border-right: 3px solid ${({ theme }) => theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5'};
  border-top: 1px solid transparent;
  border-bottom: 1px solid transparent;
  padding: 8px 4px 8px 0px;
  position: relative;

  span {
    opacity: 1;
    transition: opacity 0.3s ease 0.1s;
    white-space: nowrap;
  }

  /* Default expanded icon sizes */
  > div > .MuiSvgIcon-root,
  > div > svg {
    font-size: 2em;
  }

  &.indent {
    padding-left: 1rem;
    font-size: 0.9em;
  }

  &.indent > div > .MuiSvgIcon-root,
  &.indent > div > svg {
    font-size: 1.5em;
  }

  /* Minimized state with larger icons like apps/jobs sidebar */
  &.minimized {
    flex-direction: column;
    justify-content: center;
    padding: 10px;
    gap: 2px;
    font-size: 0.9em; /* Override any font-size for consistent sizing */

    &.indent {
      padding: 10px;
      font-size: 0.9em; /* Ensure indent items have same base font-size */
    }

    .minimized-label {
      font-size: 1em;
      margin-top: 0;
      text-align: center;
    }

    > div > .MuiSvgIcon-root,
    > div > svg {
      font-size: 2.5em;
    }

    &.indent > div > .MuiSvgIcon-root,
    &.indent > div > svg {
      font-size: 2.5em;
    }
  }

  :hover{
    text-decoration: none;
    background-color: ${({ theme }) => theme.palette.mode === 'dark' ? '#2a2a2a' : '#f0f0f0'};
  }

  :hover:not(.active) {
    color: ${({ theme }) => theme.palette.mode === 'dark' ? '#fff' : '#000'};
  }

  &.active {
    border-right: 3px solid ${({ theme }) => theme.palette.primary.main};
    border-top: 1px solid ${({ theme }) => theme.palette.mode === 'dark' ? '#333' : '#eee'};
    border-bottom: 1px solid ${({ theme }) => theme.palette.mode === 'dark' ? '#333' : '#eee'};

    background: ${({ theme }) => theme.palette.mode === 'dark' ? '#2a2a2a' : 'rgb(255, 255, 255)'};
    font-weight: 800;
  }

  &.active .MuiSvgIcon-root {
    color: ${({ theme }) => theme.palette.primary.main};
  }
`

const MinimizeButtonWrapper = styled('div')`
  display: flex;
  padding: 8px 8px 4px;
  border-bottom: 1px solid ${({ theme }) => theme.palette.mode === 'dark' ? '#333' : '#e0e0e0'};
  margin-bottom: 4px;

  &.minimized {
    justify-content: center;
    border-bottom: none;
    margin-bottom: 0;
  }
`

const MinimizeButton = styled(IconButton)`
  color: ${({ theme }) => theme.palette.mode === 'dark' ? '#888' : '#666'};
  background-color: ${({ theme }) =>
    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  border-radius: 4px;
  padding: 4px;
  transition: all 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.palette.primary.main};
    background-color: ${({ theme }) =>
      theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'};
    transform: scale(1.05);
  }

  .MuiSvgIcon-root {
    font-size: 1.2rem;
  }

  .minimized & {
    background-color: transparent;
    border-radius: 0;
    padding: 0;
  }

  .minimized &:hover {
    background-color: transparent;
    transform: none;
  }
`

const Nav = styled('div')`
  margin-top: 0;
`

const ExpandButton = ({ expanded, onToggle }) => (
  <IconButton
    size="small"
    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle() }}
    sx={{
      padding: 0,
      minWidth: 'auto',
      position: 'absolute',
    }}
  >
    <ArrowDropDown style={{
      transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
      transition: 'transform 0.2s',
    }} />
  </IconButton>
)

export type NavItem = {
  to?: string
  icon: React.ReactNode
  label: string | React.ReactNode
  tooltip?: string
  indent?: boolean
  divider?: boolean
  expandable?: boolean
  expanded?: boolean
  parentId?: string
  minimizedLabel?: string
} | 'divider'

type Props = {
  navItems: NavItem[]
  storageKey?: string
  minimizedWidth?: string
  expandedWidth?: string
  defaultExpanded?: Record<string, boolean>
  itemIdGenerator?: (item: NavItem) => string
  onMinimizedChange?: (minimized: boolean) => void
}

export default function CollapsibleNavSidebar({
  navItems,
  storageKey = 'sidebar.state',
  minimizedWidth = '75px',
  expandedWidth = '160px',
  defaultExpanded = {},
  itemIdGenerator = (item) => item !== 'divider' ? (item.to || '') : '',
  onMinimizedChange
}: Props) {
  const [minimized, setMinimized] = useState(() => {
    const stored = LS.get(storageKey)
    if (stored) {
      const parsed = JSON.parse(stored)
      return typeof parsed === 'object' ? parsed.minimized ?? false : parsed
    }
    return false
  })
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(() => {
    const stored = LS.get(storageKey)
    if (stored) {
      const parsed = JSON.parse(stored)
      return typeof parsed === 'object' ? parsed.expanded ?? defaultExpanded : defaultExpanded
    }
    return defaultExpanded
  })

  useEffect(() => {
    LS.set(storageKey, { minimized, expanded: expandedItems })
    onMinimizedChange?.(minimized)
  }, [minimized, expandedItems, storageKey, onMinimizedChange])

  const toggleMinimized = () => {
    setMinimized(!minimized)
  }

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  return (
    <AnimatedSidebar width={minimized ? minimizedWidth : expandedWidth} data-minimized={minimized}>
      <MinimizeButtonWrapper className={minimized ? 'minimized' : 'flex justify-end'}>
        <MinimizeButton onClick={toggleMinimized} size="small">
          {minimized ? <ChevronRight /> : <ChevronLeft />}
        </MinimizeButton>
      </MinimizeButtonWrapper>
      {minimized && <Divider sx={{margin: '10px 0'}} />}
      <Nav>
        {navItems.map((item, index) => {
          if (item == 'divider') {
            return <Divider key={`divider-${index}`} sx={{margin: '10px 0'}} />
          }

          // Skip child items if parent is collapsed
          if (item.parentId && !expandedItems[item.parentId]) {
            return null
          }

          const itemId = itemIdGenerator(item)
          const isExpanded = expandedItems[itemId] ?? item.expanded

          const itemContent = (
            <Item
              key={item.to}
              to={item.to!}
              className={`flex items-center ${minimized ? 'gap minimized' : ''}${item.indent ? ' indent' : ''}`}
              end // use exact match for active state
            >
              {item.expandable && !minimized && (
                <ExpandButton expanded={isExpanded} onToggle={() => toggleExpanded(itemId)} />
              )}
              <div style={{
                marginLeft: item.expandable && !minimized ? '1.5rem' : minimized ? '0' : '1.5rem',
              }} className="flex items-center">
                {item.icon}
              </div>
              {!minimized ? (
                <div className="nav-label" style={{ marginLeft: '.5rem' }}>{item.label}</div>
              ) : (
                <div className="minimized-label">{item.minimizedLabel || item.label}</div>
              )}
            </Item>
          )

          return (
            <Tooltip key={item.to} title={item.tooltip || item.label} placement="right" enterDelay={0}>
              {itemContent}
            </Tooltip>
          )
        })}
      </Nav>
    </AnimatedSidebar>
  )
}
