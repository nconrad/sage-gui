import styled from 'styled-components'
import { Card, CardViewStyle } from '/components/layout/Layout'


export default function TestDownload() {

  return (
    <Root className="flex gap ">
      {CardViewStyle}

      <Card >
        <h2>Example of Object Storage Download (OLD image)</h2>
        <img
          src={
            'https://storage.sagecontinuum.org/api/v1/data/imagesampler-top-2687/' +
            'sage-imagesampler-top-0.3.7/000048b02d3ae335/1739206807613290074-sample.jpg'
          } />
      </Card>


      <Card>
        <h2>Example of Object Storage Download (NEWER image)</h2>
        From: 2026-04-02T22:00:14.136656861Z<br/><br/>
        <img
          src={
            'https://storage.sagecontinuum.org/api/v1/data/' +
            'imagesampler-mobotix-2689/sage-imagesampler-mobotix-0.3.7/000048b02d3ae335/1775167214136656861-sample.jpg'
          } />
      </Card>
    </Root>
  )
}


const Root = styled.div`
  margin: 2rem;

  img {
    max-width: 400px;
  }
`