import { useState, useEffect, cloneElement, type MouseEvent, type ReactElement } from 'react'
import Badge from '@mui/material/Badge'

const DAYS_WITHIN_NEW = 14
const TWO_WEEKS_MS = DAYS_WITHIN_NEW * 24 * 60 * 60 * 1000
const STORAGE_KEY = 'is-new-ignored-items-v1'

function getSeenItems(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setSeenItem(key: string) {
  if (typeof window === 'undefined') return

  const seenItems = getSeenItems()
  seenItems[key] = true
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seenItems))
}


type Props = {
  date: string | Date
  within?: number   // milliseconds; defaults to 2 weeks
  children?: ReactElement
  storageKey?: string
}

export default function IsNew({ date, within = TWO_WEEKS_MS, children, storageKey }: Props) {
  const [seen, setSeen] = useState(false)
  const derivedKey = storageKey
    || children?.props?.href
    || (typeof children?.props?.to === 'string' ? children.props.to : null)
  const persistedKey = derivedKey || null

  useEffect(() => {
    if (!persistedKey || typeof window === 'undefined') return
    setSeen(!!getSeenItems()[persistedKey])
  }, [persistedKey])

  const age = Date.now() - new Date(date).getTime()
  const showBadge = age <= within && !seen

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    children?.props?.onClick?.(event)

    if (event.defaultPrevented || !persistedKey || typeof window === 'undefined') return

    setSeenItem(persistedKey)
    setSeen(true)
  }

  if (!children) {
    return showBadge ? (
      <Badge badgeContent="new" color="success">
        <span />
      </Badge>
    ) : null
  }

  return (
    <Badge badgeContent="new" color="success" invisible={!showBadge}>
      {cloneElement(children, { onClick: handleClick })}
    </Badge>
  )
}
