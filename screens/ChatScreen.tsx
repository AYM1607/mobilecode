import React, { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, Button, FlatList, Alert, StyleSheet } from 'react-native'
import { opencodeClient, getServerUrl } from '../lib/opencode'
import EventSource from 'react-native-sse'
import { ToolRenderer, ToolPart } from '../components/tools'

export const ChatScreen = ({ route }: any) => {
  const { sessionId } = route.params
  const [messages, setMessages] = useState<any[]>([])
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
        const data = JSON.parse(event.data)

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
                const partIndex = existingParts.findIndex(p => p.id === part.id)
                
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

  const renderMessage = ({ item }: any) => {
    const textParts = item.parts.filter((part: any) => part.type === 'text' && part.text)
    const toolParts = item.parts.filter((part: any) => part.type === 'tool')
    const reasoningParts = item.parts.filter((part: any) => part.type === 'reasoning')
    
    const isUser = item.info?.role === 'user'
    
    // Check if any tool parts need permissions and get permission data
    const getPermissionInfo = (toolPart: any) => {
      if (!toolPart.callID) return { requiresPermission: false, permission: null }
      
      // Find pending permission for this callID
      const pendingPermission = permissions.find(p => 
        p.callID === toolPart.callID
      )
      
      return {
        requiresPermission: !!pendingPermission,
        permission: pendingPermission
      }
    }
    
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}>
        <View style={styles.messageHeader}>
          <Text style={styles.messageAuthor}>
            {isUser ? 'You' : 'Assistant'}
          </Text>
          {!isUser && item.info?.modelID && (
            <Text style={styles.modelInfo}>{item.info.modelID}</Text>
          )}
        </View>

        {/* Render reasoning parts first */}
        {reasoningParts.map((part: any, index: number) => (
          <View key={`reasoning-${index}`} style={styles.reasoningContainer}>
            <Text style={styles.reasoningLabel}>Thinking...</Text>
            {part.text && (
              <Text style={styles.reasoningText}>{part.text}</Text>
            )}
          </View>
        ))}

        {/* Render tool parts */}
        {toolParts.map((part: any, index: number) => {
          const permissionInfo = getPermissionInfo(part)
          return (
            <ToolRenderer
              key={`tool-${index}`}
              part={part as ToolPart}
              onPermissionResponse={handlePermissionResponse}
              requiresPermission={permissionInfo.requiresPermission}
              pendingPermission={permissionInfo.permission}
            />
          )
        })}

        {/* Render final text result at the end for assistant messages */}
        {!isUser && textParts.map((part: any, index: number) => (
          <View key={`final-text-${index}`} style={styles.finalResultContainer}>
            <Text style={styles.messageText}>
              {part.text}
            </Text>
          </View>
        ))}

        {/* Render text parts normally for user messages */}
        {isUser && textParts.map((part: any, index: number) => (
          <Text key={`text-${index}`} style={styles.messageText}>
            {part.text}
          </Text>
        ))}

        {/* Loading state */}
        {textParts.length === 0 && toolParts.length === 0 && reasoningParts.length === 0 && (
          <Text style={styles.loadingText}>Loading...</Text>
        )}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => `${item.info.id}-${index}`}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
      />

      <View style={styles.inputContainer}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
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
    backgroundColor: '#ffffff',
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
    borderRadius: 12,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007bff',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
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
    color: '#6c757d',
  },
  modelInfo: {
    fontSize: 10,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
    marginTop: 4,
  },
  reasoningContainer: {
    backgroundColor: '#e3f2fd',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196f3',
  },
  reasoningLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  reasoningText: {
    fontSize: 14,
    color: '#1976d2',
    fontStyle: 'italic',
  },
  loadingText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#6c757d',
    marginTop: 4,
  },
  finalResultContainer: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
})
