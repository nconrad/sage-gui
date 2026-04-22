
export const defaultPrompt = 'Describe what you see in detail.'

function getDefaultSpec({
  prompt = defaultPrompt,
  vsn = 'H00F',
  every = '*/5 * * * *',
  model = 'gemma4:e2b',
  camera = 'rtsp://10.31.81.27:554/profile1/media.smp'
}) {
  return (
  `
name: edgerunner-demo
plugins:
- name: ollama-hello-world
  pluginSpec:
    image: registry.sagecontinuum.org/seanshahkarami/ollama-hello-world:0.5.2
    args:
    - --model
    - ${model}
    - --prompt
    - ${prompt}
    - ${camera}
nodeTags: []
nodes:
  ${vsn}: null
scienceRules:
- 'schedule(ollama-hello-world): cronjob("ollama-hello-world", "${every}")'
successCriteria:
- WallClock(1d)
`
  )
}


export default getDefaultSpec