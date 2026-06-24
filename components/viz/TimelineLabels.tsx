import { useState, useEffect } from 'react'
import styled from 'styled-components'

import { type TimelineProps } from './Timeline'


type Props = {
  labels: string[]
  data: TimelineProps['data']
  formatter: TimelineProps['yFormat']
  margin: {left?: number}
  rowHeightPx?: number
  align?: 'start' | 'end'
}

export default function TimelineLabels(props: Props) {
  const {formatter, rowHeightPx = 15, align = 'end'} = props

  const [labels, setLabels] = useState(props.labels)

  useEffect(() => {
    setLabels(props.labels)
  }, [props.labels])


  return (
    <Root rowHeightPx={rowHeightPx} align={align}>
      <div className="labels">
        {labels.map(label =>
          <div key={label} className="label">
            {formatter ? formatter(label) : label}
          </div>
        )}
      </div>
    </Root>
  )
}

const Root = styled.div<{rowHeightPx: number, align: 'start' | 'end'}>`
  margin: -1px 2px 0 0;
  white-space: nowrap;
  text-align: ${(props) => props.align == 'start' ? 'start' : 'end'};
  font-weight: bold;

  .label {
    height: ${(props) => props.rowHeightPx}px;
    display: flex;
    align-items: center;
    justify-content: ${(props) => props.align == 'start' ? 'flex-start' : 'flex-end'};
    font-size: .8rem;
  }
`
