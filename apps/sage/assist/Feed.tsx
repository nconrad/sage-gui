
import { useEffect, useState, memo, useRef, type ReactNode, type SyntheticEvent } from 'react'
import { styled } from '@mui/material/styles'

import { type Task } from './Assistant'
import * as BH from '/components/apis/beehive'
import { Accordion, AccordionDetails, AccordionSummary, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ObjectRenderer from './ObjectRenderer'
import { marked } from 'marked'

import Bee from 'url:./bee.gif'
import { sortResponses } from './sgUtils'
import { relativeTime } from '/components/utils/units'
import { useProgress } from '/components/progress/ProgressProvider'

const PROMPT_OVERLAY_HEIGHT = 120
const PROMPT_BOTTOM_OFFSET = 0


type ParsedRecord = BH.Record | (BH.Record & {value: {query?: string, answer?: unknown, output?: string}})

type ResponseProps = {
  record: ParsedRecord
  showImage?: boolean
}

const getStreamPrompt = (record: ParsedRecord): string => {
  const valueObj = typeof record.value == 'object' && record.value ? record.value as {[key: string]: unknown} : {}
  const metaObj = record.meta as {[key: string]: unknown} | undefined
  const recordObj = record as unknown as {[key: string]: unknown}

  const promptCandidate =
    valueObj.query ||
    valueObj.prompt ||
    valueObj.question ||
    valueObj.input ||
    metaObj?.query ||
    metaObj?.prompt ||
    recordObj.query ||
    recordObj.prompt

  return typeof promptCandidate == 'string' ? promptCandidate : ''
}

function Response(props: ResponseProps) {
  const {record, showImage} = props
  const {value} = record

  const [expanded, setExpanded] = useState<boolean>(!!showImage)

  const handleChange = (_: SyntheticEvent, open: boolean) => {
    setExpanded(open)
  }


  let ele: ReactNode = 'loading...'
  if (typeof value == 'object' && value) {
    const markdownOutput = (value as {output?: string}).output || ''
    const responsePrompt = getStreamPrompt(record)

    ele = <div>
      {responsePrompt &&
        <PromptBubble>
          {responsePrompt}
        </PromptBubble>
      }
      <div
        className="font-medium no-margin"
        dangerouslySetInnerHTML={{__html: marked(markdownOutput)}}
      />
      <span className="muted text-xs">{relativeTime(record.timestamp)}</span>
    </div>
  } else if (typeof value == 'string' && value.includes('https://')) {
    ele =
      <Accordion expanded={expanded} onChange={handleChange} className="upload">
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1-content"
          id="panel1-header"
        >
          <Typography component="span">Image</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {expanded && <ObjectRenderer url={value} retry={true} />}
        </AccordionDetails>
      </Accordion>
  } else {
    ele = value
  }

  return (
    <div>
      {ele}
    </div>
  )
}


type Props = {
  tasks: Task[]
  isRunning: boolean
}

export default memo(function Feed(props: Props) {
  const {tasks, isRunning} = props
  const currentTaskPrompt = tasks[0]?.prompt

  const bottomRef = useRef<HTMLDivElement | null>(null)

  const {setLoading} = useProgress()
  const [data, setData] = useState<ParsedRecord[]>()
  const [feedError, setFeedError] = useState<string | null>(null)

  // get history of data
  useEffect(() => {
    if (!tasks.length) {
      setFeedError(null)
      return
    }

    const {fullJobSpec} = tasks[0]
    if (!fullJobSpec) return

    const {nodes, plugins} = fullJobSpec
    const vsns = Object.keys(nodes)

    // assume one app, for now
    const task = plugins[0].name

    // first, get previous data
    const loadHistory = async () => {
      setLoading(true)
      setFeedError(null)

      try {
        const res = await BH.getData({
          start: '-1d',
          filter: {
            vsn: vsns.join('|'),
            task
          }
        })

        let d = res.sort(sortResponses)

        d = res.map(obj => {
          try {
            obj.value = JSON.parse(obj.value as string)
          } catch {
            // do nothing if not json
          }

          return obj
        })

        setData(d)
      } catch (err) {
        console.error('Failed to fetch feed history', err)
        setFeedError('Unable to load previous responses. Live updates may still continue.')
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [setLoading, tasks])

  // once we have historical data, start eventSource streaming
  useEffect(() => {
    if (!tasks.length) return

    const {fullJobSpec} = tasks[0]
    if (!fullJobSpec) return

    const {nodes, plugins}= fullJobSpec
    const vsns = Object.keys(nodes)

    // assume one app, for now
    const task = plugins[0].name

    setFeedError(null)
    const eventSource = BH.createEventSource({vsn: vsns.join('|'), task})

    eventSource.onerror = function(e) {
      console.error('Feed stream error', e)
      setFeedError('Live feed disconnected. Trying to reconnect...')
    }

    eventSource.onmessage = function(e) {
      let obj
      try {
        obj = JSON.parse(e.data)
      } catch (err) {
        console.error('Invalid feed message payload', err)
        setFeedError('Received malformed live update data.')
        return
      }

      try {
        obj.value = JSON.parse(obj.value as string)
      } catch {
        // do nothing if not json
      }

      setFeedError(null)
      setData(prev => [...(prev || []), obj].sort(sortResponses))
    }

    return () => {
      eventSource.close()
    }
  }, [data, tasks])


  useEffect(() => {
    if (!bottomRef.current) return
    bottomRef.current.scrollIntoView({block: 'end'})
  }, [data, isRunning])

  return (
    <Root id="responses">
      <FeedOccluder />
      {feedError && <StickyErrorMsg role="alert">{feedError}</StickyErrorMsg>}
      {data?.map((record, i) => {
        return (
          <div key={i} className="response">
            <Response
              record={record}
              showImage={i > data.length - 5 * 2}
            />
          </div>
        )
      })
      }
      {isRunning &&
        <>
          {currentTaskPrompt &&
            <PromptBubble>{currentTaskPrompt}</PromptBubble>
          }
          <LoadingBee className="flex column items-center justify-center">
            <img src={Bee} />
            <span>Working on a response...</span>
          </LoadingBee>
        </>
      }
      <BottomSpacer ref={bottomRef} />
    </Root>
  )
}, (prev, next) => JSON.stringify(prev.tasks) == JSON.stringify(next.tasks))


const Root = styled('div')`
  max-width: 960px;
  padding: 40px;
  padding-bottom: 24px;

  position: relative;

  .response {
    margin-bottom: 10px;

    img {
      max-width: 800px;
    }
  }

  .response .upload {
    margin-bottom: 40px;
  }
`

const FeedOccluder = styled('div')`
  position: sticky;
  bottom: ${PROMPT_BOTTOM_OFFSET}px;
  z-index: 3;
  pointer-events: none;
  height: ${PROMPT_OVERLAY_HEIGHT}px;
  margin-top: -${PROMPT_OVERLAY_HEIGHT}px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.2) 30%,
    rgba(255, 255, 255, 0.75) 68%,
    #fff 100%
  );
`

const StickyErrorMsg = styled('div')`
  position: sticky;
  top: 0;
  z-index: 6;
  margin-bottom: 10px;
  background: #fce8e6;
  color: #8a1c1c;
  border: 1px solid #f2b8b5;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 0.85rem;
  font-weight: 600;
`

const BottomSpacer = styled('div')`
  height: ${PROMPT_OVERLAY_HEIGHT - 24}px;
`

const PromptBubble = styled('div')`
  display: block;
  width: fit-content;
  background: #c6b9ff;
  padding: 5px 10px;
  margin: 1rem 0 .5rem auto;
  border-radius: 5px;
  font-weight: bold;
`

const LoadingBee = styled('div')`
  margin: .5rem 0 1.25rem;
  opacity: 1;

  span {
    color: #5f6368;
    font-weight: 500;
  }


  img {
    max-width: 72px;
  }
`