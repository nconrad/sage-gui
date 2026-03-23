type SubmittedData = {
  reqType: string
  requester_name: string
  requester_email: string
  requester_institution: string
  pi_name: string
  pi_email: string
  pi_institution: string
  project_title: string
  project_short_name: string
  project_description: string
  project_website: string
  science_fields: string[]
  selected_nodes: object[]
  selected_projects: object[]
  running_apps: boolean
  shell_access: boolean
  file_access: boolean
  related_to_proposal: string
  proposals: { agency: string; title: string; number: string }[]
  funding_sources: { source: string; grant_number: string }[]
  is_non_commercial: boolean
  edge_code_description: string
  publication_plan: string
  data_collection: string
  comments: string
  hpc_interest: string
}

export function formatSubmission(data: SubmittedData): string {
  const lines = [
    `# Submission Summary`,
    ``,
    `## Your Information`,
    `- **Name:** ${data.requester_name || '—'}`,
    `- **Email:** ${data.requester_email || '—'}`,
    `- **Institution:** ${data.requester_institution || '—'}`,
    ``,
    `## Principal Investigator`,
    `- **Name:** ${data.pi_name || '—'}`,
    `- **Email:** ${data.pi_email || '—'}`,
    `- **Institution:** ${data.pi_institution || '—'}`,
    ``,
    `## Project`,
    `- **Title:** ${data.project_title || '—'}`,
    `- **Short Name:** ${data.project_short_name || 'N/A'}`,
    `- **Description:** ${data.project_description || '—'}`,
    `- **Website:** ${data.project_website || '—'}`,
    `- **Science Field(s):** ${data.science_fields?.join(', ') || 'N/A'}`,
    ``,
    `## Selected Nodes (${data.selected_nodes.length})`,
    ...data.selected_nodes.map(n => `- ${n.vsn || n.node || JSON.stringify(n)}`),
    ``,
    `## Selected Projects (${data.selected_projects.length})`,
    ...data.selected_projects.map(p => `- ${p.name || JSON.stringify(p)}`),
    ``,
    `## Permissions Requested`,
    `- **Running Apps:** ${data.running_apps ? 'Yes' : 'No'}`,
    `- **Shell Access:** ${data.shell_access ? 'Yes' : 'No'}`,
    `- **File Access:** ${data.file_access ? 'Yes' : 'No'}`,
    ``,
    `## Related to Proposal`,
    `**${data.related_to_proposal || '—'}**`,
    ...(data.related_to_proposal === 'yes' ? [
      ``,
      `### Proposals`,
      ...data.proposals.map((p, i) =>
        `${i + 1}. Agency: ${p.agency || '—'} | Title: ${p.title || '—'} | ID: ${p.number || '—'}`
      ),
    ] : []),
    ``,
    `## Funding Sources`,
    ...data.funding_sources.map((f, i) =>
      `${i + 1}. Source: ${f.source || '—'} | Grant #: ${f.grant_number || '—'}`
    ),
    ``,
    `## Non-Commercial Confirmation`,
    `**${data.is_non_commercial ? 'Confirmed' : 'Not confirmed'}**`,
    ``,
    `## Edge Code Description`,
    data.edge_code_description || '\u2014',
    ``,
    `## Data to be Collected`,
    data.data_collection || '\u2014',
    ``,
    `## Publication Plan`,
    data.publication_plan || '\u2014',
    ``,
    `## Additional Comments`,
    data.comments || '—',
    ``,
    `## HPC/NAIRR Interest`,
    `**${data.hpc_interest || '—'}**`,
  ]

  const message = lines.join('\n')

  if (process.env.NODE_ENV === 'development') {
    console.log(message)
  }

  return message
}
