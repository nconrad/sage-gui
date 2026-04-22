import { useState, useEffect, useCallback } from 'react'
import { styled } from '@mui/material/styles'
import Sidebar from '/components/layout/WideSidebar'
import { Select, MenuItem, Box, ListSubheader } from '@mui/material'

import Prompt from './Prompt'

import ErrorMsg from '../ErrorMsg'
import getDefaultSpec from './default-job'
import * as SES from '/components/apis/ses'
import * as LS from '/components/apis/localStorage'
import DefaultPrompts from './DefaultPrompts'
import Tasks from './Tasks'
import ModelSelector from './ModelSelector'
import CameraSelector, { defaultCameraValue } from './CameraSelector'
import ChatSelector from './ChatSelector'
import AssistLogger, { LoggerProvider, useLogger, type LogEntry } from './AssistLogger'
import { useSnackbar } from 'notistack'
import { modelOptions, sageRecommendedModelOptions } from './models'

import Feed from './Feed'



const storageKey = 'sage-edgerunner'



export type Task = {
  job_id: string
  job_name: string
  state: string
  prompt: string
  fullJobSpec: SES.Job
}

const getPromptArg = (args?: string[]): string => {
  if (!Array.isArray(args) || !args.length) {
    return ''
  }

  const promptIndex = args.indexOf('--prompt')
  if (promptIndex >= 0 && promptIndex + 1 < args.length) {
    const promptValue = args[promptIndex + 1]
    if (promptValue && !promptValue.startsWith('--')) {
      return promptValue
    }
  }

  const inlinePrompt = args.find(arg => arg.startsWith('--prompt='))
  if (inlinePrompt) {
    return inlinePrompt.slice('--prompt='.length)
  }

  return ''
}

const getTasks = () : Task[] => {
  const raw = LS.get(storageKey)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const getEveryCron = (mins: number): string => {
  if (mins <= 1) return '* * * * *'
  return `*/${mins} * * * *`
}

const getFrequencyLabel = (mins: number): string => {
  if (mins < 60) return `${mins}m`
  if (mins % 60 == 0) return `${mins / 60}h`
  return `${mins}m`
}

const compactSelectSx = {
  fontSize: '0.75rem',
  '& .MuiSelect-select': {
    display: 'flex',
    alignItems: 'center',
    minHeight: 'unset',
    paddingTop: 0,
    paddingBottom: 0,
  },
  '& .MuiSelect-icon': {
    right: -1,
    top: '50%',
    transform: 'translateY(-50%)'
  }
}

const compactHeaderSx = {
  fontSize: '0.75rem',
  fontWeight: 'bold',
  width: '100%',
  background: '#2e76a3',
  color: '#f2f2f2',
  padding: '4px 5px',
  lineHeight: 1.2
}

const compactMenuItemSx = {
  fontSize: '0.75rem'
}



export default function Assistant() {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const handleLogEntry = useCallback((entry: LogEntry) => setLogEntries(prev => [...prev, entry]), [])

  return (
    <LoggerProvider onEntry={handleLogEntry}>
      <AssistantInner
        logEntries={logEntries}
        onClearLogs={() => setLogEntries([])}
      />
    </LoggerProvider>
  )
}

type InnerProps = {
  logEntries: LogEntry[]
  onClearLogs: () => void
}

function AssistantInner({ logEntries, onClearLogs }: InnerProps) {
  const {enqueueSnackbar} = useSnackbar()
  const { log } = useLogger()

  const [prompt, setPrompt] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>(
    sageRecommendedModelOptions[0]?.value || modelOptions[0]?.value || 'gemma4:e2b'
  )
  const [selectedCamera, setSelectedCamera] = useState<string>(defaultCameraValue)
  const [selectedFrequency, setSelectedFrequency] = useState<number>(1)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [pendingPrompt, setPendingPrompt] = useState<string>('')
  const handleClearPending = useCallback(() => setPendingPrompt(''), [])

  const [lastUpdate, setLastUpdate] = useState<Date>(null)
  const [tasks, setTasks] = useState<Task[]>([])

  // const [showNodeSelector, setShowNodeSelector] = useState(false)


  const activeJobId = tasks[0]?.job_id

  useEffect(() => {
    const restoreSavedChat = async () => {
      const savedTasks = getTasks()
      const savedJobId = savedTasks[0]?.job_id
      if (!savedJobId) return

      try {
        const job = await SES.getJobStatus(String(savedJobId))
        const restoredTask: Task = {
          job_id: String(job.job_id),
          job_name: job.name,
          prompt: getPromptArg(job.plugins[0]?.plugin_spec?.args),
          state: job.state.last_state,
          fullJobSpec: job
        }

        LS.set(storageKey, [restoredTask])
        setTasks([restoredTask])
        setLastUpdate(new Date())
      } catch (err) {
        console.log('restoreSavedChat err', err)
      }
    }

    restoreSavedChat()
  }, [])

  useEffect(() => {
    const id = activeJobId
    if (!id) return

    let done = false
    let handle: ReturnType<typeof setTimeout> | undefined

    const pollJobState = async () => {
      try {
        const job = await SES.getJobStatus(id)
        if (done) return

        setLastUpdate(new Date())

        const newRecord: Task = {
          job_id: String(job.job_id),
          job_name: job.name,
          prompt: getPromptArg(job.plugins[0]?.plugin_spec?.args),
          state: job.state.last_state,
          fullJobSpec: job
        }

        LS.set(storageKey, [newRecord])
        setTasks([newRecord])
      } catch (err) {
        if (done) return
        console.log('err', err)
        setError(err)
      } finally {
        if (!done) {
          handle = setTimeout(pollJobState, 5000)
        }
      }
    }

    pollJobState()

    return () => {
      done = true
      if (handle) clearTimeout(handle)
    }
  }, [activeJobId])


  const handleSubmit = () => {
    const submittedPrompt = prompt
    setSubmitting(true)
    setPrompt('')
    setPendingPrompt(submittedPrompt)

    const tasks = getTasks() || []

    // consider single task for now
    const id = tasks.length ? tasks[0].job_id : null

    // if job exists, restart it
    if (id) {
      // preserve the existing task name / id
      const existingTaskName = tasks[0]?.fullJobSpec?.plugins?.[0]?.name || ''
      const existingId = existingTaskName.startsWith('edgerunner-demo-')
        ? existingTaskName.slice('edgerunner-demo-'.length)
        : ''
      const spec = getDefaultSpec({
        prompt: submittedPrompt,
        vsn: 'H00F',
        model: selectedModel,
        camera: selectedCamera,
        every: getEveryCron(selectedFrequency),
        id: existingId,
      })
      log('request', 'editJob', { id, model: selectedModel, camera: selectedCamera, prompt: submittedPrompt })
      SES.editJob(id, spec)
        .then((res) => {
          const oldRecords = getTasks() || []
          const newRecord = {...res, prompt: submittedPrompt}
          const records = [...oldRecords, newRecord]
          LS.set(storageKey, records)
          setTasks(records)

          // todo(nc): look into possible race condition
          SES.resubmitJobs(id)
            .then(() => {
              log('completion', 'resubmitJobs success', { id })
              enqueueSnackbar(`New prompt task started`, {variant: 'success'})
            })
            .catch((err) => {
              log('error', 'resubmitJobs failed', err?.message)
              enqueueSnackbar(
                <>Failed to resubmit at least one prompt<br/>{err.message}</>,
                {variant: 'error', autoHideDuration: 7000}
              )
            })
            .finally(() => {
              setSubmitting(false)
            })
        })
        .catch((err) => {
          log('error', 'editJob failed', err?.message)
          enqueueSnackbar(
            <>Failed to resubmit at least one job<br/>{err.message}</>,
            {variant: 'error', autoHideDuration: 7000}
          )
        })
        .finally(() => {
          // setLoading(false)
        })
    } else {
      // otherwise, start a new one
      const newId = crypto.randomUUID().slice(0, 8)
      const spec = getDefaultSpec({
        prompt: submittedPrompt,
        vsn: 'H00F',
        model: selectedModel,
        camera: selectedCamera,
        every: getEveryCron(selectedFrequency),
        id: newId,
      })
      log('request', 'submitJob', { model: selectedModel, camera: selectedCamera, prompt: submittedPrompt })
      SES.submitJob(spec)
        .then(async (res) => {
          log('completion', 'submitJob success', { job_id: res.job_id })
          const job = await SES.getJobStatus(String(res.job_id))
          const newRecord: Task = {
            job_id: String(job.job_id),
            job_name: job.name,
            prompt: getPromptArg(job.plugins[0]?.plugin_spec?.args) || submittedPrompt,
            state: job.state.last_state,
            fullJobSpec: job
          }
          LS.set(storageKey, [newRecord])
          setTasks([newRecord])
        })
        .catch(err => {
          log('error', 'submitJob failed', err?.message || String(err))
          setError(err)
        })
        .finally(() => setSubmitting(false))
    }

  }


  const handleDefaultPrompt = (val: string) => {
    setPrompt(val)
  }

  const handleTaskChange = (tasks) => {
    LS.set(storageKey, tasks)
    setTasks(tasks)
  }

  const handleSelectChat = (job: SES.Job) => {
    LS.set(storageKey, [])
    setTasks([])
    const task: Task = {
      job_id: String(job.job_id),
      job_name: job.name,
      prompt: getPromptArg(job.plugins?.[0]?.plugin_spec?.args),
      state: job.state?.last_state || '',
      fullJobSpec: job
    }
    LS.set(storageKey, [task])
    setTasks([task])
  }

  const handleNewChat = () => {
    LS.set(storageKey, [])
    setTasks([])
  }

  return (
    <Root className="flex">
      <Sidebar width={325}>
        <h3 className="flex justify-between items-end">
          Tasks
          <small>
            {lastUpdate?.toLocaleTimeString('en-US')}
          </small>
        </h3>
        <Tasks
          value={tasks}
          onChange={handleTaskChange}
          // onEditNode={() => setShowNodeSelector((prev => !prev))}
        />

        <AssistLogger entries={logEntries} onClear={onClearLogs} />
      </Sidebar>

      <Main className="flex column items-center w-full" id="main">
        <Title>
          <div className="flex items-center">
            <h3>EdgeRunner</h3>
            <ChatSelector
              currentJobId={tasks[0]?.job_id}
              onSelect={handleSelectChat}
              onNew={handleNewChat}
            />
          </div>

          {error && <ErrorMsg>{error.message}</ErrorMsg>}
        </Title>

        <Feed key={tasks[0]?.job_id || 'none'} tasks={tasks}
          isRunning={!!tasks.find(task => task.state == 'Running')}
          pendingPrompt={pendingPrompt}
          onClearPending={handleClearPending}
        />

        {/* stick prompt box at bottom */}
        <PromptContainer >
          <div className="flex column w-full">
            <DefaultPrompts
              onClick={handleDefaultPrompt}
            />
            <Prompt
              value={prompt}
              onChange={(val) => setPrompt(val) }
              onSubmit={handleSubmit}
              loading={submitting}
            />
            <ControlsRow>
              <ModelSelector value={selectedModel} onChange={setSelectedModel} />
              <CameraSelector value={selectedCamera} onChange={setSelectedCamera} />

              <Select
                value={selectedFrequency}
                onChange={(e) => setSelectedFrequency(e.target.value as number)}
                variant="standard"
                disableUnderline
                renderValue={(value) => `run every ${getFrequencyLabel(Number(value))}`}
                sx={{
                  ...compactSelectSx,
                  minWidth: 100
                }}
              >
                <ListSubheader sx={compactHeaderSx}>
                  run every...
                </ListSubheader>
                <MenuItem value={1} sx={compactMenuItemSx}>1m</MenuItem>
                <MenuItem value={5} sx={compactMenuItemSx}>5m</MenuItem>
                <MenuItem value={10} sx={compactMenuItemSx}>10m</MenuItem>
                <MenuItem value={15} sx={compactMenuItemSx}>15m</MenuItem>
                <MenuItem value={30} sx={compactMenuItemSx}>30m</MenuItem>
                <MenuItem value={60} sx={compactMenuItemSx}>1h</MenuItem>
                <MenuItem value={120} sx={compactMenuItemSx}>2h</MenuItem>
                <MenuItem value={240} sx={compactMenuItemSx}>4h</MenuItem>
                <MenuItem value={480} sx={compactMenuItemSx}>8h</MenuItem>
              </Select>
            </ControlsRow>
          </div>

        </PromptContainer>
      </Main>
    </Root>
  )
}


const Root = styled('div')`
  height: 100%;
`

const ControlsRow = styled(Box)`
  display: flex;
  gap: 1rem;
  margin-top: -0.4rem;
  margin-left: 1rem;
  padding: 0;

  .MuiInputBase-root {
    min-width: 20px;
  }
`

const boxShadow = `
  border-bottom: 1px solid rgba(0, 0, 0, 0.15);
  box-shadow:
    0px 2px 4px -1px rgb(0 0 0 / 0%),
    0px 4px 5px 0px rgb(0 0 0 / 0%),
    0px 1px 10px 0px rgb(0 0 0 / 12%);
`

const Title = styled('div')`
  ${boxShadow}

  position: sticky;
  top: 0;
  z-index: 1;
  width: 100%;
  background: ${({ theme }) => theme.palette.background.paper};

  h3 {
    margin: .5rem 1rem;
  }
`

const Main = styled('div')`
  padding: 0 0;
  overflow-y: scroll;
  background: ${({ theme }) => theme.palette.background.default};
`

const PromptContainer = styled('div')`
  ${boxShadow}

  position: sticky;
  bottom: 20px;
  z-index: 5;

  background: ${({ theme }) => theme.palette.background.paper};

  padding: 20px;
  margin: 20px;
  border-radius: 10px;
`


