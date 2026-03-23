import { useEffect, useState } from 'react'
import { styled } from '@mui/material'
import { Outlet } from 'react-router-dom'

import CollapsibleNavSidebar, { NavItem } from '/components/layout/CollapsibleNavSidebar'
import * as User from '/components/apis/user'
import Auth from '/components/auth/auth'

import {
  AccountCircleOutlined, HubOutlined, LockOpenOutlined, VpnKeyOutlined
} from '@mui/icons-material'
// import DevicesIcon from '@mui/icons-material/DeviceHubRounded'


const navItems: NavItem[] = [{
  label: 'Account',
  icon: <AccountCircleOutlined />,
  tooltip: 'Account',
  to: '/account/profile'
}, {
  label: 'My Nodes',
  icon: <HubOutlined />,
  tooltip: 'My Nodes',
  to: '/account/nodes'
}, {
  label: 'Access Credentials',
  icon: <VpnKeyOutlined />,
  tooltip: 'Access Credentials',
  to: '/account/access'
}, {
  label: 'Request Access',
  icon: <LockOpenOutlined />,
  tooltip: 'Request Access',
  to: '/request-access'
}

/* {
  label: 'Dev Devices',
  icon: <DevicesIcon />,
  tooltip: 'Dev Devices',
  to: '/account/dev-devices'
}*/]


export default function Account() {
  const [userInfo, setUserInfo] = useState<User.UserInfo | null>(null)

  useEffect(() => {
    User.getUserInfo()
      .then(setUserInfo)
      .catch(() => { /* non-critical */ })
  }, [])

  const sidebarHeader = (
    <SidebarHeader>
      <span>My Settings</span>
    </SidebarHeader>
  )

  return (
    <Root>
      <CollapsibleNavSidebar
        navItems={navItems}
        storageKey="account.sidebar.state"
        collapsible={false}
        expandedWidth="180px"
        header={sidebarHeader}
      />
      <Main>
        <PageHeader>
          <div className="flex items-center gap" style={{ gap: '1rem' }}>
            <AccountCircleOutlined sx={{ fontSize: '3rem', color: 'primary.main' }} />
            <div>
              <PageTitle>
                {userInfo?.name
                  ? <>{userInfo.name} <span className="username">({Auth.user})</span> settings
                  </>
                  : <>{Auth.user} settings</>}
              </PageTitle>
              <PageSubtitle>Your personal Sage account</PageSubtitle>
            </div>
          </div>
        </PageHeader>

        <Outlet />
      </Main>
    </Root>
  )
}

const PageHeader = styled('div')`
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid ${({ theme }) =>
    theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'};
`

const PageTitle = styled('h1')`
  margin: 0;
  font-size: 1.6rem;
  line-height: 1.2;

  .username {
    font-weight: 400;
    opacity: 0.6;
    font-size: 0.85em;
  }
`

const PageSubtitle = styled('p')`
  margin: 0.3rem 0 0 0;
  color: #888;
  font-size: 1em;
`

const SidebarHeader = styled('div')`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px 4px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.55;
  white-space: nowrap;
  overflow: hidden;
`

const Root = styled('div')`
  display: flex;
  height: 100%;
`

const Main = styled('div')`
  padding: 2rem;
  flex-grow: 1;
  overflow-y: auto;
  margin-left: 180px;
`
