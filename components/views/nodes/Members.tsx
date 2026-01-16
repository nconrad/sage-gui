import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { styled } from '@mui/material'
import { useProgress } from '/components/progress/ProgressProvider'

import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded'

import Table from '/components/table/Table'
import * as User from '/components/apis/user'
import ErrorMsg from '/apps/sage/ErrorMsg'


type Member = {
  username: string
  name: string
}


const columns = [{
  id: 'name',
  label: 'Name',
  format: (name) => name || '-'
}, {
  id: 'username',
  label: 'Username',
  format: (username) => <code>{username}</code>
}]


export default function Members() {
  const { projectName } = useParams()
  const {setLoading} = useProgress()

  const [data, setData] = useState<Member[]>()
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)

    User.listMyProjects()
      .then(({projects}) => {
        const project = projects.find(p => p.name === projectName)
        if (project) {
          setData(project.members)
        } else {
          setError(new Error(`Project "${projectName}" not found`))
        }
      })
      .catch(error => setError(error))
      .finally(() => setLoading(false))

  }, [setLoading, projectName])

  return (
    <Root>
      <Link to={`/user/${projectName}/projects`} className="flex items-center gap">
        <ArrowBackIcon /> Back to Projects
      </Link>
      <br/>

      <h1 className="no-margin">
        {projectName} Team Members
      </h1>
      <br/>

      {data &&
        <Table
          primaryKey="username"
          enableSorting
          columns={columns}
          rows={data}
          emptyNotice={<div>
            No members found for this project.
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

`
