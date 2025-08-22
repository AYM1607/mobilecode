import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import { ChatScreen } from '@/screens/ChatScreen'

export default function ChatRoute() {
  const { sessionId, projectId } = useLocalSearchParams<{ sessionId: string; projectId?: string }>()
  
  const route = {
    params: { sessionId, projectId }
  }

  return <ChatScreen route={route} />
}