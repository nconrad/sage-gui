import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { styled } from '@mui/material'
import { WorkOutline, HubOutlined, GroupOutlined } from '@mui/icons-material'
import { useProgress } from '/components/progress/ProgressProvider'

import Table from '/components/table/Table'
import * as User from '/components/apis/user'
import ErrorMsg from '/apps/sage/ErrorMsg'

import Auth from '/components/auth/auth'
import config from '/config'
const { contactUs } = config


const columns = [{
  id: 'name',
  label: 'Project Name',
  format: (name) => <b>{name}</b>
}, {
  id: 'nodes',
  label: 'Nodes',
  format: (nodes) => nodes.length
}, {
  id: 'members',
  label: 'Team Members',
  format: (members, obj) =>
    <Link to={`/user/${Auth.user}/teams/${obj.name}`}>
      {members.length} {members.length === 1 ? 'member' : 'members'}
    </Link>
}]


export default function MyProjects() {
  const {setLoading} = useProgress()

  const [data, setData] = useState<User.Project[]>()
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)

    User.listMyProjects()
      .then(({projects}) => setData(projects))
      .catch(error => setError(error))
      .finally(() => setLoading(false))

  }, [setLoading])

  // Calculate unique counts
  const uniqueNodes = data ? new Set(data.flatMap(p => p.nodes.map(n => n.vsn))).size : 0
  const uniqueMembers = data ? new Set(data.flatMap(p => p.members.map(m => m.username))).size : 0

  return (
    <Root>
      <h1 className="no-margin">My Projects</h1>
      <br/>

      {data &&
        <>
          <StatsContainer>
            <StatCard>
              <StatIcon><WorkOutline /></StatIcon>
              <StatContent>
                <StatValue>{data.length}</StatValue>
                <StatLabel>Project{data.length !== 1 ? 's' : ''}</StatLabel>
              </StatContent>
            </StatCard>
            <StatCard>
              <StatIcon><HubOutlined /></StatIcon>
              <StatContent>
                <StatValue>{uniqueNodes}</StatValue>
                <StatLabel>Unique node{uniqueNodes !== 1 ? 's' : ''}</StatLabel>
              </StatContent>
            </StatCard>
            <StatCard>
              <StatIcon><GroupOutlined /></StatIcon>
              <StatContent>
                <StatValue>{uniqueMembers}</StatValue>
                <StatLabel>Team member{uniqueMembers !== 1 ? 's' : ''}</StatLabel>
              </StatContent>
            </StatCard>
          </StatsContainer>

          <Table
            primaryKey="name"
            enableSorting
            columns={columns}
            rows={data}
            emptyNotice={<div>
              You are not part of any projects.<br/>
              Please <b><a href={contactUs}>contact us</a></b> if
              interested in collaborating with Sage.
            </div>}
          />
        </>
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

const StatsContainer = styled('div')`
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
`

const StatCard = styled('div')`
  background: ${({ theme }) => theme.palette.mode === 'dark' ? '#2a2a2a' : '#f8f9fa'};
  border: 1px solid ${({ theme }) => theme.palette.mode === 'dark' ? '#444' : '#e0e0e0'};
  border-radius: 8px;
  padding: 24px;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s ease;

  /*
  &:hover {
    border-color: ${({ theme }) => theme.palette.primary.main};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  */
`

const StatIcon = styled('div')`
  svg {
    font-size: 4em;
    color: ${({ theme }) => theme.palette.primary.main};
  }
`

const StatContent = styled('div')`
  flex: 1;
`

const StatValue = styled('div')`
  font-size: 2em;
  font-weight: bold;
  color: ${({ theme }) => theme.palette.mode === 'dark' ? '#fff' : '#333'};
  line-height: 1;
  margin-bottom: 4px;
`

const StatLabel = styled('div')`
  font-size: 0.875em;
  color: ${({ theme }) => theme.palette.mode === 'dark' ? '#999' : '#666'};
  font-weight: 500;
`
