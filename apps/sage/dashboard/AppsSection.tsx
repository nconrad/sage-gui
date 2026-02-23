import { useState } from 'react'
import { Link } from 'react-router-dom'
import { styled } from '@mui/material'
import { AppsRounded, ArrowForwardRounded } from '@mui/icons-material'

import { Card } from '/components/layout/Layout'
import Table from '/components/table/Table'
import TableSkeleton from '/components/table/TableSkeleton'
import * as ECR from '/components/apis/ecr'
import { formatters as appFormatters } from '../ecr/formatters'


type AppsSectionProps = {
  apps: ECR.AppDetails[]
}


const appColumns = [{
  id: 'name',
  label: 'App',
  format: appFormatters.name
}, {
  id: 'namespace',
  label: 'Namespace'
}, {
  id: 'versions',
  label: 'Tags',
  format: appFormatters.versions
}, {
  id: 'time_last_updated',
  label: 'Last Update',
  format: appFormatters.time
}]


export default function AppsSection({ apps }: AppsSectionProps) {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')

  return (
    <Section>
      <Card>
        <SectionHeader>
          <SectionTitle>
            <AppsRounded /> Recent Apps
          </SectionTitle>
          {apps && apps.length > 0 &&
            <ViewAllLink to="/apps/my-apps">
              View All <ArrowForwardRounded fontSize="small" />
            </ViewAllLink>
          }
        </SectionHeader>
        {!apps ? (
          <TableSkeleton noSearch rows={3} />
        ) : apps.length > 0 ? (
          <Table
            primaryKey="id"
            enableSorting
            sort="-time_last_updated"
            columns={appColumns}
            rows={apps}
            pagination={true}
            page={page}
            onPage={(newPage) => setPage(newPage)}
            rowsPerPage={10}
            limit={apps.length}
            search={search}
            onSearch={({query}) => setSearch(query)}
            middleComponent={<></>}
          />
        ) : (
          <EmptyState>
            <EmptyIcon><AppsRounded /></EmptyIcon>
            <p>You haven't created any apps yet</p>
            <Link to="/apps/create-app">Create Your First App</Link>
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
