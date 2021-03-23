import config from '../../config'
const url = config.ecr

import testToken from '../../testToken'

const options = {
  headers: {
    Authorization: `sage ${testToken}`
  }
}


function handleErrors(res) {
  if (res.ok) {
    return res
  }

  return res.json().then(errorObj => {
    throw Error(errorObj.error)
  })
}



function get(endpoint: string) {
  return fetch(endpoint, options)
    .then(handleErrors)
    .then(res => res.json())
}



function post(endpoint: string, data = '') {
  return fetch(endpoint, {
    method: 'POST',
    body: data,
    ...options
  }).then(handleErrors)
    .then(res => res.json())
}



export function register(appConfig) {
  return post(`${url}/submit`, appConfig)
}



export function build(app) {
  return post(`${url}/builds/${app}`)
}



export async function registerAndBuild(appConfig, version = '1.0') {
  await register(appConfig)
  const res = await build(`sage/simple/${version}`)
  return res
}



type Permission = {
  grantee: string
  granteeType: 'USER' | 'GROUP'
  permission: 'READ' | 'WRITE' | 'READ_ACP' | 'WRITE_ACP' | 'FULL_CONTROL'
  resourceName: string
  resourceType: 'string'
}

export function listPermissions(app: string) : Promise<Permission[][]> {
  return get(`${url}/permissions/${app}`)
}


type Namespace = {
  id: string
  owner_id: string
  type: string
}


export function listNamespaces() : Promise<Namespace[]>{
  return get(`${url}/apps`)
}


type App = {
  name: string
  namespace: string
  owner_id: string
}

// special, client-side version of a "repo"
type Repo = App & {
  versions?: [{
    id: string,
    name: string,
    namespace: string,
    version: string
  }]
}


type ListAppsParams = {
  includeStatus?: boolean
}

export async function listApps(params: ListAppsParams = {})  {
  const {
    includeStatus = true
  } = params

  // first get namespaces
  const nsObjs = await listNamespaces()
  const namespaces = nsObjs.map(o => o.id)
  const objs = await Promise.all(
    namespaces.map(namespace => get(`${url}/apps/${namespace}`))
  )

  // join all repos
  let repos: Repo[] = objs.reduce((acc, obj) => [...acc, ...obj.repositories], [])

  // include versions
  repos = await Promise.all(
    repos.map(o => getApp(o.namespace, o.name))
  )

  // get permissions
  const perms = await Promise.all(
    repos.map(o => listPermissions(`${o.namespace}/${o.name}`))
  )

  // get app info
  const details: any[] = await Promise.all(
    repos.map(o => o.versions.length ?
      getApp(o.namespace, o.name, o.versions[o.versions.length-1].version) : {}
    )
  )

  // merge in all the of the above
  repos = repos.map((obj, i) => ({
    ...obj,
    permissions: perms[i],
    details: details[i],
    version: obj.versions.length ? obj.versions[obj.versions.length-1].version : null,
    id: details[i].id || `id-${i}`
  }))


  // todo: add api method?
  if (includeStatus) {
    // implement
  }

  return repos
}


export function getApp(namespace: string, name: string, version?: string) : Promise<App> {
  if (version)
    return get(`${url}/apps/${namespace}/${name}/${version}`)
  else
    return get(`${url}/apps/${namespace}/${name}`)
}