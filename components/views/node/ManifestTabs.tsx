import styled from 'styled-components'
import { useSearchParams, Link } from 'react-router-dom'

import { Tabs, Tab } from '/components/tabs/Tabs'
import { TabProps } from '@mui/material'

import OverviewIcon from '@mui/icons-material/ListAltRounded'
import SensorIcon from '@mui/icons-material/SensorsRounded'
import ComputesIcon from '@mui/icons-material/DeveloperBoardRounded'
import PeripheralsIcon from '@mui/icons-material/Cable'



const label = (
  icon: JSX.Element,
  label: string,
  counts?: {[tab: string]: number}
) =>
  <div className="flex items-center">
    {icon}&nbsp;{label} {counts && label in counts && `(${counts[label]})`}
  </div>



// a tab is rendered with react.clone, so we must explicity pass TabProps
const ConditionalTab = (props: TabProps & {show: boolean, component, to}) =>
  props.show ? <Tab {...props} /> : <></>


export default function ManifestTabs({counts}) {
  const [params] = useSearchParams()
  const tab = params.get('tab') || 'overview'

  return (
    <Root>
      <Tabs
        value={tab}
        aria-label="node details tabs"
      >
        <Tab
          label={label(<OverviewIcon fontSize="small" />, 'Overview')}
          component={Link}
          value="overview"
          to="?tab=overview"
          replace
        />
        <Tab
          label={label(<SensorIcon />, 'Sensors', counts)}
          component={Link}
          value="sensors"
          to="?tab=sensors"
          replace
        />
        <Tab
          label={label(<ComputesIcon fontSize="small" />, 'Computes', counts)}
          component={Link}
          value="computes"
          to="?tab=computes"
          replace
        />
        <Tab
          label={label(<PeripheralsIcon fontSize="small"/>, 'Peripherals', counts)}
          component={Link}
          value="peripherals"
          to="?tab=peripherals"
          replace
        />
      </Tabs>
    </Root>
  )
}

const Root = styled.div`

`
