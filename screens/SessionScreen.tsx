import React, { useState, useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, Button, StyleSheet, Animated, PanResponder, Alert } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { opencodeClient } from '@/lib/opencode'
import type { Session } from '@opencode-ai/sdk'

// SwipeableRow component for swipe-to-delete functionality
const SwipeableRow = ({ children, onDelete }: { children: React.ReactNode, onDelete: (resetFn: () => void) => void }) => {
  const translateX = new Animated.Value(0)
  const scale = new Animated.Value(1)

  const resetPosition = () => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      })
    ]).start()
  }

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 20
    },
    onPanResponderMove: (_, gestureState) => {
      // Only allow left swipe (negative dx)
      if (gestureState.dx < 0) {
        translateX.setValue(gestureState.dx)
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx < -100) {
        // Swipe threshold reached, trigger delete and pass reset function
        onDelete(resetPosition)
      } else {
        // Return to original position
        resetPosition()
      }
    },
    onPanResponderTerminate: () => {
      // Handle when gesture is interrupted
      resetPosition()
    },
  })

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.deleteBackground}>
        <Text style={styles.deleteText}>Delete</Text>
      </View>
      <Animated.View
        style={[
          styles.swipeableContent,
          {
            transform: [{ translateX }, { scale }]
          }
        ]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  )
}

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
      // Refresh the sessions list to include the new session
      await loadSessions()
      router.push(`/chat?sessionId=${newSession.data!.id}`)
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }

  const deleteSession = async (sessionId: string) => {
    try {
      await opencodeClient.session.delete({ path: { id: sessionId } })
      // Remove the session from local state
      setSessions(sessions.filter(session => session.id !== sessionId))
    } catch (error) {
      console.error('Failed to delete session:', error)
      Alert.alert('Error', 'Failed to delete session')
    }
  }

  const confirmDeleteSession = (session: Session, resetRow: () => void) => {
    Alert.alert(
      'Delete Session',
      `Are you sure you want to delete "${session.title}"?`,
      [
        { 
          text: 'Cancel', 
          style: 'cancel', 
          onPress: () => resetRow() // Reset row position if cancelled
        },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => deleteSession(session.id) 
        }
      ]
    )
  }

  useEffect(() => {
    loadSessions()
  }, [])

  // Reload sessions when screen comes into focus (e.g., returning from chat)
  useFocusEffect(
    React.useCallback(() => {
      loadSessions()
    }, [])
  )

  const renderSession = ({ item }: { item: Session }) => (
    <SwipeableRow onDelete={(resetFn) => confirmDeleteSession(item, resetFn)}>
      <TouchableOpacity
        style={styles.sessionItem}
        onPress={() => router.push(`/chat?sessionId=${item.id}`)}
      >
        <Text style={styles.sessionTitle}>{item.title}</Text>
        <Text style={styles.sessionDate}>
          {new Date(item.time.updated * 1000).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
    </SwipeableRow>
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
  swipeContainer: {
    position: 'relative',
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#dc3545',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  deleteText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  swipeableContent: {
    backgroundColor: '#1e1e1e',
  },
})
