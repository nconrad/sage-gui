import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'


type TabLabelProps<T> = {
  icon: JSX.Element,
  label: T,
  count?: Number
}

function TabLabel<T>(props: TabLabelProps<T>) {
  const {icon, label, count} = props
  return (
    <div className="flex items-center">
      {icon}&nbsp;{label} {count !== null &&  `(${count ||  '…'})`}
    </div>
  )
}


export {
  Tabs,
  Tab,
  TabLabel
}
