import React from 'react'
import { SessionsScreen } from '@/screens/SessionScreen'
import { router } from 'expo-router'

export default function SessionsRoute() {
  const navigation = {
    navigate: (screen: string, params: any) => {
      if (screen === 'Chat') {
        router.push(`/chat?sessionId=${params.sessionId}`)
      }
    }
  }

  return <SessionsScreen navigation={navigation} />
}