import { Badge, styled } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import { Outlet, useLocation } from 'react-router-dom'

import {
  AccountCircleOutlined, GroupOutlined, WorkOutline, SelectAll, SensorsRounded, FiberNewOutlined,
  DashboardOutlined, CheckCircleOutline, ListAlt, SettingsOutlined, ViewTimelineOutlined
} from '@mui/icons-material'

import HardDriveIcon from '/assets/hard-drive.svg'
import Auth from '/components/auth/auth'
import CollapsibleNavSidebar, { type NavItem } from '/components/layout/CollapsibleNavSidebar'

const userBadgeSx = {
  '& .MuiBadge-badge': {
    backgroundColor: (theme: Theme) => theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
    color: 'inherit',
    right: 6,
    top: 4,
    borderRadius: '50%',
    minWidth: 'auto',
    width: '0.9em',
    height: '0.9em',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
}

const badgeIcon = (icon: JSX.Element, badgeContent: JSX.Element, horizontal: 'left' | 'right' = 'right') =>
  <Badge
    badgeContent={badgeContent}
    anchorOrigin={{vertical: 'top', horizontal}}
    overlap="circular"
    sx={userBadgeSx}
  >
    {icon}
  </Badge>


const getNavItems = (includeSensors: boolean, search: string): NavItem[] => {
  const navItems: NavItem[] = [
    {
      to: 'all-nodes',
      icon: <SelectAll />,
      label: 'All Nodes',
      children: [
        {
          to: 'all-nodes/sgt',
          icon: badgeIcon(<HardDriveIcon />, <FiberNewOutlined style={{fontSize: '1.5em'}} />),
          label: 'SGT',
          submenuLabel: 'Sage Grande',
          submenuMetaLabel: 'SGT',
          indent: true,
        },
        {
          to: 'all-nodes/sage',
          icon: <HardDriveIcon />,
          label: 'Sage',
          submenuLabel: 'Sage',
          submenuMetaLabel: 'legacy',
          indent: true,
        },
      ],
    },
    {
      to: 'nodes',
      icon: badgeIcon(<ListAlt />, <CheckCircleOutline style={{fontSize: '1.2em'}} />, 'left'),
      label: 'Status',
      submenuLabel: 'All Status',
      children: [
        {
          to: 'nodes/project/sgt',
          icon: badgeIcon(<HardDriveIcon />, <FiberNewOutlined style={{fontSize: '1.5em'}} />),
          label: 'SGT',
          submenuLabel: 'Sage Grande',
          submenuMetaLabel: 'SGT',
          indent: true,
        },
        {
          to: 'nodes/project/sage',
          icon: <HardDriveIcon />,
          label: 'Sage',
          submenuLabel: 'Sage',
          submenuMetaLabel: 'legacy',
          indent: true,
        },
      ],
    },
    ...(includeSensors ? [{
      to: `sensors${search}`,
      icon: <SensorsRounded />,
      label: 'Sensors',
      tooltip: 'All Sensors'
    }] : []),
    'divider',
    {
      to: 'my-dash',
      icon: <DashboardOutlined />,
      label: 'Dash',
      tooltip: 'My Dashboard'
    },
    {
      to: 'my-nodes?show_all=true',
      icon: <AccountCircleOutlined />,
      label: 'My Nodes',
      submenuLabel: 'All My Nodes',
      ...(Auth.isSignedIn ? {
        children: [
          {
            to: 'my-nodes/project/sgt?show_all=true',
            icon: badgeIcon(<HardDriveIcon />, <AccountCircleOutlined style={{fontSize: '1.4em'}} />),
            label: 'SGT',
            submenuLabel: 'Sage Grande',
            submenuMetaLabel: 'SGT',
            tooltip: 'My SGT Nodes',
            indent: true,
          },
          {
            to: 'my-nodes/project/sage?show_all=true',
            icon: badgeIcon(<HardDriveIcon />, <AccountCircleOutlined style={{fontSize: '1.4em'}} />),
            label: 'Sage',
            submenuLabel: 'Sage',
            submenuMetaLabel: 'legacy',
            tooltip: 'My Sage Nodes',
            indent: true,
          },
          'divider',
          {
            to: 'my-nodes/sgt-status',
            icon: <ViewTimelineOutlined fontSize="small"/>,
            submenuMetaLabel: 'timeline',
            label: 'Sage Grande Status',
            indent: true,
          },
        ],
      } : {}),
    },
    ...(Auth.isSignedIn ? [
      {
        to: 'my-projects',
        icon: <WorkOutline />,
        label: 'Projects',
        tooltip: 'My Projects'
      },
      {
        to: 'my-teams',
        icon: <GroupOutlined />,
        label: 'Members',
        tooltip: 'My Teams'
      }
    ] : []),
    {
      to: 'account/access',
      icon: <SettingsOutlined />,
      label: 'Settings',
      tooltip: 'Settings',
      pinBottom: true
    }
  ]

  return navItems
}

type Props = {
  includeSensors?: boolean
  isAdmin?: boolean
}

export default function NodeTabs(props: Props) {
  const {includeSensors = true} = props
  const {search} = useLocation()

  const navItems = getNavItems(includeSensors, search)

  return (
    <Root>
      <CollapsibleNavSidebar
        navItems={navItems}
        storageKey="nodes.sidebar.state"
        defaultMinimized={true}
        forceMinimized={true}
        collapsible={false}
        submenuMode="popover"
        submenuTrigger="hover-or-click"
        itemIdGenerator={(item) => item.to?.split('?')[0] || ''}
      />
      <Main>
        <Outlet />
      </Main>
    </Root>
  )
}

const Root = styled('div')`
  display: flex;
  height: 100%;
`

const Main = styled('div')`
  padding: 0 20px;
  flex-grow: 1;
  overflow-y: auto;
  margin-left: 75px;
`
