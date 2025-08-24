import React, { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, Button, StyleSheet, Animated, PanResponder, Alert } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { opencodeClient, getProjectClient, getProjectBearerAuth } from '@/lib/opencode'
import { projectStorage, type Project } from '@/lib/projectStorage'
import type { Session } from '@opencode-ai/sdk'

// SwipeableRow component for swipe-to-delete functionality
const SwipeableRow = ({ 
  children, 
  onDelete, 
  onSwipeStart, 
  onSwipeEnd 
}: { 
  children: React.ReactNode, 
  onDelete: (resetFn: () => void) => void,
  onSwipeStart?: () => void,
  onSwipeEnd?: () => void
}) => {
  const translateX = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(1)).current

  const resetPosition = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      })
    ]).start(() => {
      onSwipeEnd?.()
    })
  }, [translateX, scale, onSwipeEnd])

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      // Only respond to horizontal swipes that are more horizontal than vertical
      const absX = Math.abs(gestureState.dx)
      const absY = Math.abs(gestureState.dy)
      return absX > 10 && absX > absY
    },
    onMoveShouldSetPanResponderCapture: (_, gestureState) => {
      // Capture horizontal gestures aggressively
      const absX = Math.abs(gestureState.dx)
      const absY = Math.abs(gestureState.dy)
      return absX > 15 && absX > absY * 1.5
    },
    onPanResponderGrant: () => {
      onSwipeStart?.()
      return true
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
  })).current

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
  const { projectId } = useLocalSearchParams<{ projectId?: string }>()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [scrollEnabled, setScrollEnabled] = useState(true)
  const [project, setProject] = useState<Project | null>(null)
  const [client, setClient] = useState<any>(null)

  const initializeClient = async () => {
    if (projectId) {
      try {
        const projectData = await projectStorage.getProject(projectId)
        if (projectData) {
          setProject(projectData)
          const projectClient = await getProjectClient(projectId)
          setClient(projectClient)
        } else {
          Alert.alert('Error', 'Project not found')
          router.back()
        }
      } catch (error) {
        console.error('Failed to initialize project client:', error)
        Alert.alert('Error', 'Failed to load project')
        router.back()
      }
    } else {
      setClient(opencodeClient)
    }
  }

  const loadSessions = async () => {
    if (!client) return
    
    try {
      const sessionsList = await client.session.list({
        security: [getProjectBearerAuth()]
      })
      setSessions(sessionsList.data!)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    if (!client) return
    
    setRefreshing(true)
    try {
      const sessionsList = await client.session.list({
        security: [getProjectBearerAuth()]
      })
      setSessions(sessionsList.data!)
    } catch (error) {
      console.error('Failed to refresh sessions:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const createSession = async () => {
    if (!client) return
    
    try {
      const newSession = await client.session.create({
        security: [getProjectBearerAuth()]
      })
      console.log(newSession)
      // Refresh the sessions list to include the new session
      await loadSessions()
      const sessionParam = projectId ? `sessionId=${newSession.data!.id}&projectId=${projectId}` : `sessionId=${newSession.data!.id}`
      router.push(`/chat?${sessionParam}`)
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }

  const deleteSession = async (sessionId: string) => {
    if (!client) return
    
    try {
      await client.session.delete({ 
        path: { id: sessionId },
        security: [getProjectBearerAuth()]
      })
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
    initializeClient()
  }, [projectId])

  useEffect(() => {
    if (client) {
      loadSessions()
    }
  }, [client])

  // Reload sessions when screen comes into focus (e.g., returning from chat)
  useFocusEffect(
    React.useCallback(() => {
      if (client) {
        loadSessions()
      }
    }, [client])
  )

  const renderSession = ({ item }: { item: Session }) => (
    <SwipeableRow 
      onDelete={(resetFn) => confirmDeleteSession(item, resetFn)}
      onSwipeStart={() => setScrollEnabled(false)}
      onSwipeEnd={() => setScrollEnabled(true)}
    >
      <TouchableOpacity
        style={styles.sessionItem}
        onPress={() => {
          const sessionParam = projectId ? `sessionId=${item.id}&projectId=${projectId}` : `sessionId=${item.id}`
          router.push(`/chat?${sessionParam}`)
        }}
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
      {project && (
        <View style={styles.projectHeader}>
          <Text style={styles.projectName}>{project.name}</Text>
          <Text style={styles.projectUrl}>{project.url}</Text>
        </View>
      )}
      <View style={styles.buttonContainer}>
        <Button title="New Session" onPress={createSession} />
      </View>
      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        style={styles.list}
        scrollEnabled={scrollEnabled}
        directionalLockEnabled={true}
        bounces={true}
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
  projectHeader: {
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  projectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  projectUrl: {
    fontSize: 12,
    color: '#0066cc',
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
