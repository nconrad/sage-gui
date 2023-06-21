


import { useState, useEffect } from 'react'
import styled from 'styled-components'
import { Outlet, useParams, useSearchParams, NavLink, Link } from 'react-router-dom'

import { Tabs, Tab, TabLabel } from '/components/tabs/Tabs'

import TimelineIcon from '@mui/icons-material/ViewTimelineOutlined'
import PublicIcon from '@mui/icons-material/Public'
import AddIcon from '@mui/icons-material/AddRounded'
import MyJobsIcon from '@mui/icons-material/Engineering'


import * as BK from '/components/apis/beekeeper'
import Auth from '/components/auth/auth'

const user = Auth.user



type Label = BK.Phase | 'Show All' | 'Sensors'
type Counts =  BK.PhaseCounts & {'Show All': number}




type Props = {
}

export default function NodeTabs(props: Props) {
  const {view} = useParams()
  const [params] = useSearchParams()

  const [counts, setCounts] = useState<Counts>()

  useEffect(() => {

  }, [])


  // public, mine

  return (
    <Root>
      <Tabs
        value={view}
        aria-label="job status tabs"
        >
        <Tab
          label={<TabLabel icon={<PublicIcon />} label={'All Jobs'} count={counts.public} />}
          value="all-jobs"
          component={Link}
          to={`/jobs/all-jobs`}
          replace
        />
        {user &&
          <Tab
            label={
              <div className="flex items-center">
                <MyJobsIcon/>&nbsp;My Jobs ({loading ? '...' : counts.mine})
              </div>
            }
            value="my-jobs"
            component={NavLink}
            to="/jobs/my-jobs"
            replace
          />
        }

        <Tab
          label={<div className="flex items-center">
            <TimelineIcon />&nbsp;Timelines
          </div>}
          value="timeline"
          component={Link}
          to={`/jobs/timeline`}
          replace
        />
      </Tabs>


      <Outlet />
    </Root>
  )
}


const Root = styled.div`
  margin: 0 10px 10px 10px;
`
