import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import { ChatScreen } from '@/screens/ChatScreen'

export default function ChatRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>()
  
  const route = {
    params: { sessionId }
  }

  return <ChatScreen route={route} />
}