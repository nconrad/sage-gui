import { useState, useEffect } from 'react'
import styled from 'styled-components'

import { Button, Alert } from '@mui/material'
import EditIcon from '@mui/icons-material/EditRounded'
import CancelIcon from '@mui/icons-material/UndoRounded'

import { useProgress } from '/components/progress/ProgressProvider'

import * as User from '/components/apis/user'
import SimpleForm from '/components/input/SimpleForm'




const fields = [
  {key: 'name', label: 'Name', edit: false},
  {key: 'username', label: 'Username', edit: false},
  {key: 'email', label: 'Email', edit: false},
  {key: 'organization', label: 'Organization', maxLength: 30},
  {key: 'department', label: 'Department', maxLength: 30},
  {key: 'bio', label: 'Biography', type: 'textarea', maxLength: 500}
]


export default function UserProfile() {
  const {setLoading} = useProgress()

  // presentation
  const [data, setData] = useState<User.UserInfo>()
  const [error, setError] = useState()

  // form
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [state, setState] = useState<User.UserInfo>()


  useEffect(() => {
    setLoading(true)
    User.getUserInfo()
      .then(data => {
        setData(data)
        setState(data)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [setLoading])


  const handleChange = (evt) => {
    const {name, value} = evt.target
    setState(prev => ({...prev, [name]: value}))
  }

  const handleCancel = () => {
    setIsEditing(false)
    setState(data)
  }

  const handleSave = () => {
    setIsSaving(true)
    User.saveUserInfo(state)
      .then(data => {
        setIsEditing(false)
        setData(data)
      })
      .catch(err => setError(err))
      .finally(() => setIsSaving(false))
  }

  const formData = {
    fields, data, state, isEditing
  }

  return (
    <Root>
      <div className="flex items-center gap">
        <h1 className="no-margin">My Profile</h1>
        {isEditing ?
          <Button
            variant="outlined"
            className="cancel"
            onClick={handleCancel}
            startIcon={<CancelIcon/>}
          >
            Cancel
          </Button> :
          <Button startIcon={<EditIcon/>} onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        }
      </div>

      {data &&
        <div className="flex column user-info">
          <SimpleForm {...formData} onChange={handleChange} />
        </div>
      }

      {isEditing &&
        <Button
          className="save"
          variant="contained"
          type="submit"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      }

      {error &&
        <Alert severity="error">{error}</Alert>
      }

    </Root>
  )
}

const Root = styled.div`
  .user-info {
    margin-top: 2em;
  }

  .delete {
    border-color: #660000;
  }

  [type=submit] {
    margin-top: 2em;
  }
`


