import config from '../../config'
import { NodeStatus } from '../node'

const url = config.beekeeper

const IGNORE_LIST = [
  '0000000000000001', '000048B02D059C6A', '000048B02D07627C',
  '000048B02D0766CD', '000048B02D0766D2', '000048B02D15BC65',
  '000048B02D15C1AA', '000048B02D15D52F', 'SURYALAPTOP00000'
]


export type State = {
  address: string
  altitude: number
  beehive: string
  id: string
  internet_connection: string
  mode: string
  name: string
  position: string // will be point()?
  project_id: null
  registration_event: string // todo: fix format
  server_node: string
  timestamp: string // todo: fix format ("Sun, 14 Mar 2021 16:58:57 GMT")

  // additional status field.  may be replaced with 'mode' or such
  status: NodeStatus
}


function handleErrors(res) {
  if (res.ok) {
    return res
  }

  // todo(nc): verify
  return res.json().then(errorObj => {
    throw Error(errorObj.error)
  })
}


function get(endpoint: string) {
  return fetch(endpoint)
    .then(handleErrors)
    .then(res => res.json())
}


function post(endpoint: string, body = '') {
  return fetch(endpoint, {
    method: 'POST',
    body
  }).then(handleErrors)
}


export async function fetchState() : Promise<State[]> {
  const data = await get(`${url}/state`)

  return data.data
    .filter(obj => !IGNORE_LIST.includes(obj.id))
    .map(obj => ({
      ...obj,
      status: 'loading',
      registration_event: new Date(obj.registration_event).getTime()
    }))
}

export async function fetchNode(id: string) : Promise<State[]> {
  const data = await get(`${url}/state/${id}`)
  return data.data
}