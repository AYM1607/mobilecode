import React, { useState, useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, Button, StyleSheet } from 'react-native'
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
      style={styles.sessionItem}
      onPress={() => router.push(`/chat?sessionId=${item.id}`)}
    >
      <Text style={styles.sessionTitle}>{item.title}</Text>
      <Text style={styles.sessionDate}>
        {new Date(item.time.updated * 1000).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading sessions...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <Button title="New Session" onPress={createSession} />
      </View>
      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadSessions}
        style={styles.list}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  buttonContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  list: {
    flex: 1,
  },
  sessionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    backgroundColor: '#1e1e1e',
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  sessionDate: {
    color: '#888888',
    fontSize: 14,
  },
})
