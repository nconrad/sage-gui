
import React, { useEffect, useState } from 'react'
import { fade, makeStyles } from '@material-ui/core/styles'
import Popper from '@material-ui/core/Popper'
import SettingsIcon from '@material-ui/icons/SettingsOutlined'
import CloseIcon from '@material-ui/icons/Close'
import DoneIcon from '@material-ui/icons/Done'

import Autocomplete from '@material-ui/lab/Autocomplete'
import IconButton from '@material-ui/core/IconButton'
import InputBase from '@material-ui/core/InputBase'
import Tooltip from '@material-ui/core/Tooltip'


/* example options
const options = [
  { id: 'foo', label: 'Foo' },
  { id: 'bar', label: 'Bar' },
]
*/

const useStyles = makeStyles((theme) => ({
  popper: {
    border: '1px solid rgba(27,31,35,.15)',
    boxShadow: '0 3px 12px rgba(27,31,35,.15)',
    borderRadius: 3,
    width: 300,
    zIndex: 100,
    fontSize: 13,
    color: '#586069',
    backgroundColor: '#f6f8fa'
  },
  header: {
    borderBottom: '1px solid #e1e4e8',
    padding: '8px 10px',
    fontWeight: 600,
  },
  inputBase: {
    padding: 10,
    width: '100%',
    borderBottom: '1px solid #dfe2e5',
    '& input': {
      borderRadius: 4,
      backgroundColor: theme.palette.common.white,
      padding: 8,
      transition: theme.transitions.create(['border-color', 'box-shadow']),
      border: '1px solid #ced4da',
      fontSize: 14,
      '&:focus': {
        boxShadow: `${fade(theme.palette.primary.main, 0.25)} 0 0 0 0.2rem`,
        borderColor: theme.palette.primary.main,
      },
    },
  },
  paper: {
    boxShadow: 'none',
    margin: 0,
    color: '#586069',
    fontSize: 13
  },
  option: {
    minHeight: 'auto',
    alignItems: 'flex-start',
    padding: 8,
    '&[aria-selected="true"]': {
      backgroundColor: 'transparent',
    },
    '&[data-focus="true"]': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  popperDisablePortal: {
    position: 'relative',
  },
  iconSelected: {
    width: 17,
    height: 17,
    marginRight: 5,
    marginLeft: -2,
  },
  color: {
    width: 14,
    height: 14,
    flexShrink: 0,
    borderRadius: 3,
    marginRight: 8,
    marginTop: 2,
  },
  text: {
    flexGrow: 1,
  },
  close: {
    opacity: 0.6,
    width: 18,
    height: 18,
  },
}))

// todo(nc): figure out what is happening with typing here.
type Option = {
  id?: string
  label?: string
  hide?: boolean
  type?: string
}

type Props = {
  options: Option[]
  ButtonComponent?: JSX.Element
  header?: boolean
  headerText?: string
  noOptionsText?: string
  onChange: (opt: (string | Option)[]) => void
}

export default function ColumnMenu(props: Props) {
  const {
    options,
    onChange,
    ButtonComponent,
    header = true,
    headerText,
    ...rest
  } = props

  const classes = useStyles()
  const [anchorEl, setAnchorEl] = useState(null)

  const [value, setValue] = useState(options.filter(obj => !obj.hide))

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = (event, reason) => {
    if (reason === 'toggleInput') {
      return
    }

    // setValue(pendingValue)
    if (anchorEl) {
      anchorEl.focus()
    }
    setAnchorEl(null)
  }

  const open = Boolean(anchorEl)
  const id = open ? 'column-search' : undefined

  return (
    <div>
      {ButtonComponent ?
        React.cloneElement(ButtonComponent, {onClick: handleClick}) :
        <Tooltip title="Show/hide columns" placement="top">
          <IconButton
            size="small"
            onClick={handleClick}
            disableRipple
          >
            <SettingsIcon  />
          </IconButton>
        </Tooltip>
      }

      <Popper
        id={id}
        open={open}
        anchorEl={anchorEl}
        placement="bottom-start"
        className={classes.popper}
      >
        {header &&
          <div className={classes.header}>
            {headerText ? headerText : 'Select columns for this view'}
          </div>
        }
        <Autocomplete
          open
          onClose={handleClose}
          multiple
          classes={{
            paper: classes.paper,
            option: classes.option,
            popperDisablePortal: classes.popperDisablePortal,
          }}
          value={value}
          onChange={(event, newValue) => {
            // @ts-ignore
            setValue(newValue)
            onChange(newValue)
          }}
          disableCloseOnSelect
          disablePortal
          renderTags={() => null}
          noOptionsText="No labels"
          renderOption={(option, { selected }) => (
            <>
              <DoneIcon
                className={classes.iconSelected}
                style={{ visibility: selected ? 'visible' : 'hidden' }}
              />
              <div className={classes.text}>
                {option.label || option.id}
              </div>
            </>
          )}
          options={[...options].sort((a, b) => {
            // Display the selected labels first.
            let ai = value.indexOf(a)
            ai = ai === -1 ? value.length + options.indexOf(a) : ai
            let bi = value.indexOf(b)
            bi = bi === -1 ? value.length + options.indexOf(b) : bi
            return ai - bi
          })}
          getOptionLabel={(option) => option.label || option.id}
          renderInput={(params) => (
            <InputBase
              ref={params.InputProps.ref}
              inputProps={params.inputProps}
              autoFocus
              className={classes.inputBase}
            />
          )}

          {...rest}
        />
      </Popper>
    </div>
  )
}



