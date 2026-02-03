import { styled } from '@mui/material'

/**
 * Reusable styled components for displaying capability/access icons
 */

export const CapabilityIconContainer = styled('div')<{ available: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: ${({ available }) => available ? 1 : 0.3};
  filter: ${({ available }) => available ? 'none' : 'grayscale(100%)'};
  cursor: ${({ available }) => available ? 'pointer' : 'default'};
  color: ${({ theme, available }) =>
    available
      ? (theme.palette.mode === 'dark' ? '#fff' : '#000')
      : (theme.palette.mode === 'dark' ? '#555' : '#aaa')
  };
  transition: all 0.2s ease;

  svg {
    font-size: 1.5em;
  }

  &:hover {
    color: ${({ theme, available }) => available ? theme.palette.primary.main : undefined};
  }
`

export const DisabledOverlay = styled('div')`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 120%;
  height: 2px;
  background-color: ${({ theme }) => theme.palette.mode === 'dark' ? '#555' : '#aaa'};
  transform: translate(-50%, -50%) rotate(-45deg);
  pointer-events: none;
`
