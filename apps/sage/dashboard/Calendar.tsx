import { useEffect, useState } from 'react'
import { styled } from '@mui/material'


const calID = '65dcf6922cf9f84679f598865716f1fea2b7d974896c300fda9d3e26810aa1e8@group.calendar.google.com'
const url = `https://www.googleapis.com/calendar/v3/calendars/` +
  `${calID}/events?key=AIzaSyAchO5mV1RTkQvvQSqndYg3eM6MQSkIr9o&singleEvents=true&calendarID=primary`

const maxResults = 3
const orderBy = 'startTime'


const dateConfig: Intl.DateTimeFormatOptions = {
  month: 'short',
  weekday: 'long',
  year: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}


const formatCalDate = (start, end) => {
  const config = {...dateConfig}

  const {dateTime} = start
  let {date} = start

  // if only date, add a day and remove time from config
  if (!dateTime && date) {
    date = new Date(date)
    date.setDate(date.getDate() + 1)
    delete config.hour
    delete config.minute
  }

  const startStr = `${new Date(dateTime || date).toLocaleString('en-US', config)}`

  // display the end date if multi-day event
  const startDay = new Date(date).getDate()
  const endDay = new Date(end.date).getDate()
  const endStr =
    endDay > startDay
      ? `${new Date(end.dateTime || end.date).toLocaleString('en-US', config)}`
      : null

  return `${startStr} ${endStr ? ` - ${endStr}` : ''}`
}


export default function Calendar() {
  const [events, setEvents] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchEvents()
      .then(events => {
        // sort and limit events
        events.sort(
          (a, b) => Date.parse(a.start.dateTime || a.start.date) - Date.parse(b.start.dateTime || b.start.date)
        ).slice(0, maxResults)

        setEvents(events)
      })
      .catch(err => setError(err))
  }, [])

  const fetchEvents = () => {
    const timeMin = new Date().toISOString()
    return fetch(`${url}&timeMin=${timeMin}&maxResults=${maxResults}&orderBy=${orderBy}`)
      .then(res => res.json())
      .then(data => data.items)
  }

  return (
    <>
      {events?.length == 0 &&
        <MutedText>
          Please check back later for upcoming Sage/Waggle workshops, hackathons, presentations, and more!
        </MutedText>
      }
      {events && (
        <EventList>
          {events.map((event, i) => {
            const {description = '', summary, start, end} = event

            return (
              <EventItem key={i}>
                <EventTitle>
                  {summary}
                </EventTitle>

                <EventDate>{formatCalDate(start, end)}</EventDate>

                {description &&
                  <ReadMore href={description} target="_blank" rel="noreferrer">Read more…</ReadMore>
                }
              </EventItem>
            )
          })}
        </EventList>
      )}

      {error && <MutedText>There was an issue loading the event calendar.</MutedText>}
    </>
  )
}


const MutedText = styled('p')`
  margin: 0;
  color: ${({ theme }) => theme.palette.text.secondary};
`

const EventList = styled('ul')`
  list-style: none;
  padding: 0;
  margin: 0;
`

const EventItem = styled('li')`
  padding: 0.75rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.palette.divider};

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`

const EventTitle = styled('h3')`
  margin: 0 0 0.35rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.palette.text.primary};
`

const EventDate = styled('span')`
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ theme }) => theme.palette.text.secondary};
`

const ReadMore = styled('a')`
  display: inline-block;
  margin-top: 0.35rem;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.palette.primary.main};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`
