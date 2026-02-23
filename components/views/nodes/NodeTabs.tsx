import { Badge, styled } from '@mui/material'
import { Outlet, useLocation } from 'react-router-dom'

import {
  AccountCircleOutlined, GroupOutlined,
  WorkOutline, SelectAll, SensorsRounded,
  FiberNewOutlined, DashboardOutlined,
  CheckCircleOutline, ListAlt
} from '@mui/icons-material'

import HardDriveIcon from '/assets/hard-drive.svg'
import Auth from '/components/auth/auth'
import CollapsibleNavSidebar, { NavItem } from '/components/layout/CollapsibleNavSidebar'
import { useState } from 'react'

const userBadgeSx = {
  '& .MuiBadge-badge': {
    backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
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

const getNavItems = (includeSensors, search) => {
  let items: NavItem[] = [
    {
      to: `nodes/all`,
      icon: <SelectAll />,
      label: 'All Nodes',
      tooltip: 'All Nodes',
      expandable: true,
      expanded: false
    },
    {
      to: `nodes/all/sgt`,
      icon:
        <Badge
          badgeContent={<FiberNewOutlined style={{fontSize: '1.5em'}} />}
          anchorOrigin={{vertical: 'top', horizontal: 'right'}}
          overlap="circular"
          sx={userBadgeSx}
        >
          <HardDriveIcon />
        </Badge>,
      label: <>SGT</>,
      tooltip: 'Sage Grande Testbed Nodes',
      minimizedLabel: 'SGT',
      indent: true,
      parentId: 'nodes/all'
    },
    {
      to: `nodes/all/sage`,
      icon: <HardDriveIcon />,
      label: <>Sage</>,
      tooltip: 'Sage Nodes',
      indent: true,
      parentId: 'nodes/all'
    },
    // ------------------------------
    {
      to: `nodes`,
      icon:
        <Badge
          badgeContent={<CheckCircleOutline style={{fontSize: '1.2em'}} />}
          anchorOrigin={{vertical: 'top', horizontal: 'left'}}
          overlap="circular"
          sx={userBadgeSx}
        >
          <ListAlt />
        </Badge>,
      label: 'Status',
      tooltip: 'Node Status',
      expandable: true,
      expanded: true
    },
    {
      to: `nodes/project/sgt`,
      icon:
        <Badge
          badgeContent={<CheckCircleOutline style={{fontSize: '1.2em'}} />}
          anchorOrigin={{vertical: 'top', horizontal: 'left'}}
          overlap="circular"
          sx={userBadgeSx}
        >
          <HardDriveIcon />
        </Badge>,
      label: <>SGT</>,
      tooltip: 'Sage Grande Testbed Nodes',
      minimizedLabel: 'SGT',
      indent: true,
      parentId: 'nodes'
    },
    {
      to: `nodes/project/sage`,
      icon:
        <Badge
          badgeContent={<CheckCircleOutline style={{fontSize: '1.2em'}} />}
          anchorOrigin={{vertical: 'top', horizontal: 'left'}}
          overlap="circular"
          sx={userBadgeSx}
        >
          <HardDriveIcon />
        </Badge>,
      label: <>Sage</>,
      tooltip: 'Sage Nodes',
      indent: true,
      parentId: 'nodes'
    }
  ]

  if (includeSensors) {
    items = [...items,
      {
        to: `sensors${search}`,
        icon: <SensorsRounded />,
        label: 'Sensors',
      }
    ]
  }


  items = [...items,
    'divider',
    {
      to: `user/${Auth.user}/dash`,
      icon: <DashboardOutlined />,
      label: 'Dash',
      tooltip: 'My Dashboard'
    },
    {
      to: `user/${Auth.user}/nodes?show_all=true`,
      icon: <AccountCircleOutlined />,
      label: 'My Nodes',
      expandable: true,
      expanded: false
    },
    {
      to: `user/${Auth.user}/nodes/project/sgt?show_all=true`,
      icon: (
        <Badge
          badgeContent={<AccountCircleOutlined style={{fontSize: '1.4em'}} />}
          anchorOrigin={{vertical: 'top', horizontal: 'right'}}
          overlap="circular"
          sx={userBadgeSx}
        >
          <HardDriveIcon />
        </Badge>
      ),
      label: <>SGT</>,
      tooltip: 'My SGT Nodes',
      minimizedLabel: 'My SGT Nodes',
      indent: true,
      parentId: 'user/nodes', // ignore query params and user-specific paths for active state
    },
    {
      to: `user/${Auth.user}/nodes/project/sage?show_all=true`,
      icon: (
        <Badge
          badgeContent={<AccountCircleOutlined style={{fontSize: '1.4em'}} />}
          anchorOrigin={{vertical: 'top', horizontal: 'right'}}
          overlap="circular"
          sx={userBadgeSx}
        >
          <HardDriveIcon />
        </Badge>
      ),
      label: <>Sage</>,
      tooltip: 'My Sage Nodes',
      minimizedLabel: 'My Sage Nodes',
      indent: true,
      parentId: 'user/nodes',
    },
  ]

  if (Auth.isSignedIn) {
    items = [...items,
      {
        to: `user/${Auth.user}/projects`,
        icon: <WorkOutline />,
        label: 'Projects',
        tooltip: 'My Projects'
      },
      {
        to: `user/${Auth.user}/teams`,
        icon: <GroupOutlined />,
        label: 'Members',
        tooltip: 'My Teams'
      }
    ]
  }

  return items
}


type Props = {
  includeSensors?: boolean // weather or not to include the sensors tab
  isAdmin?: boolean        // show totals for all projects in admin view
}

export default function NodeTabs(props: Props) {
  const {includeSensors = true} = props
  const {search} = useLocation()
  const [minimized, setMinimized] = useState(false)

  const navItems = getNavItems(includeSensors, search)

  return (
    <Root>
      <CollapsibleNavSidebar
        navItems={navItems}
        storageKey="nodeTabs.state"
        defaultExpanded={{
          'nodes': true,
          'user/nodes': false
        }}
        itemIdGenerator={(item) => {
          if (item === 'divider') return ''
          // ignore query params and user-specific paths for active state
          return item.to?.split('?')[0]?.replace(`user/${Auth.user}/nodes`, 'user/nodes') || ''
        }}
        onMinimizedChange={setMinimized}
      />
      <Main $minimized={minimized}>
        <Outlet />
      </Main>
    </Root>
  )
}

const Root = styled('div')`
  display: flex;
  height: 100%;
`

const Main = styled('div')<{ $minimized: boolean }>`
  padding: 0 20px;
  flex-grow: 1;
  overflow-y: auto;
  margin-left: ${({ $minimized }) => $minimized ? '75px' : '160px'};
  transition: margin-left .5s ease;
`