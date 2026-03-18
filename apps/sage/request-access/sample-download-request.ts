import type { AllocationType } from './RequestAccess'

export const sampleDownloadFormData = {
  requester_name: 'Mario Mario',
  requester_email: 'mario@mushroom-kingdom.edu',
  requester_institution: 'Mushroom Kingdom Institute of Technology',
  pi_name: 'Prof. Toad',
  use_profile_info: false,
  pi_email: 'toad@mushroom-kingdom.edu',
  pi_institution: 'Mushroom Kingdom Institute of Technology – Dept. of Acoustic Sciences',
  project_title: 'Characterizing Ambient Noise Pollution in Protected Mushroom Kingdom Datasets',
  project_website: 'https://noise.mushroom-kingdom.edu/warp-pipe-acoustics',
  project_short_name: 'mkit-noise',
  project_description: 'Analysis of protected ambient noise datasets collected by Sage nodes' +
    ' to characterize sound pollution from Bowser\'s Castle and warp pipe activity across the kingdom.',
  science_fields: ['Acoustics', 'Environmental Science', 'Urban Science', 'Data Science'],
  related_to_proposal: 'yes' as const,
  proposals: [
    {
      title: 'Edge-Distributed Acoustic Monitoring of Koopa Troopa Traffic and Industrial Noise',
      agency: 'NSF – Division of Environmental and Noise Sciences',
      number: 'ENS-8675309',
    },
  ],
  edge_code_description: '',
  publication_plan: '',
  is_non_commercial: true,
  data_collection:
    'We will download and analyze protected ambient noise datasets (decibel levels, frequency' +
    ' spectra, and event timestamps) collected by Sage nodes across Mushroom Kingdom.' +
    ' No new data will be generated at the edge — we are requesting read access to' +
    ' existing protected acoustic datasets in the Sage object store.',
  grant_number: 'ENS-8675309',
  funding_sources: [
    { source: 'NSF – Division of Environmental and Noise Sciences', grant_number: 'ENS-8675309' },
    { source: 'Mushroom Kingdom Research Computing Consortium', grant_number: 'MKRCC-1UP-2025' },
  ],
  comments: 'We are particularly interested in noise datasets near Bowser\'s Castle and' +
    ' high-traffic warp pipe corridors for environmental impact assessment.',
  selected_nodes: [
    { vsn: 'W023' },
    { vsn: 'W031' },
  ],
  selected_projects: [],
  running_apps: false,
  shell_access: false,
  file_access: true,
  hpc_interest: 'maybe' as const,
}

export const sampleDownloadReqType: AllocationType = 'file_access'
