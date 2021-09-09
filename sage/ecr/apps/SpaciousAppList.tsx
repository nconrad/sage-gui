import React from 'react'
import styled from 'styled-components'

import Tooltip from '@material-ui/core/Tooltip'
import LaunchIcon from '@material-ui/icons/LaunchRounded'
import PublicIcon from '@material-ui/icons/PublicRounded'
import SharedIcon from '@material-ui/icons/PeopleAltRounded'
import GithubIcon from '@material-ui/icons/GitHub'

import { Item, Title } from '../../common/Layout'
import BuildIndicator from '../BuildIndicator'
import RepoActions from '../RepoActions'
import { formatters, Thumb, Dot } from '../formatters'
import BeeIcon from 'url:../../../assets/bee.svg'

import * as Auth from '../../../components/auth/auth'
import config from '../../../config'

const isSignedIn = Auth.isSignedIn()




function Row(props) {
  const {data, view, onComplete, onNavigate} = props

  const {
    namespace,
    name,
    version,
    versions,
    isPublic,
    isShared,
    description,
    time_last_updated,
    isBuilding,
    buildResult,
    buildUrl,
    thumbnail
  } = data


  const verCount = versions.length

  const handleClick = (evt) => {
    if (evt.target.closest('.MuiDialog-root')) {
      // prevent navigation if using dialog
      evt.preventDefault()
      return
    }

    // if not link or button, allow navigation
    if (!evt.target.hasAttribute('href') && !evt.target.closest('.MuiButtonBase-root')) {
      onNavigate(`/apps/app/${namespace}/${name}`)
    }
  }

  return (
    <Item
      className="flex justify-between large-click-target"
      onClick={handleClick}
    >
      <div className="flex">
        <div>
          {thumbnail?.length ?
            <Thumb src={`${config.ecr}/meta-files/${thumbnail}`} /> :
            <Thumb className="placeholder" src={BeeIcon} />
          }
        </div>

        <div className="flex column justify-around">
          <Title>
            {view != 'explore' && `${namespace} /`} {formatters.name(name, data)}{' '}
          </Title>

          {description && <p>{description}</p>}

          <div className="flex muted">
            <BuildIndicator buildUrl={buildUrl} isBuilding={isBuilding} buildResult={buildResult} />
            {buildUrl && <Dot />}


            {view == 'explore' &&
              <>
                {namespace}
                <Dot />
              </>
            }

            {view != 'explore' && isPublic &&
              <>
                <div className="flex items-center">
                  <PublicIcon fontSize="small" />&nbsp;<span>public</span>
                </div>
                <Dot />
              </>
            }

            <div>{verCount} tag{verCount > 1 ? 's' : ''}</div>

            <Dot />

            <div>Updated {formatters.time(time_last_updated)}</div>

            {isShared &&
              <>
                <Dot />
                <div className="muted"><SharedIcon /></div>
              </>
            }
          </div>
        </div>
      </div>

      <div>
        <Tooltip
          title={<>GitHub <LaunchIcon style={{fontSize: '1.1em'}}/></>}
          placement="top"
          className="external-link hover"
        >
          <a href={data.source.url}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
          >
            <GithubIcon className="text-color" />
          </a>
        </Tooltip>

      </div>

      {view != 'explore' && isSignedIn &&
        <div className="actions">
          <RepoActions
            namespace={namespace}
            name={name}
            version={version}
            isPublic={isPublic}
            onComplete={onComplete}
            versionCount={versions.length}
          />
        </div>
      }
    </Item>
  )
}





type Props = {
  rows: {[key: string]: any}
  onComplete: () => void
  view: 'explore' | 'public' | 'mine'
  onNavigate: (path: string) => void
}



export default function SpaciousLayout(props: Props) {
  const {rows, ...rest} = props

  return (
    <Root>
      <Rows>
        {rows.map((row) =>
          <Row key={row.id} data={row} {...rest} />
        )}
      </Rows>
    </Root>
  )
}

const Root = styled.div`
  margin-top: 1em;
`

const Rows = styled.div`
  margin-top: 1em;
`


