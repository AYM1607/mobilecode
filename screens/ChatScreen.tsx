import React, { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, Button, FlatList, Alert, StyleSheet } from 'react-native'
import EventSource from 'react-native-sse'
import { Markdown } from "react-native-remark";

import { opencodeClient, getServerUrl } from '../lib/opencode'
import { ToolRenderer, ToolPart } from '../components/tools'

export const ChatScreen = ({ route }: any) => {
  const { sessionId } = route.params
  const [messages, setMessages] = useState<any[]>([])
  const [flatListData, setFlatListData] = useState<any[]>([])
  const [permissions, setPermissions] = useState<any[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const flatListRef = useRef<FlatList>(null)

  // Load existing messages
  const loadMessages = async () => {
    console.log('Loading messages for session:', sessionId)
    try {
      const sessionMessages = await opencodeClient.session.messages({ path: {id: sessionId} })
      console.log('Loaded messages:', sessionMessages.data?.length, 'messages')
      console.log('Message data:', JSON.stringify(sessionMessages.data, null, 2))
      setMessages(sessionMessages.data!)
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  // Convert messages to flat list of parts
  const flattenMessages = (messages: any[]) => {
    const flatData: any[] = []
    
    messages.forEach((message) => {
      // Add parts in the order they appear
      ;(message.parts || []).forEach((part: any, index: number) => {
        flatData.push({
          id: `${part.id || `part-${message.info?.id}-${index}`}`,
          type: part.type,
          part,
          messageInfo: message.info,
          messageId: message.info?.id
        })
      })
        
      // Add loading state if no parts exist
      if ((message.parts || []).length === 0) {
        flatData.push({
          id: `loading-${message.info?.id}`,
          type: 'loading',
          messageInfo: message.info,
          messageId: message.info?.id
        })
      }
    })
    
    return flatData
  }

  // Update flatListData when messages change
  useEffect(() => {
    setFlatListData(flattenMessages(messages))
  }, [messages])

  // Setup SSE connection for real-time updates
  const setupEventSource = () => {
    console.log('Setting up SSE connection to:', `${getServerUrl()}/event`)
    
    const eventSource = new EventSource(
      `${getServerUrl()}/event`,
      {
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        }
      }
    )

    eventSource.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data || '{}')

        // Handle message updates
        if (data.type === 'message.updated') {
          setMessages(prevMessages => {
            const newMessages = [...prevMessages]
            const existingIndex = newMessages.findIndex(msg => msg.info?.id === data.properties.info.id)
            
            if (existingIndex >= 0) {
              newMessages[existingIndex] = { 
                info: data.properties.info, 
                parts: newMessages[existingIndex].parts || [] 
              }
            } else {
              newMessages.push({ 
                info: data.properties.info, 
                parts: [] 
              })
            }
            return newMessages
          })
        }

        // Handle permission updates
        if (data.type === 'permission.updated') {
          console.log('Permission updated:', JSON.stringify(data.properties, null, 2))
          setPermissions(prevPermissions => {
            const newPermissions = [...prevPermissions]
            const existingIndex = newPermissions.findIndex(p => p.id === data.properties.id)
            
            if (existingIndex >= 0) {
              console.log(`Updating existing permission ${data.properties.id}`)
              newPermissions[existingIndex] = data.properties
            } else {
              console.log(`Adding new permission ${data.properties.id}`)
              newPermissions.push(data.properties)
            }
            console.log('Current permissions:', newPermissions.map(p => `${p.id} (${p.callID}) - ${p.status}`))
            return newPermissions
          })
        }

        // Handle message part updates
        if (data.type === 'message.part.updated') {
          const part = data.properties.part
          
          // Update the message with this part directly
          setMessages(prevMessages => {
            return prevMessages.map(message => {
              if (message.info?.id === part.messageID) {
                // Get existing parts and update/add the new part
                const existingParts = message.parts || []
                const partIndex = existingParts.findIndex((p: any) => p.id === part.id)
                
                let updatedParts
                if (partIndex >= 0) {
                  // Update existing part
                  updatedParts = [...existingParts]
                  updatedParts[partIndex] = part
                } else {
                  // Add new part
                  updatedParts = [...existingParts, part]
                }
                
                return {
                  ...message,
                  parts: updatedParts.sort((a, b) => {
                    // Sort by creation time if available, otherwise by type priority
                    const aTime = a.time?.created || 0
                    const bTime = b.time?.created || 0
                    return aTime - bTime
                  })
                }
              }
              return message
            })
          })
          
          // Auto scroll to bottom when new content is added
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true })
          }, 100)
        }
      } catch (e) {
        console.error('Failed to parse SSE message:', e, event.data)
      }
    })

    eventSource.addEventListener('error', (error) => {
      console.error('SSE Error:', error)
    })

    eventSource.addEventListener('open', () => {
      console.log('SSE Connection opened successfully')
    })

    console.log('EventSource created:', eventSource)
    eventSourceRef.current = eventSource
  }

  // Send message
  const sendMessage = async () => {
    if (!inputText.trim()) return

    const messageText = inputText.trim()
    setInputText('') // Clear input immediately
    setLoading(true)
    
    try {
      await opencodeClient.session.chat({
        path: {
          id: sessionId
        },
        body: {
          providerID: 'github-copilot',
          modelID: 'claude-sonnet-4',
          parts: [{ type: 'text', text: messageText }],
        }
      })
      // Messages will be updated via SSE
    } catch (error) {
      Alert.alert('Error', 'Failed to send message')
      console.error('Send message error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Load existing messages on mount
    loadMessages()
    setupEventSource()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [sessionId])

  const handlePermissionResponse = async (callID: string, response: 'accept' | 'reject' | 'accept_always') => {
    try {
      console.log(`Responding to permission ${callID} with: ${response}`)
      
      // Find the permission by callID
      const permission = permissions.find(p => p.callID === callID)
      if (!permission) {
        console.error('Permission not found for callID:', callID)
        return
      }
      
      // Map response to server expected format
      const serverResponse = response === 'accept' ? 'once' : 
                            response === 'accept_always' ? 'always' : 'reject'
      
      // Respond to the permission
      await opencodeClient.postSessionByIdPermissionsByPermissionId({
        path: { id: sessionId, permissionID: permission.id },
        body: { response: serverResponse }
      })
      
      console.log('Permission response sent successfully')
      
      // Remove the permission from state after responding
      setPermissions(prevPermissions => 
        prevPermissions.filter(p => p.id !== permission.id)
      )
    } catch (error) {
      console.error('Permission response failed:', error)
      Alert.alert('Error', 'Failed to respond to permission request')
    }
  }

  const renderPart = ({ item }: any) => {
    const isUser = item.messageInfo?.role === 'user'
    
    // Check if any tool parts need permissions and get permission data
    const getPermissionInfo = (toolPart: any) => {
      if (!toolPart.callID) return { requiresPermission: false, permission: null }
      
      // Find pending permission for this callID
      const pendingPermission = permissions.find((p: any) => 
        p.callID === toolPart.callID
      )
      
      return {
        requiresPermission: !!pendingPermission,
        permission: pendingPermission
      }
    }
    
    // Handle different part types
    switch (item.type) {
      case 'reasoning':
        return (
          <View style={styles.reasoningContainer}>
            <Text style={styles.reasoningLabel}>Thinking...</Text>
            {item.part.text && (
              <Text style={styles.reasoningText}>{item.part.text}</Text>
            )}
          </View>
        )
      
      case 'tool':
        const permissionInfo = getPermissionInfo(item.part)
        return (
          <ToolRenderer
            part={item.part as ToolPart}
            onPermissionResponse={handlePermissionResponse}
            requiresPermission={permissionInfo.requiresPermission}
            pendingPermission={permissionInfo.permission}
          />
        )
      
      case 'text':
        if (!item.part.text) return null
        
        const containerStyle = isUser 
          ? [styles.messageContainer, styles.userMessage]
          : [styles.messageContainer, styles.assistantMessage]
        
        return (
          <View style={containerStyle}>
            <View style={styles.messageHeader}>
              <Text style={styles.messageAuthor}>
                {isUser ? 'You' : 'Assistant'}
              </Text>
              {!isUser && item.messageInfo?.modelID && (
                <Text style={styles.modelInfo}>{item.messageInfo.modelID}</Text>
              )}
            </View>
            <Markdown 
              markdown={item.part.text}
              customStyles={{
                text: { color: '#ffffff', fontSize: 16, lineHeight: 22 },
                paragraph: { color: '#ffffff', fontSize: 16, lineHeight: 22 },
                inlineCode: { backgroundColor: '#1a1a1a', color: '#ffffff', fontFamily: 'monospace', padding: 2 },
                codeBlock: { 
                  contentBackgroundColor: '#1a1a1a',
                  contentTextStyle: { color: '#ffffff', fontFamily: 'monospace' },
                  headerBackgroundColor: '#2d2d30',
                  headerTextStyle: { color: '#b3b3b3', fontFamily: 'monospace' }
                },
                blockquote: { backgroundColor: '#333333', borderLeftColor: '#555555', padding: 8 },
                heading: (level: number) => ({ 
                  color: '#ffffff', 
                  fontSize: 24 - (level * 2), 
                  fontWeight: 'bold' as any,
                  marginVertical: 4
                }),
                link: { color: '#42a7f5' },
                strong: { color: '#ffffff', fontWeight: 'bold' as any },
                emphasis: { color: '#ffffff', fontStyle: 'italic' as any },
                list: { marginVertical: 4 },
                listItem: { backgroundColor: 'transparent' },
                container: { backgroundColor: 'transparent' }
              }}
            />
          </View>
        )
      
      case 'loading':
        return (
          <View style={[styles.messageContainer, styles.assistantMessage]}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )
      
      default:
        return null
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={flatListData}
        renderItem={renderPart}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
      />

      <View style={styles.inputContainer}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor="#888888"
          style={styles.textInput}
          multiline
        />
        <Button
          title={loading ? "..." : "Send"}
          onPress={sendMessage}
          disabled={loading || !inputText.trim()}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 8,
  },
  messageContainer: {
    marginVertical: 4,
    padding: 8,
  },
  userMessage: {
    backgroundColor: '#2d2d30',
    borderLeftWidth: 3,
    borderLeftColor: '#42a7f5',
  },
  assistantMessage: {
    backgroundColor: '#2d2d30',
    borderLeftWidth: 3,
    borderLeftColor: '#835dd4',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageAuthor: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#b3b3b3',
  },
  modelInfo: {
    fontSize: 10,
    color: '#b3b3b3',
    fontStyle: 'italic',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#ffffff',
    marginTop: 4,
  },
  reasoningContainer: {
    backgroundColor: '#1a237e',
    padding: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3f51b5',
  },
  reasoningLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7986cb',
    marginBottom: 4,
  },
  reasoningText: {
    fontSize: 14,
    color: '#9fa8da',
    fontStyle: 'italic',
  },
  loadingText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#b3b3b3',
    marginTop: 4,
  },
  finalResultContainer: {
    backgroundColor: '#1b5e20',
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1e1e1e',
    borderTopWidth: 1,
    borderTopColor: '#404040',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#555555',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#2d2d30',
    color: '#ffffff',
  },
})
