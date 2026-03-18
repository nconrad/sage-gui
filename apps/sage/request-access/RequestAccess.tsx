import React, { useEffect, useState } from 'react'
import styled from 'styled-components'

import {
  Container, TextField, FormControlLabel, RadioGroup, Radio, Button,
  Box, Typography, Switch, Autocomplete,
  Tooltip, Divider as MuiDivider, Alert, Collapse,
  DividerProps,
} from '@mui/material'
import { Add, DragIndicator, HelpOutline, ExpandMore, ExpandLess } from '@mui/icons-material'

import Checkbox from '/components/input/Checkbox'
import { Step, StepTitle } from '/components/layout/FormLayout'

import Table from '/components/table/Table'
import { UserInfo } from '/components/apis/user'
import { listUserProjects, type Project } from '/components/apis/beekeeper'
import { getUserInfo, sendFeedback } from '/components/apis/user'
import { getNodes } from '/components/apis/beekeeper'
import MapGL from '/components/Map'
import { formatSubmission } from './formatSubmission'
import useIsStaff from '/components/hooks/useIsStaff'
import { sampleFormData, sampleReqType } from './sample'
import { sampleDownloadFormData, sampleDownloadReqType } from './sample-download-request'

import config from '/config'



const columns = [{
  id: 'name',
  label: 'Project'
}, {
  id: 'member_count',
  label: 'Project Members',
  format: (val) => `${val} users`
}, {
  id: 'nodes',
  label: 'Nodes',
  format: (val) => `${val.length} nodes`
}]


const getProjectSelectionLabel = (project) => {
  if (project === 'testbed') {
    return 'Select the testbed(s) you would like access to:'
  } else if (['add', 'file_access'].includes(project)) {
    return 'Select the nodes or project you would like to be added to:'
  } else if (project === 'renew') {
    return 'Select the project you would like to be renewed:'
  }
}


// todo: refactor
const DraggableContainer = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
  padding: 8px;
  cursor: grab;
`
const DropIndicator = styled.div<{ isVisible?: boolean }>`
  height: 2px;
  background-color: #6363eb;
  margin: 5px 0;
  opacity: ${({ isVisible }) => (isVisible ? 1 : 0)};
`


type FundingSource = {
  source: string
  grant_number: string
}

type Proposal = {
  title: string
  agency: string
  number: string
}

type FormData = {
  requester_name: string
  requester_email: string
  requester_institution: string
  pi_name: string
  use_profile_info: boolean
  pi_email: string
  pi_institution: string
  project_title: string
  project_website: string
  project_short_name: string
  project_description: string
  science_fields: string[]
  related_to_proposal: 'yes' | 'no' | ''
  proposals: Proposal[]
  edge_code_description: string
  publication_plan: string
  is_non_commercial: boolean
  data_collection: string
  grant_number: string
  funding_sources: FundingSource[]
  comments: string
  selected_nodes: object[]
  selected_projects: object[]
  running_apps: boolean
  shell_access: boolean
  file_access: boolean
  hpc_interest: 'yes' | 'no' | 'maybe' | ''
}

const scienceFields = [
  'Agricultural Science',
  'Astronomy',
  'Astrophysics',
  'Atmospheric Science',
  'Biochemistry',
  'Bioinformatics',
  'Biology',
  'Biotechnology',
  'Chemistry',
  'Climate Science',
  'Cognitive Science',
  'Computer Science',
  'Data Science',
  'Earth Science',
  'Ecology',
  'Engineering',
  'Environmental Science',
  'Epidemiology',
  'Genetics',
  'Geology',
  'Geophysics',
  'Glaciology',
  'Hydrology',
  'Information Science',
  'Materials Science',
  'Mathematics',
  'Medicine',
  'Microbiology',
  'Molecular Biology',
  'Neuroscience',
  'Oceanography',
  'Pharmacology',
  'Physics',
  'Psychology',
  'Public Health',
  'Robotics',
  'Seismology',
  'Social Science',
  'Soil Science',
  'Space Science',
  'Statistics',
  'Urban Science',
  'Wildlife Biology',
  'Other'
]

function HelpText({ title }: { title: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Box
        component="span"
        onClick={() => setOpen(prev => !prev)}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '1px',
          ml: 0.75,
          cursor: 'pointer',
          color: open ? 'primary.main' : 'text.secondary',
          '&:hover': { color: 'primary.main' },
          verticalAlign: 'middle',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        <HelpOutline sx={{ fontSize: '1.1rem' }} />
        {open
          ? <ExpandLess sx={{ fontSize: '0.9rem' }} />
          : <ExpandMore sx={{ fontSize: '0.9rem' }} />
        }
      </Box>
      <Collapse in={open} sx={{ flex: '0 0 100%' }}>
        <Typography
          variant="body2"
          sx={{
            mt: 0.75,
            px: 1.5,
            py: 1,
            borderLeft: '3px solid',
            borderColor: 'primary.main',
            color: 'text.secondary',
            bgcolor: 'action.hover',
            borderRadius: '0 4px 4px 0',
          }}
        >
          {title}
        </Typography>
      </Collapse>
    </>
  )
}

const Divider = (props: DividerProps) =>
  <MuiDivider sx={{ borderColor: 'rgba(0, 0, 0, 0.08)' }} {...props} />


export type AllocationType = 'testbed' | 'renew' | 'add' | 'file_access'

export default function ProjectForm() {
  const [formData, setFormData] = useState<FormData>({
    requester_name: '',
    requester_email: '',
    requester_institution: '',
    pi_name: '',
    use_profile_info: false,
    pi_email: '',
    pi_institution: '',
    project_title: '',
    project_website: '',
    project_short_name: '',
    project_description: '',
    science_fields: [],
    related_to_proposal: '',
    proposals: [{ title: '', agency: '', number: '' }],
    edge_code_description: '',
    publication_plan: '',
    is_non_commercial: false,
    data_collection: '',
    grant_number: '',
    funding_sources: [{ source: '', grant_number: '' }],
    comments: '',
    selected_nodes: [],
    selected_projects: [],
    running_apps: false,
    shell_access: false,
    file_access: false,
    hpc_interest: '',
  })

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null)

  const [reqType, setReqType] = useState<AllocationType>(null)
  const [formSpec, setFormSpec] = useState<{projects: Project[]}>()

  const [nodes, setNodes] = useState<object[]>([])


  const [user, setUser] = useState<UserInfo>()

  useEffect(() => {
    listUserProjects()
      .then(data => {
        console.log(data)
        setFormSpec({ projects: data })
      })
      .catch(err => {
        // todo
        console.error(err)
      })

    getUserInfo()
      .then(data => {
        setUser(data)
        setFormData(prev => ({
          ...prev,
          requester_name: data.name || '',
          requester_email: data.email || '',
          requester_institution: data.organization || '',
          use_profile_info: false,
          pi_name: '',
          pi_email: '',
          pi_institution: '',
        }))
      })
      .catch(err => {
        console.log('err', err)
      })

    getNodes().then(nodes => {
      console.log('nodes', nodes)
      setNodes(nodes)
    }).catch(err => {
      console.error('Error fetching nodes:', err)
    })
  }, [])


  const handleUseProfileInfo = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const checked = evt.target.checked
    setFormData(prev => ({
      ...prev,
      use_profile_info: checked,
      pi_name: checked ? (user?.name || '') : '',
      pi_email: checked ? (user?.email || '') : '',
      pi_institution: checked ? (user?.organization || '') : '',
    }))
  }

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }>,
    index?: number
  ) => {
    if (index !== undefined) {
      const new_funding_sources = [...formData.funding_sources]
      new_funding_sources[index][event.target.name as keyof FundingSource] = event.target.value as string
      setFormData({ ...formData, funding_sources: new_funding_sources })
    } else {
      setFormData({ ...formData, [event.target.name as keyof FormData]: event.target.value as string })
    }
  }

  const handle_checkbox_change = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [event.target.name as keyof FormData]: event.target.checked })
  }

  const add_funding_source = () => {
    setFormData({
      ...formData,
      funding_sources: [...formData.funding_sources, { source: '', grant_number: '' }]
    })
  }

  const remove_funding_source = (index: number) => {
    const new_funding_sources = formData.funding_sources.filter((_, i) => i !== index)
    setFormData({ ...formData, funding_sources: new_funding_sources })
  }

  const add_proposal = () => {
    setFormData(prev => ({
      ...prev,
      proposals: [...prev.proposals, { title: '', agency: '', number: '' }]
    }))
  }

  const remove_proposal = (index: number) => {
    setFormData(prev => ({
      ...prev,
      proposals: prev.proposals.filter((_, i) => i !== index)
    }))
  }

  const handleProposalChange = (index: number, name: keyof Proposal, value: string) => {
    const next = [...formData.proposals]
    next[index] = { ...next[index], [name]: value }
    setFormData(prev => ({ ...prev, proposals: next }))
  }


  const { isStaff } = useIsStaff()

  const [submittedData, setSubmittedData] = useState<(FormData & {reqType: AllocationType}) | null>(null)
  const [showValidation, setShowValidation] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = () => {
    console.log('formState', formData)
    setShowValidation(true)
    const data = { ...formData, reqType }
    setSubmitStatus('pending')
    setSubmitError(null)

    sendFeedback({
      subject: formData.project_title,
      email: formData.requester_email,
      message: formatSubmission(data),
      request_type: 'access request',
    })
      .then(() => {
        setSubmittedData(data)
        setSubmitStatus('success')
      })
      .catch(err => {
        console.log('err', err)
        setSubmitStatus('error')
        setSubmitError(err?.message)
      })

  }



  const handle_drag_start = (index: number) => {
    setDraggedIndex(index)
  }

  const handle_drag_over = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault()
    setDraggedOverIndex(index)
  }

  const handle_drop = (index: number) => {
    if (draggedIndex !== null) {
      const new_funding_sources = [...formData.funding_sources]
      const [dragged_item] = new_funding_sources.splice(draggedIndex, 1)
      new_funding_sources.splice(index, 0, dragged_item)

      setFormData({ ...formData, funding_sources: new_funding_sources })
    }
    setDraggedIndex(null)
    setDraggedOverIndex(null)
  }

  // Utility function to pluralize label based on count
  function pluralize(count: number, singular: string, plural: string) {
    return `${count} ${count === 1 ? singular : plural}`
  }

  return (
    <Root>
      <Container
        component="form"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 className="no-margin">Sage Access Request</h1>
          {isStaff &&
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="outlined" size="small"
                onClick={() => {
                  const sampleVsns = new Set(sampleFormData.selected_nodes.map(n => n.vsn))
                  const matchedNodes = nodes.filter(n => sampleVsns.has((n as any).vsn))
                  setFormData({ ...sampleFormData, selected_nodes: matchedNodes })
                  setReqType(sampleReqType)
                }}
              >
                Fill sample application
              </Button>
              <Button variant="outlined" size="small"
                onClick={() => {
                  const sampleVsns = new Set(sampleDownloadFormData.selected_nodes.map(n => n.vsn))
                  const matchedNodes = nodes.filter(n => sampleVsns.has((n as any).vsn))
                  setFormData({ ...sampleDownloadFormData, selected_nodes: matchedNodes })
                  setReqType(sampleDownloadReqType)
                }}
              >
                Fill sample download request
              </Button>
            </div>
          }
        </div>

        <StepTitle icon="1" label="Which type of request would you like to make?" />
        <Step>
          <RadioGroup value={reqType} onChange={(evt, val) => {
            const newType = val as AllocationType
            setReqType(newType)
            if (newType === 'file_access') {
              setFormData(prev => ({ ...prev, file_access: true, running_apps: false, shell_access: false }))
            }
          }}>
            {/* <FormControlLabel value="testbed" control={<Radio />}
              label="Request access to developer testbed (most new users start here)" /> */}
            <FormControlLabel value="add" control={<Radio />}
              label="Request access to specific nodes or projects" />
            {/* <FormControlLabel value="new" control={<Radio />} label="Request the start of a new project" /> */}
            <FormControlLabel value="file_access" control={<Radio />}
              label="Request access to protected data sets" />
            {/* <FormControlLabel value="renew" control={<Radio />} label="Restore expired access/permissions" /> */}
          </RadioGroup>
        </Step>

        {formSpec && ['testbed', 'add', 'file_access', 'renew'].includes(reqType) &&
          <>
            <Divider sx={{borderColor: 'rgba(0, 0, 0, 0.08)'}}/><br/>
            <StepTitle
              icon="2"
              label={getProjectSelectionLabel(reqType)}
            />

            {['testbed'].includes(reqType) &&
              <Step>
                <div className="flex gap">
                  <div className="flex column" style={{width: '100%'}}>
                    {nodes &&
                      <Step>
                        <Table primaryKey="id"
                          checkboxes
                          columns={columns}
                          rows={
                            reqType == 'testbed' ?
                              formSpec.projects.filter(project => project.name.toLowerCase().includes('testbed'))
                              : formSpec.projects
                          }
                        />
                      </Step>
                    }
                  </div>
                </div>
              </Step>
            }

            {['add', 'file_access'].includes(reqType) &&
              <Step>
                <div className="flex gap">
                  <div className="flex column" style={{width: '100%'}}>
                    <Autocomplete
                      multiple
                      loading={!nodes}
                      options={nodes}
                      getOptionLabel={option => {
                        const main = option.vsn || option.node || String(option)
                        return main
                      }}
                      renderOption={(props, option) => (
                        <li
                          {...props}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span>
                            {option.vsn + (option.site_id ? '| ' +
                              option.site_id : '') || option.node || String(option)}
                          </span>
                          {(option.city || option.state) && (
                            <span
                              style={{
                                color: '#aaa',
                                fontSize: '0.95em',
                                marginLeft: 12,
                                marginRight: 4,
                                flexShrink: 0
                              }}
                            >
                              {option.city.split(',')[0]}{option.city && option.state ? ', ' : ''}{option.state}
                            </span>
                          )}
                        </li>
                      )}
                      value={formData.selected_nodes}
                      onChange={(_, newValue) => {
                        setFormData(prev => ({
                          ...prev,
                          selected_nodes: newValue
                        }))
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Nodes (multiple allowed)"
                          margin="normal"
                          fullWidth
                        />
                      )}
                    />
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      margin: '16px 0',
                      fontWeight: 500,
                      color: '#888',
                      letterSpacing: 1,
                      textTransform: 'uppercase'
                    }}>
                      <span style={{
                        flex: 1,
                        borderBottom: '1px solid #ddd',
                        marginRight: 12
                      }} />
                      OR
                      <span style={{
                        flex: 1,
                        borderBottom: '1px solid #ddd',
                        marginLeft: 12
                      }} />
                    </div>
                    <Autocomplete
                      multiple
                      loading={!formSpec?.projects}
                      options={formSpec.projects || []}
                      getOptionLabel={option => {
                        if (!option.name) return String(option)
                        const users = pluralize(option.member_count || 0, 'user', 'users')
                        const nodes = pluralize(option.nodes.length || 0, 'node', 'nodes')
                        return `${option.name} (${users}, ${nodes})`
                      }}
                      value={formData.selected_projects}
                      onChange={(_, newValue) => {
                        const projectVsns = new Set(
                          newValue.flatMap(project => (project.nodes || []).map(n => n.vsn))
                        )
                        setFormData(prev => ({
                          ...prev,
                          selected_nodes: nodes.filter(n => projectVsns.has((n as any).vsn)),
                          selected_projects: newValue
                        }))
                      }}
                      renderOption={(props, option) => (
                        <li
                          {...props}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <span>{option.name}</span>
                          <span style={{
                            color: '#aaa', fontSize: '0.95em',
                            marginLeft: 12, marginRight: 4,
                            flexShrink: 0, whiteSpace: 'nowrap'
                          }}>
                            {pluralize(option.member_count || 0, 'user', 'users')},{' '}
                            {pluralize(option.nodes.length || 0, 'node', 'nodes')}
                          </span>
                        </li>
                      )}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Projects (multiple allowed)"
                          margin="normal"
                          fullWidth
                        />
                      )}
                    />

                    <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                      Select the permissions you are requesting for these nodes: <span style={{color: 'red'}}>*</span>
                    </Typography>
                    <div className="flex column gap">
                      {reqType !== 'file_access' && <FormControlLabel
                        control={<Checkbox name="running_apps" checked={formData.running_apps}
                          onChange={handle_checkbox_change} />}
                        label="Running apps (Includes SageChat/LLMS)"
                      />}
                      {reqType !== 'file_access' && <FormControlLabel
                        control={<Checkbox name="shell_access" checked={formData.shell_access}
                          onChange={handle_checkbox_change} />}
                        label="Shell (SSH Access)"
                      />}
                      <FormControlLabel
                        control={<Checkbox name="file_access" checked={formData.file_access}
                          onChange={handle_checkbox_change} />}
                        label="File Access (Downloading/viewing protected data sets)"
                      />
                    </div>
                    {showValidation && !formData.running_apps && !formData.shell_access && !formData.file_access &&
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                        At least one permission is required.
                      </Typography>
                    }
                  </div>
                  {nodes &&
                    <MapGL
                      data={formData.selected_nodes.length ? formData.selected_nodes : nodes}
                      markerClass={'blue-dot'}
                      updateID={JSON.stringify(formData.selected_nodes)}
                    />
                  }
                </div>
              </Step>
            }


          </>
        }

        {['testbed', 'add', 'file_access'].includes(reqType) &&
            <>
              <Divider />
              <StepTitle icon="3" label="Project Information" />
              <Step>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Your Information</Typography>
                <Box sx={{ maxWidth: '300px' }}>
                  <TextField label="Name" name="requester_name" margin="normal" fullWidth
                    value={formData.requester_name} onChange={handleChange}
                    slotProps={{ inputLabel: { shrink: true } }} required />
                  <TextField label="Email" name="requester_email" margin="normal" fullWidth
                    value={formData.requester_email} onChange={handleChange}
                    slotProps={{ inputLabel: { shrink: true } }} required />
                  <TextField label="Institution" name="requester_institution" fullWidth margin="normal"
                    value={formData.requester_institution} onChange={handleChange}
                    slotProps={{ inputLabel: { shrink: true } }} required />
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      name="use_profile_info"
                      checked={formData.use_profile_info}
                      onChange={handleUseProfileInfo}
                    />
                  }
                  label="I'm also the Principal Investigator (PI)"
                /><br/>
                <Box sx={{ maxWidth: '300px' }}>
                  <TextField label="PI Name" name="pi_name" margin="normal" fullWidth
                    value={formData.pi_name} onChange={handleChange}
                    slotProps={{ inputLabel: { shrink: true } }} required />
                  <TextField label="PI Email" name="pi_email" margin="normal" fullWidth
                    value={formData.pi_email} onChange={handleChange}
                    slotProps={{ inputLabel: { shrink: true } }} required />
                  <TextField label="PI Institution" name="pi_institution" fullWidth margin="normal"
                    value={formData.pi_institution} onChange={handleChange}
                    slotProps={{ inputLabel: { shrink: true } }} required />
                </Box>
                {reqType !== 'file_access' && <Box sx={{ maxWidth: '50%' }}>
                  <TextField label="Project Title" name="project_title" fullWidth margin="normal"
                    placeholder="A descriptive title for your project"
                    value={formData.project_title} onChange={handleChange}
                    slotProps={{ inputLabel: { shrink: true } }} required />
                </Box>}
                {!formData.selected_projects.length &&
                  <div>
                    <TextField label="Project Name" name="project_short_name" margin="normal"
                      value={formData.project_short_name} onChange={handleChange}
                      slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 16 }}}
                      sx={{ maxWidth: '375px' }}
                      required />
                    <HelpText title={<>
                      This short name is used to identify the project and
                      its members throughout the Portal and other tools. If necessary,
                      refer dashes over underscores (e.g. my-project).
                    </>} />
                  </div>
                }

                <Box sx={{ maxWidth: '50%' }}>
                  <TextField
                    label="Short Description"
                    name="project_description"
                    fullWidth
                    multiline
                    rows={2}
                    margin="normal"
                    value={formData.project_description}
                    onChange={handleChange}
                    placeholder="A brief description of your project and its goals"
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Box>

                <Box sx={{ maxWidth: '400px' }}>
                  <TextField label="Project Website" name="project_website" fullWidth margin="normal"
                    value={formData.project_website} onChange={handleChange}
                    slotProps={{ inputLabel: { shrink: true } }} />

                  <Autocomplete
                    multiple
                    options={scienceFields}
                    value={formData.science_fields}
                    onChange={(_, newValue) => {
                      setFormData(prev => ({
                        ...prev,
                        science_fields: newValue
                      }))
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Science field; select all that apply"
                        margin="normal"
                        fullWidth
                        required
                        error={showValidation && formData.science_fields.length === 0}
                        helperText={
                          showValidation && formData.science_fields.length === 0
                            ? 'At least one science field is required.'
                            : ''
                        }
                      />
                    )}
                  />
                </Box>

                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Is this request related to a proposal to be submitted? <span style={{color: 'red'}}>*</span>
                </Typography>
                <RadioGroup row
                  name="related_to_proposal"
                  value={formData.related_to_proposal}
                  onChange={(_, val) => setFormData(prev => ({ ...prev, related_to_proposal: val as 'yes' | 'no' }))}
                >
                  <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                  <FormControlLabel value="no" control={<Radio />} label="No" />
                </RadioGroup>
                {formData.related_to_proposal === 'yes' && (
                  <div style={{ marginTop: 8 }}>
                    {formData.proposals.map((proposal, index) => (
                      <div key={`proposal-${index}`}>
                        <DraggableContainer>
                          <TextField label="Funding Agency or Program" value={proposal.agency} fullWidth
                            onChange={(e) => handleProposalChange(index, 'agency', e.target.value)} />
                          <TextField label="Proposal Title" value={proposal.title} fullWidth
                            onChange={(e) => handleProposalChange(index, 'title', e.target.value)} />
                          <TextField label="Proposal Number or ID" value={proposal.number}
                            onChange={(e) => handleProposalChange(index, 'number', e.target.value)} fullWidth />
                          <Button variant="outlined" color="error" onClick={() => remove_proposal(index)}>
                            Remove
                          </Button>
                        </DraggableContainer>
                      </div>
                    ))}
                    <div className="flex justify-end">
                      <Button variant="contained" color="primary" startIcon={<Add />}
                        onClick={add_proposal} style={{ marginBottom: 20 }}>
                        Add Another Proposal
                      </Button>
                    </div>
                  </div>
                )}


                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Please list any applicable project funding sources:
                </Typography>
                <div>
                  {formData.funding_sources.map((funding, index) => (
                    <div key={`funding-${index}`}>
                      {draggedOverIndex === index && <DropIndicator isVisible />}
                      <DraggableContainer
                        draggable
                        onDragStart={() => handle_drag_start(index)}
                        onDragOver={(event) => handle_drag_over(event, index)}
                        onDrop={() => handle_drop(index)}
                      >
                        <DragIndicator sx={{ opacity: 0.5 }} />
                        <TextField label="Funding Agency or Program" name="source" value={funding.source} fullWidth
                          onChange={(e) => handleChange(e, index)} />
                        <TextField label="Grant Number or ID" name="grant_number" value={funding.grant_number} fullWidth
                          onChange={(e) => handleChange(e, index)} />
                        <Button variant="outlined" color="error" onClick={() => remove_funding_source(index)}>
                        Remove
                        </Button>
                      </DraggableContainer>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button variant="contained" color="primary" startIcon={<Add />}
                    onClick={add_funding_source} style={{ marginBottom: 20 }}>
                  Add Another Funding Source
                  </Button>
                </div>

                <Box sx={{ mt: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
                    <Typography variant="subtitle1">
                      Non-commercial use <span style={{color: 'red'}}>*</span>
                    </Typography>
                    <HelpText title={
                      <>
                        Sage resources are provided for research and educational purposes.
                        You are not developing a commercial product or gathering data intended to be sold.
                      </>
                    } />
                  </Box>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="is_non_commercial"
                        checked={formData.is_non_commercial}
                        onChange={handle_checkbox_change}
                      />
                    }
                    label={
                      'I confirm that this project is non-commercial \u2014 I am not developing' +
                      ' a commercial product or collecting data intended to be sold.'
                    }
                  />
                </Box>


                {reqType !== 'file_access' && <>
                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mt: 3, mb: 0.5 }}>
                    <Typography variant="subtitle1">
                      What will the code running at the edge do? <span style={{color: 'red'}}>*</span>
                    </Typography>
                    <HelpText title={
                      <>
                        Describe the purpose and function of the code you will run on Sage edge nodes
                        &mdash; e.g. &ldquo;We are working on algorithms to detect motion&rdquo; or
                        &ldquo;We are running time-series prediction models on sensor data&rdquo;.
                        This description becomes part of your user agreement and defines what your
                        project is permitted to do.
                      </>
                    } />
                  </Box>
                  <TextField
                    name="edge_code_description"
                    required
                    fullWidth
                    multiline
                    rows={4}
                    margin="normal"
                    value={formData.edge_code_description}
                    onChange={handleChange}
                    placeholder="Describe the purpose and function of the code you will run at the edge..."
                  />
                </>}


                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mt: 3, mb: 0.5 }}>
                  <Typography variant="subtitle1">
                    What data will be collected? <span style={{color: 'red'}}>*</span>
                  </Typography>
                  <HelpText title={
                    <>
                      All data leaving a node (via message log or object store) must be auditable.
                      Describe what data your project will collect, store, and how it will be used.
                      Note: collecting data that identifies individuals requires explicit approval.
                    </>
                  } />
                </Box>
                <TextField
                  name="data_collection"
                  required
                  fullWidth
                  multiline
                  rows={3}
                  margin="normal"
                  value={formData.data_collection}
                  onChange={handleChange}
                  label="Data Collection and Usage"
                  placeholder="Describe what data will be collected, stored, and how it will be used..."
                />

                {reqType !== 'file_access' && <>
                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mt: 3, mb: 0.5 }}>
                    <Typography variant="subtitle1">
                      How and what results will be published? <span style={{color: 'red'}}>*</span>
                    </Typography>
                    <HelpText title={
                      <>
                        Sage is funded by the NSF and science is open. While source code may remain
                        private, results must be publishable. Describe what outputs your project will
                        produce and how they will be made available (e.g. publications, public datasets,
                        open repositories).
                      </>
                    } />
                  </Box>
                  <TextField
                    name="publication_plan"
                    required
                    fullWidth
                    multiline
                    rows={3}
                    margin="normal"
                    value={formData.publication_plan}
                    onChange={handleChange}
                    label="Publication and Data Sharing Plan"
                    placeholder="Describe the expected outputs and how they will be published or shared..."
                  />
                </>}
                <br/><br/>

                <TextField
                  label="Do you have any additional comments or questions?"
                  name="comments"
                  fullWidth
                  multiline
                  rows={4}
                  margin="normal"
                  value={formData.comments}
                  onChange={handleChange}
                  placeholder="Any additional information you'd like to provide"
                />

                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Are you interested in using HPC (<a href="https://nairrpilot.org">NAIRR Pilot</a>) resources
                  in addition to Sage?
                </Typography>
                <RadioGroup
                  row
                  name="hpc_interest"
                  value={formData.hpc_interest}
                  onChange={(_, val) => setFormData(prev => ({ ...prev, hpc_interest: val as 'yes' | 'no' | 'maybe' }))}
                >
                  <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                  <FormControlLabel value="no" control={<Radio />} label="No" />
                  <FormControlLabel value="maybe" control={<Radio />} label="Maybe or not sure" />
                </RadioGroup>

              </Step>
            </>
        }

        {reqType &&
          <Step>
            {/* Tooltip must wrap a span if the button is disabled */}
            <Tooltip
              placement="right"
              title={
                (!formData.requester_name || !formData.requester_email ||
                  !formData.pi_name || !formData.pi_email ||
                  (reqType !== 'file_access' && !formData.project_title) || !formData.related_to_proposal)
                  ? 'Please fill in all required fields'
                  : (!formData.running_apps && !formData.shell_access && !formData.file_access)
                    ? 'At least one permission is required'
                    : !formData.science_fields.length
                      ? 'At least one science field is required'
                      : ((reqType !== 'file_access' &&
                          (!formData.edge_code_description || !formData.publication_plan)) ||
                          !formData.data_collection)
                        ? 'Please complete the \'About Your Proposed Work\' section'
                        : !formData.is_non_commercial
                          ? 'Please confirm the work is non-commercial'
                          : 'Submit your request'
              }
            >
              <>
                <Button
                  variant="contained"
                  color="primary"
                  style={{ marginTop: 20 }}
                  onClick={handleSubmit}
                  disabled={submitStatus === 'pending' || submitStatus === 'success' ||
                    !reqType || !formData.requester_name || !formData.requester_email ||
                    !formData.pi_name || !formData.pi_email ||
                    (reqType !== 'file_access' && !formData.project_title) || !formData.related_to_proposal ||
                    (!formData.running_apps && !formData.shell_access && !formData.file_access) ||
                    !formData.science_fields.length ||
                    (reqType !== 'file_access' && (!formData.edge_code_description || !formData.publication_plan)) ||
                    !formData.data_collection || !formData.is_non_commercial}
                >
                  {submitStatus === 'pending' ? 'Submitting…' : 'Submit!'}
                </Button>
              </>
            </Tooltip>
          </Step>
        }

        {submitStatus === 'error' && submitError &&
          <Alert severity="error" sx={{ mt: 3 }}>{submitError}</Alert>
        }

        {submitStatus === 'success' && submittedData &&
          <Alert severity="success" sx={{ mt: 3 }}>
            Your request has been submitted successfully!
            We will follow up with you at <b>{submittedData.requester_email}</b> within 1-2 business days.
            If you don&apos;t receive a response or have any questions in the meantime,
            please <b><a href={config.contactUs}>contact us</a></b>.
          </Alert>
        }
      </Container>
      <br/><br/><br/>
    </Root>
  )
}

const Root = styled('div')`

`
