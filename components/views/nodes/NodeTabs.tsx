import { Badge, styled } from '@mui/material'
import { Outlet, useLocation } from 'react-router-dom'

import {
  AccountCircleOutlined, GroupOutlined,
  WorkOutline, SelectAll, SensorsRounded,
  FiberNewOutlined, DashboardOutlined
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
      to: `nodes`,
      icon: <SelectAll />,
      label: 'All Nodes',
      tooltip: 'All Nodes',
      expandable: true,
      expanded: true
    },
    {
      to: `nodes/sgt`,
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
      parentId: 'nodes'
    },
    {
      to: `nodes/sage`,
      icon: <HardDriveIcon />,
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

  if (Auth.isSignedIn) {
    items = [...items,
      'divider',
      {
        to: `user/${Auth.user}/dash`,
        icon: <DashboardOutlined />,
        label: 'Dash',
        tooltip: 'My Dashboard'
      },
      {
        to: `user/${Auth.user}/nodes`,
        icon: <AccountCircleOutlined />,
        label: 'My Nodes',
        expandable: true,
        expanded: false
      },
      {
        to: `user/${Auth.user}/nodes/sgt`,
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
        parentId: 'user/nodes'
      },
      {
        to: `user/${Auth.user}/nodes/sage`,
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
        parentId: 'user/nodes'
      },
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
          return item.to?.replace(`user/${Auth.user}/`, 'user/') || ''
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