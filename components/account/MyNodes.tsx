import { useEffect, useState } from 'react'

import styled from 'styled-components'
import { useProgress } from '/components/progress/ProgressProvider'

import Table from '/components/table/Table'
import * as User from '/components/apis/user'
import * as BK from '/components/apis/beekeeper'
import { vsnLink, accessFormatter, AccessFilterButtons } from '/components/views/nodes/nodeFormatters'
import ErrorMsg from '../../apps/sage/ErrorMsg'

import config from '/config'
const { contactUs } = config


const columns = [{
  id: 'vsn',
  label: 'Node (VSN)',
  format: vsnLink
}, {
  id: 'access',
  label: 'Access',
  format: accessFormatter
}]


export default function MyNodes() {
  const {setLoading} = useProgress()

  const [data, setData] = useState<(User.MyNode & Partial<BK.Node>)[]>()
  const [error, setError] = useState(null)
  const [accessFilters, setAccessFilters] = useState<Set<User.AccessPerm>>(new Set())

  useEffect(() => {
    setLoading(true)

    Promise.all([User.listMyNodes(), BK.getNodeDict()])
      .then(([myNodes, nodeDict]) => {
        setData(myNodes.map(o => ({...o, ...nodeDict[o.vsn]})))
      })
      .catch(error => setError(error))
      .finally(() => setLoading(false))

  }, [setLoading])

  const toggleAccessFilter = (perm: User.AccessPerm) => {
    setAccessFilters(prev => {
      const next = new Set(prev)
      if (next.has(perm)) next.delete(perm)
      else next.add(perm)
      return next
    })
  }

  const applyAccessFilter = (rows: typeof data) =>
    (rows || []).filter(node => {
      if (accessFilters.size === 0) return true
      const nodeAccess = node.access || []
      return Array.from(accessFilters).every(p => nodeAccess.includes(p))
    })

  const sageData = applyAccessFilter(data?.filter(n => n.project?.includes('SAGE')))
  const sgtData  = applyAccessFilter(data?.filter(n => n.project?.includes('SGT')))

  const emptyNotice = (
    <div>
      It looks like you do not have access to any nodes.<br/>
      Please <b><a href="/request-access">Request Access</a></b> or <b><a href={contactUs}>Contact Us</a></b> if
      interested<br/> in using Sage or collaborating with us.
    </div>
  )

  return (
    <Root>
      <div className="flex items-center gap" style={{ marginBottom: '1.5rem' }}>
        <h1 className="no-margin">My Node Access</h1>
      </div>

      <FilterBar>
        <label>Access:</label>
        <AccessFilterButtons accessFilters={accessFilters} onToggle={toggleAccessFilter} />
      </FilterBar>

      {data && (
        <TablesContainer>
          <div>
            <h3>Sage</h3>
            <Table
              primaryKey="vsn"
              enableSorting
              columns={columns}
              rows={sageData}
              emptyNotice={emptyNotice}
            />
          </div>
          <div>
            <h3>Sage Grande Testbed (SGT)</h3>
            <Table
              primaryKey="vsn"
              enableSorting
              columns={columns}
              rows={sgtData}
              emptyNotice={emptyNotice}
            />
          </div>
        </TablesContainer>
      )}

      {error &&
        <ErrorMsg>{error.message}</ErrorMsg>
      }
    </Root>
  )
}

const Root = styled.div``

const FilterBar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
`

const TablesContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
`
