import { Tooltip } from '@mui/material'
import * as ECR from '/components/apis/ecr'

import Portal from '/components/PortalLink'

type Props = {
  label: string
  ecr: ECR.AppDetails[]
}

export default function TimelineAppLabel(props: Props) {
  const {label, ecr: ecrAppList} = props

  const path = label.replace('registry.sagecontinuum.org/', '')
  const shortened = label.slice(label.lastIndexOf('/') + 1 )

  if (!ECR.repoIsPublic(ecrAppList, path))
    return (
      <Tooltip title={label} placement="right">
        <span>{shortened}</span>
      </Tooltip>
    )

  return (
    <Tooltip title={<>{path}<br/>(click for details)</>} placement="right">
      <Portal to={`/apps/app/${path}`}>
        {shortened}
      </Portal>
    </Tooltip>
  )
}
