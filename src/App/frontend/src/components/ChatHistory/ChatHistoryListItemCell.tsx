import * as React from 'react'
import { useContext, useEffect, useRef, useState } from 'react'
import {
  DefaultButton,
  Dialog,
  DialogFooter,
  DialogType,
  IconButton,
  ITextField,
  ITooltipHostStyles,
  List,
  PrimaryButton,
  Separator,
  Spinner,
  SpinnerSize,
  Stack,
  Text,
  TextField,
  TooltipHost,
  DirectionalHint,
} from '@fluentui/react'
import { useBoolean } from '@fluentui/react-hooks'

import { historyDelete, historyList, historyRename } from '../../api'
import { Conversation,GroupedChatHistory } from '../../api/models'
import { AppStateContext } from '../../state/AppProvider'

import styles from './ChatHistoryPanel.module.css'

interface ChatHistoryListItemCellProps {
  item?: Conversation
  onSelect: (item: Conversation | null) => void
}

export const ChatHistoryListItemCell: React.FC<ChatHistoryListItemCellProps> = ({ item, onSelect }) => {
  const [isHovered, setIsHovered] = React.useState(false)
  const [edit, setEdit] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [hideDeleteDialog, { toggle: toggleDeleteDialog }] = useBoolean(true)
  const [errorDelete, setErrorDelete] = useState(false)
  const [renameLoading, setRenameLoading] = useState(false)
  const [errorRename, setErrorRename] = useState<string | undefined>(undefined)
  const [textFieldFocused, setTextFieldFocused] = useState(false)
  const textFieldRef = useRef<ITextField | null>(null)
  const [isButtonDisabled, setIsButtonDisabled] = useState<boolean>(false);

  const appStateContext = React.useContext(AppStateContext)
  const isSelected = item?.id === appStateContext?.state.currentChat?.id
  const dialogContentProps = {
    type: DialogType.close,
    title: 'Are you sure you want to delete this item?',
    closeButtonAriaLabel: 'Close',
    subText: 'The history of this chat session will permanently removed.'
  }

  const modalProps = {
    titleAriaId: 'labelId',
    subtitleAriaId: 'subTextId',
    isBlocking: true,
    styles: { main: { maxWidth: 450 } }
  }

  if (!item) {
    return null
  }

  useEffect(() => {
    if (textFieldFocused && textFieldRef.current) {
      textFieldRef.current.focus()
      setTextFieldFocused(false)
    }
  }, [textFieldFocused])

  useEffect(() => {
    if (appStateContext?.state.currentChat?.id !== item?.id) {
      setEdit(false)
      setEditTitle('')
    }
  }, [appStateContext?.state.currentChat?.id, item?.id])

  useEffect(()=>{
    let v = appStateContext?.state.isRequestInitiated;
    if(v!=undefined)
      setIsButtonDisabled(v && isSelected)
  },[appStateContext?.state.isRequestInitiated])

  const onDelete = async () => {
    appStateContext?.dispatch({ type: 'TOGGLE_LOADER' });
    const response = await historyDelete(item.id)
    if (!response.ok) {
      setErrorDelete(true)
      setTimeout(() => {
        setErrorDelete(false)
      }, 5000)
    } else {
      appStateContext?.dispatch({ type: 'DELETE_CHAT_ENTRY', payload: item.id })
    }
    appStateContext?.dispatch({ type: 'TOGGLE_LOADER' });
    toggleDeleteDialog()
  }

  const onEdit = () => {
    setEdit(true)
    setTextFieldFocused(true)
    setEditTitle(item?.title)
  }

  const handleSelectItem = () => {
    onSelect(item)
    appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: item })
  }

  const truncatedTitle = item?.title?.length > 24 ? `${item.title.substring(0, 24)} ...` : item.title

  const handleSaveEdit = async (e: any) => {
    e.preventDefault()
    if (errorRename || renameLoading) {
      return
    }
    if (editTitle == item.title) {
      setErrorRename('Error: Enter a new title to proceed.')
      setTimeout(() => {
        setErrorRename(undefined)
        setTextFieldFocused(true)
        if (textFieldRef.current) {
          textFieldRef.current.focus()
        }
      }, 5000)
      return
    }
    setRenameLoading(true)
    const response = await historyRename(item.id, editTitle)
    if (!response.ok) {
      setErrorRename('Error: could not rename item')
      setTimeout(() => {
        setTextFieldFocused(true)
        setErrorRename(undefined)
        if (textFieldRef.current) {
          textFieldRef.current.focus()
        }
      }, 5000)
    } else {
      setRenameLoading(false)
      setEdit(false)
      appStateContext?.dispatch({ type: 'UPDATE_CHAT_TITLE', payload: { ...item, title: editTitle } as Conversation })
      setEditTitle('')
    }
  }

  const chatHistoryTitleOnChange = (e: any) => {
    setEditTitle(e.target.value)
  }

  const cancelEditTitle = () => {
    setEdit(false)
    setEditTitle('')
  }

  const handleKeyPressEdit = (e: any) => {
    if (e.key === 'Enter') {
      return handleSaveEdit(e)
    }
    if (e.key === 'Escape') {
      cancelEditTitle()
      return
    }
  }

  return (
    <Stack
      key={item.id}
      tabIndex={0}
      aria-label="chat history item"
      className={styles.itemCell}
      onClick={() => handleSelectItem()}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ' ? handleSelectItem() : null)}
      verticalAlign="center"
      // horizontal
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      styles={{
        root: {
          backgroundColor: isSelected ? '#e6e6e6' : 'transparent'
        }
      }}>
      {edit ? (
        <>
          <Stack.Item style={{ width: '100%' }}>
            <form aria-label="edit title form" onSubmit={e => handleSaveEdit(e)} style={{ padding: '5px 0px' }}>
              <Stack horizontal verticalAlign={'start'}>
                <Stack.Item>
                  <TextField
                    ariaLabel={'rename-input'}
                    componentRef={textFieldRef}
                    autoFocus={textFieldFocused}
                    value={editTitle}
                    placeholder={item.title}
                    onChange={chatHistoryTitleOnChange}
                    onKeyDown={handleKeyPressEdit}
                    // errorMessage={errorRename}
                    disabled={errorRename ? true : false}
                  />
                </Stack.Item>
                {editTitle && (
                  <Stack.Item>
                    <Stack aria-label="action button group" horizontal verticalAlign={'center'}>
                      <IconButton
                        role="button"
                        disabled={errorRename !== undefined || editTitle == item.title}
                        onKeyDown={e => (e.key === ' ' || e.key === 'Enter' ? handleSaveEdit(e) : null)}
                        onClick={e => handleSaveEdit(e)}
                        aria-label="confirm new title"
                        iconProps={{ iconName: 'CheckMark' }}
                        styles={{ root: { color: 'green', marginLeft: '5px' } }}
                      />
                      <IconButton
                        role="button"
                        disabled={errorRename !== undefined}
                        onKeyDown={e => (e.key === ' ' || e.key === 'Enter' ? cancelEditTitle() : null)}
                        onClick={() => cancelEditTitle()}
                        aria-label="cancel edit title"
                        iconProps={{ iconName: 'Cancel' }}
                        styles={{ root: { color: 'red', marginLeft: '5px' } }}
                      />
                    </Stack>
                  </Stack.Item>
                )}
              </Stack>
              {errorRename && (
                <Text
                  role="alert"
                  aria-label={errorRename}
                  style={{ fontSize: 12, fontWeight: 400, color: 'rgb(164,38,44)' }}>
                  {errorRename}
                </Text>
              )}
            </form>
          </Stack.Item>
        </>
      ) : (
        <>
          <Stack horizontal verticalAlign={'center'} style={{ width: '100%' }}>            
            <Stack.Item grow>
              <TooltipHost
                content={item.title}
                directionalHint={DirectionalHint.bottomCenter}
              >
                <div className={styles.chatTitle}>{truncatedTitle}</div>
              </TooltipHost>
            </Stack.Item>
            {(isSelected || isHovered) && (
              <Stack horizontal horizontalAlign="end">
                <IconButton
                  className={styles.itemButton}
                  disabled={isButtonDisabled}
                  iconProps={{ iconName: 'Delete' }}
                  title="Delete"
                  onClick={toggleDeleteDialog}
                  onKeyDown={e => (e.key === ' ' ? toggleDeleteDialog() : null)}
                />
                <IconButton
                  className={styles.itemButton}
                  disabled={isButtonDisabled}
                  iconProps={{ iconName: 'Edit' }}
                  title="Edit"
                  onClick={onEdit}
                  onKeyDown={e => (e.key === ' ' ? onEdit() : null)}
                />
              </Stack>
            )}
          </Stack>
        </>
      )}
      {errorDelete && (
        <Text
          styles={{
            root: { color: 'red', marginTop: 5, fontSize: 14 }
          }}>
          Error: could not delete item
        </Text>
      )}
      <Dialog
        hidden={hideDeleteDialog}
        onDismiss={toggleDeleteDialog}
        dialogContentProps={dialogContentProps}
        modalProps={modalProps}>
        <DialogFooter>
          <PrimaryButton onClick={onDelete} text="Delete" />
          <DefaultButton onClick={toggleDeleteDialog} text="Cancel" />
        </DialogFooter>
      </Dialog>
    </Stack>
  )
}


