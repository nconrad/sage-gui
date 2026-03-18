import type { AllocationType } from './RequestAccess'

export const sampleFormData = {
  requester_name: 'Peach Toadstool',
  requester_email: 'ptoadstool@tamu.edu',
  requester_institution: 'Texas A&M University',
  pi_name: 'Dr. Luigi Verde',
  use_profile_info: false,
  pi_email: 'lverde@tamu.edu',
  pi_institution: 'Texas A&M – Dept. of Soil & Crop Sciences',
  project_title: 'Field-Scale Crop Stress Detection via Edge Inference',
  project_website: 'https://ai-plant-science.tamu.edu/edge-stress',
  project_short_name: 'tamu-crop-stress',
  project_description: 'Real-time detection of heat and drought stress in corn and ' +
    'soybean fields using containerized computer vision models deployed on Sage edge nodes.',
  science_fields: ['Agricultural Science', 'Biology', 'Data Science', 'Soil Science'],
  related_to_proposal: 'yes' as const,
  proposals: [
    {
      title: 'Real-Time Plant Phenotyping with Sage Edge Nodes',
      agency: 'USDA – National Institute of Food and Agriculture',
      number: 'NIFA-2025-67015',
    },
    {
      title: 'Sensor Fusion for Early Detection of Soybean Sudden Death Syndrome',
      agency: 'NSF – Division of Integrative Organismal Systems',
      number: 'IOS-2512340',
    },
  ],
  edge_code_description:
    'We will deploy containerized computer vision models that analyze multispectral imagery ' +
    'captured by node cameras to detect early signs of heat and drought stress in corn and ' +
    'soybean canopies. The models process frames locally and emit only aggregated stress scores ' +
    'and bounding-box metadata — no raw video leaves the node. A secondary plugin ingests ' +
    'soil moisture sensor readings and runs a lightweight LSTM to flag anomalous dryness events.',
  publication_plan:
    'Results will be published in open-access peer-reviewed journals (e.g. Plant Phenomics, ' +
    'Frontiers in Plant Science). Aggregated stress-detection datasets and pre-trained model ' +
    'weights will be released on Zenodo and the Sage Data Repository under a CC-BY 4.0 license ' +
    'within 12 months of collection. Annual progress reports will be submitted to USDA-NIFA ' +
    'and posted publicly on the project website.',
  is_non_commercial: true,
  data_collection:
    'Each node will emit: (1) per-frame stress-score vectors (float32 arrays, ~4 KB/frame) ' +
    'written to the Sage mesSage log; (2) JPEG thumbnails of flagged high-stress events (~50 KB ' +
    'each) uploaded to the Sage object store under the project namespace; and (3) soil-moisture ' +
    'time-series aggregates (daily min/max/mean) written to the mesSage log. No audio, GPS ' +
    'tracks, or imagery that could identify individuals will be collected. All outputs are ' +
    'scoped to plant canopy and soil sensor data only.',
  grant_number: 'NIFA-2025-67015',
  funding_sources: [
    { source: 'USDA – National Institute of Food and Agriculture', grant_number: 'NIFA-2025-67015' },
    { source: 'NSF – Division of Integrative Organismal Systems', grant_number: 'IOS-2512340' },
    { source: 'Texas A&M AgriLife Research', grant_number: 'TAMU-802-981' },
  ],
  comments: 'We plan to instrument two additional field plots at the South Farm Research Center ' +
    'in Summer 2026 and would appreciate guidance on collocating new nodes with existing equipment.',
  selected_nodes: [
    { vsn: 'V050' },
    { vsn: 'X001' }
  ],
  selected_projects: [],
  running_apps: true,
  shell_access: true,
  file_access: true,
  hpc_interest: 'yes' as const,
}

export const sampleReqType: AllocationType = 'add'
