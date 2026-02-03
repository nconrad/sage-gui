import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { styled } from '@mui/material'
import { useProgress } from '/components/progress/ProgressProvider'

import Table from '/components/table/Table'
import * as User from '/components/apis/user'
import ErrorMsg from '/apps/sage/ErrorMsg'

import Auth from '/components/auth/auth'
import config from '/config'
const { contactUs } = config


type TeamMember = {
  username: string
  name: string
  projectNames: string[]
}


const columns = [{
  id: 'name',
  label: 'Name',
  format: (name) => name || '-'
}, {
  id: 'username',
  label: 'Username',
  format: (username) => <code>{username}</code>
}, {
  id: 'projectNames',
  label: 'Projects(s)',
  format: (projectNames: string[]) => (
    <>
      {projectNames.map((projectName, i) => (
        <span key={projectName}>
          <Link to={`/user/${Auth.user}/teams/${encodeURIComponent(projectName)}`}>{projectName}</Link>
          {i < projectNames.length - 1 && ', '}
        </span>
      ))}
    </>
  )
}]


export default function MyTeams() {
  const {setLoading} = useProgress()

  const [data, setData] = useState<TeamMember[]>()
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)

    User.listMyProjects()
      .then(({projects}) => {
        // Group members by username and collect all their projects
        const memberMap = new Map<string, TeamMember>()

        projects.forEach(project => {
          project.members.forEach(member => {
            if (memberMap.has(member.username)) {
              // Add project to existing member
              memberMap.get(member.username)!.projectNames.push(project.name)
            } else {
              // Create new member entry
              memberMap.set(member.username, {
                username: member.username,
                name: member.name,
                projectNames: [project.name]
              })
            }
          })
        })

        setData(Array.from(memberMap.values()))
      })
      .catch(error => setError(error))
      .finally(() => setLoading(false))

  }, [setLoading])

  return (
    <Root>
      <h1 className="no-margin">My Team Members</h1>
      <br/>
      {data &&
        <Table
          primaryKey="username"
          enableSorting
          columns={columns}
          rows={data}
          emptyNotice={<div>
            You are not part of any projects.<br/>
            Please <b><a href={contactUs}>contact us</a></b> if
            interested in collaborating with Sage.
          </div>}
        />
      }

      {error &&
        <ErrorMsg>{error.message}</ErrorMsg>
      }
    </Root>
  )
}

const Root = styled('div')`
  margin-top: 2rem;
`
