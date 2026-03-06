import { styled } from '@mui/material/styles'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { BarChartRounded, GroupOutlined, NumbersRounded, Timeline } from '@mui/icons-material'

import CollapsibleNavSidebar, { NavItem } from '/components/layout/CollapsibleNavSidebar'
import { CardViewStyle } from '/components/layout/Layout'


const getNavItems = (): NavItem[] => [
  {
    to: '/metrics/accounts',
    icon: <GroupOutlined />,
    label: 'Accounts',
    tooltip: 'User Accounts'
  },
  /* { Todo: finish, fix bug
    to: '/metrics/uploads',
    icon: <ViewTimelineOutlined />,
    label: 'File Uploads',
    tooltip: 'File Uploads'
  },
  */
  {
    to: '/metrics/apps',
    icon: <BarChartRounded />,
    label: 'App Data',
    tooltip: 'User App Data'
  },
  {
    to: '/metrics/jobs',
    icon: <Timeline />,
    label: 'Job Counts',
    tooltip: 'Job Counts'
  },
  {
    to: '/metrics/at-a-glance',
    icon: <NumbersRounded />,
    label: 'At a Glance',
    tooltip: 'Metrics Overview'
  }
]

export default function Metrics() {
  const navItems = getNavItems()
  const [minimized, setMinimized] = useState(false)

  return (
    <Root>
      {CardViewStyle}
      <CollapsibleNavSidebar
        navItems={navItems}
        storageKey="metrics.sidebar.state"
        onMinimizedChange={setMinimized}
      />
      <Main $minimized={minimized}>
        <Outlet />
      </Main>
    </Root>
  )
}

const Root = styled('div')`
//  display: flex;
  height: 100%;
`

const Main = styled('div')<{ $minimized: boolean }>`
  margin: 20px 0 40px 0;
  flex-grow: 1;
  margin-left: ${({ $minimized }) => $minimized ? `85px` : `170px`};
  transition: margin-left .5s ease;
`
