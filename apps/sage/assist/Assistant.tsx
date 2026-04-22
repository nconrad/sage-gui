import { useState, useEffect } from 'react'
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
import { useSnackbar } from 'notistack'
import { modelOptions, sageRecommendedModelOptions, experimentalModelOptions } from './models'

import Feed from './Feed'
import { ArrowRightRounded } from '@mui/icons-material'



const storageKey = 'sage-assistant'



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

const getTasks = () : Task[] =>
  JSON.parse(LS.get(storageKey))

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
  const {enqueueSnackbar} = useSnackbar()

  const [prompt, setPrompt] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>(
    sageRecommendedModelOptions[0]?.value || modelOptions[0]?.value || 'gemma4:e2b'
  )
  const [showExperimentalModels, setShowExperimentalModels] = useState(false)
  const [selectedFrequency, setSelectedFrequency] = useState<number>(1)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [lastUpdate, setLastUpdate] = useState<Date>(null)
  const [tasks, setTasks] = useState<Task[]>([])

  // const [showNodeSelector, setShowNodeSelector] = useState(false)


  useEffect(() => {
    let done = false
    let handle

    // get latest metrics
    function ping() {
      handle = setTimeout(async () => {
        if (done) return

        // recursive
        updateJobState()
      }, 5000)
    }

    const updateJobState = async () => {
      const tasks = getTasks() || []
      const id = tasks.length ? tasks[0].job_id : null

      if (!id) {
        return
      }

      let job
      try {
        // setLoading(true)
        job = await SES.getJobStatus(id)
      } catch {
        console.log('err', job)
        setError(job)
      }

      setLastUpdate(new Date())
      // setLoading(false)

      const oldRecord = tasks.filter(obj => obj.job_id != job.job_id)

      const newRecord: Task = {
        job_id: job.job_id,
        job_name: job.name,
        prompt: getPromptArg(job.plugins[0]?.plugin_spec?.args),
        state: job.state.last_state,
        fullJobSpec: job
      }
      const records = [...oldRecord, newRecord]

      // LS.set(storageKey, records)
      setTasks(records)

      ping()
    }

    updateJobState()

    return () => {
      done = true
      clearTimeout(handle)
    }
  }, [])


  const handleSubmit = () => {
    setSubmitting(true)

    const tasks = getTasks() || []

    // consider single task for now
    const id = tasks.length ? tasks[0].job_id : null

    // if job exists, restart it
    if (id) {
      SES.editJob(id, getDefaultSpec({
        prompt,
        vsn: 'H00F',
        model: selectedModel,
        every: getEveryCron(selectedFrequency)
      }))
        .then((res) => {
          const oldRecords = getTasks() || []
          const newRecord = {...res, prompt}
          const records = [...oldRecords, newRecord]
          LS.set(storageKey, records)
          setTasks(records)

          // todo(nc): look into possible race condition
          SES.resubmitJobs(id)
            .then(() => {
              enqueueSnackbar(`New prompt task started`, {variant: 'success'})
            })
            .catch((err) => {
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
      SES.submitJob(getDefaultSpec({
        prompt,
        vsn: 'H00F',
        model: selectedModel,
        every: getEveryCron(selectedFrequency)
      }))
        .then((res) => {
          const oldRecords = getTasks() || []
          const newRecord = {...res, prompt}
          const records = [...oldRecords, newRecord]
          LS.set(storageKey, records)
          setTasks(records)
        })
        .catch(err => setError(err))
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

  return (
    <Root className="flex">
      <Sidebar width={310}>
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
      </Sidebar>

      <Main className="flex column items-center w-full" id="main">
        <Title>
          <h3>EdgeRunner</h3>

          {error && <ErrorMsg>{error.message}</ErrorMsg>}
        </Title>

        <Feed tasks={tasks}
          isRunning={!!tasks.find(task => task.state == 'Running')}
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
              <Select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                variant="standard"
                disableUnderline
                renderValue={(value) => modelOptions.find(option => option.value == value)?.label || String(value)}
                sx={{
                  ...compactSelectSx,
                  minWidth: 140
                }}
              >
                <ListSubheader sx={compactHeaderSx}>
                  Sage recommended
                </ListSubheader>
                {sageRecommendedModelOptions.map((option) => (
                  <MenuItem
                    key={`sage-${option.value}`}
                    value={option.value}
                    sx={{
                      ...compactMenuItemSx,
                      ...(option.recommended ? {
                        fontWeight: 600
                      } : {})
                    }}
                  >
                    {option.label}
                  </MenuItem>
                ))}

                <MenuItem
                  sx={{
                    ...compactMenuItemSx,
                    fontWeight: 500
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setShowExperimentalModels((prev) => !prev)
                  }}
                >
                  other models (experimental) {!showExperimentalModels && <ArrowRightRounded />}
                </MenuItem>
                {showExperimentalModels && experimentalModelOptions.map((option) => (
                  <MenuItem
                    key={`all-${option.value}`}
                    value={option.value}
                    sx={{
                      ...compactMenuItemSx,
                      ...(option.recommended ? {
                        fontWeight: 600
                      } : {})
                    }}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </Select>

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
  background: #fff;

  h3 {
    margin: .5rem 1rem;
  }
`

const Main = styled('div')`
  padding: 0 0;
  overflow-y: scroll;
  background: #fff;
`

const PromptContainer = styled('div')`
  ${boxShadow}

  position: sticky;
  bottom: 20px;
  z-index: 5;

  background: #fff;

  padding: 20px;
  margin: 20px;
  border-radius: 10px;
`


