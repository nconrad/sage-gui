import { useEffect, useState } from 'react'
import { styled } from '@mui/material'
import IsNew from './IsNew'

import config from '/config'

const NEWS_URL = `${config.home}/news`


type NewsItem = {
  datePublished: string
  headline: string
  articleBody: string
  url: string
}


const maxItems = 3


export default function News() {
  const [data, setData] = useState<NewsItem[]>(null)
  const [error, setError] = useState<string>(null)

  useEffect(() => {
    fetch(NEWS_URL)
      .then(res => res.text())
      .then(content => {
        const parser = new DOMParser()
        const parsedHtml = parser.parseFromString(content, 'text/html')
        const items = parsedHtml.getElementsByTagName('article')

        let parsedData: NewsItem[] = []

        try {
          parsedData = Array.from(items).map(ele => {
            const linkEl = ele.querySelector('header a') as HTMLAnchorElement | null
            const dateEl = ele.querySelector('header time') as HTMLElement | null
            const headlineEl = ele.querySelector('header h2') as HTMLElement | null
            const bodyEl = ele.querySelector('div.markdown') as HTMLElement | null
            const href = linkEl?.getAttribute('href') || '/news'
            const url = new URL(href, config.home).pathname

            return {
              datePublished: dateEl?.textContent || '',
              headline: headlineEl?.textContent || 'Untitled',
              articleBody: bodyEl?.innerHTML || '',
              url
            }
          }).filter(item => item.headline)
        } catch (e) {
          console.log('Could not parse news data:', e)
          setError('There was an issue loading news updates.')
        }

        setData(parsedData.slice(0, maxItems))
      })
      .catch(() => setError('There was an issue loading news updates.'))
  }, [])

  if (error) {
    return <MutedText>{error}</MutedText>
  }

  if (!data) {
    return <MutedText>Loading news…</MutedText>
  }

  if (data.length === 0) {
    return <MutedText>Please check back later for the latest Sage news.</MutedText>
  }

  return (
    <List>
      {data.map((item, index) => (
        <Item key={`${item.headline}-${index}`}>
          <IsNew date={item.datePublished}>
            <a href={`${config.home}${item.url}`} target="_blank" rel="noreferrer">
              {item.headline}
            </a>
          </IsNew>
          {!!item.datePublished && <Meta>{item.datePublished}</Meta>}

          {/* !!item.articleBody && <Excerpt>{getExcerpt(item.articleBody)}</Excerpt> */}
        </Item>
      ))}
    </List>
  )
}


const List = styled('ul')`
  list-style: none;
  padding: 0;
  margin: 0;
`

const Item = styled('li')`
  padding: 0.75rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.palette.divider};

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`

const Meta = styled('div')`
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.palette.text.secondary};
`

const MutedText = styled('p')`
  margin: 0;
  color: ${({ theme }) => theme.palette.text.secondary};
`
