import { useState } from 'react'
import { Link } from 'react-router-dom'
import { styled } from '@mui/material'
import { PlaylistAddCheckRounded, ArrowForwardRounded } from '@mui/icons-material'

import { Card } from '/components/layout/Layout'
import Table from '/components/table/Table'
import TableSkeleton from '/components/table/TableSkeleton'
import { relativeTime } from '/components/utils/units'
import * as ES from '/components/apis/ses'



const jobColumns = [{
  id: 'name',
  label: 'Job',
  format: (val, row) => <Link to={`/jobs/my-jobs?job=${row.id}`}>{val}</Link>
}, {
  id: 'last_state',
  label: 'Status',
  format: (val) => {
    return <b className={val.toLowerCase()}>{val || '-'}</b>
  },
}, {
  id: 'nodes',
  label: 'Nodes',
  format: (nodes) => nodes.length
}, {
  id: 'last_submitted',
  label: 'Submitted',
  format: (val) => relativeTime(val) || '-'
}]

type JobsSectionProps = {
  jobs: ES.Job[]
}

export default function JobsSection({ jobs }: JobsSectionProps) {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')

  return (
    <Section>
      <Card>
        <SectionHeader>
          <SectionTitle>
            <PlaylistAddCheckRounded /> Recent Jobs
          </SectionTitle>
          {jobs && jobs.length > 0 &&
            <ViewAllLink to="/jobs/my-jobs">
              View All <ArrowForwardRounded fontSize="small" />
            </ViewAllLink>
          }
        </SectionHeader>
        {!jobs ? (
          <TableSkeleton noSearch rows={3} />
        ) : jobs.length > 0 ? (
          <Table
            primaryKey="id"
            enableSorting
            sort="-last_submitted"
            columns={jobColumns}
            rows={jobs}
            pagination={true}
            page={page}
            onPage={(newPage) => setPage(newPage)}
            rowsPerPage={10}
            limit={jobs.length}
            search={search}
            onSearch={({query}) => setSearch(query)}
            middleComponent={<></>}
          />
        ) : (
          <EmptyState>
            <EmptyIcon><PlaylistAddCheckRounded /></EmptyIcon>
            <p>You haven't submitted any jobs yet</p>
            <Link to="/jobs/create-job">Create Your First Job</Link>
          </EmptyState>
        )}
      </Card>
    </Section>
  )
}


const Section = styled('div')`
  /* Card styles handled by Card component */
`

const SectionHeader = styled('div')`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid ${({ theme }) => theme.palette.mode === 'dark' ? '#444' : '#e0e0e0'};
`

const SectionTitle = styled('h2')`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25em;
  color: ${({ theme }) => theme.palette.mode === 'dark' ? '#fff' : '#333'};

  svg {
    color: ${({ theme }) => theme.palette.primary.main};
  }
`

const ViewAllLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: ${({ theme }) => theme.palette.primary.main};
  text-decoration: none;
  font-size: 0.9em;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    gap: 0.5rem;
    text-decoration: underline;
  }

  svg {
    transition: transform 0.2s ease;
  }

  &:hover svg {
    transform: translateX(4px);
  }
`

const EmptyState = styled('div')`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.palette.text.secondary};

  p {
    margin: 1rem 0;
    font-size: 1.1em;
  }

  a {
    color: ${({ theme }) => theme.palette.primary.main};
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
`

const EmptyIcon = styled('div')`
  svg {
    font-size: 4em;
    opacity: 0.3;
  }
`
