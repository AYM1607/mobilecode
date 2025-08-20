import React, { useState, useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, Button } from 'react-native'
import { router } from 'expo-router'
import { opencodeClient } from '@/lib/opencode'
import type { Session } from '@opencode-ai/sdk'

export const SessionsScreen = () => {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  const loadSessions = async () => {
    try {
      const sessionsList = await opencodeClient.session.list()
      setSessions(sessionsList.data!)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const createSession = async () => {
    try {
      const newSession = await opencodeClient.session.create()
      router.push(`/chat?sessionId=${newSession.data!.id}`)
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  const renderSession = ({ item }: { item: Session }) => (
    <TouchableOpacity
      style={{ padding: 15, borderBottomWidth: 1 }}
      onPress={() => router.push(`/chat?sessionId=${item.id}`)}
    >
      <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.title}</Text>
      <Text style={{ color: 'gray' }}>
        {new Date(item.time.updated * 1000).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  )

  if (loading) {
    return <View><Text>Loading sessions...</Text></View>
  }

  return (
    <View style={{ flex: 1 }}>
      <Button title="New Session" onPress={createSession} />
      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadSessions}
      />
    </View>
  )
}
