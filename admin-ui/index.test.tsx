import React from 'react';
import { render, screen } from '@testing-library/react';

import App from './index';


jest.mock('mapbox-gl/dist/mapbox-gl', () => ({
  Map: () => ({})
}));



describe('App', () => {
  test('renders App component', () => {
    render(<App />);

    screen.debug();
  });
});