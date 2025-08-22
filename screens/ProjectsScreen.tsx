import React, { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, Button, StyleSheet, Animated, PanResponder, Alert, Modal, TextInput } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { projectStorage, type Project, type QRCodeData } from '@/lib/projectStorage'
import { QRScanner } from '@/components/QRScanner'

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
      const absX = Math.abs(gestureState.dx)
      const absY = Math.abs(gestureState.dy)
      return absX > 10 && absX > absY
    },
    onMoveShouldSetPanResponderCapture: (_, gestureState) => {
      const absX = Math.abs(gestureState.dx)
      const absY = Math.abs(gestureState.dy)
      return absX > 15 && absX > absY * 1.5
    },
    onPanResponderGrant: () => {
      onSwipeStart?.()
      return true
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dx < 0) {
        translateX.setValue(gestureState.dx)
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx < -100) {
        onDelete(resetPosition)
      } else {
        resetPosition()
      }
    },
    onPanResponderTerminate: () => {
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

export const ProjectsScreen = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [scrollEnabled, setScrollEnabled] = useState(true)
  const [showScanner, setShowScanner] = useState(false)
  const [showNameInput, setShowNameInput] = useState(false)
  const [scannedData, setScannedData] = useState<QRCodeData | null>(null)
  const [projectName, setProjectName] = useState('')

  const loadProjects = async () => {
    try {
      const projectsList = await projectStorage.getProjects()
      setProjects(projectsList)
    } catch (error) {
      console.error('Failed to load projects:', error)
      Alert.alert('Error', 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadProjects()
    setRefreshing(false)
  }

  const handleQRSuccess = (data: QRCodeData) => {
    setScannedData(data)
    setShowScanner(false)
    setShowNameInput(true)
  }

  const handleNameSubmit = async () => {
    if (!scannedData || !projectName.trim()) {
      Alert.alert('Error', 'Please enter a project name')
      return
    }

    try {
      await projectStorage.addProject({
        name: projectName.trim(),
        url: scannedData.link,
        authToken: scannedData.auth
      })
      
      setProjectName('')
      setScannedData(null)
      setShowNameInput(false)
      await loadProjects()
      
      Alert.alert('Success', 'Project added successfully!')
    } catch (error) {
      console.error('Failed to add project:', error)
      Alert.alert('Error', 'Failed to add project')
    }
  }

  const deleteProject = async (projectId: string) => {
    try {
      await projectStorage.deleteProject(projectId)
      setProjects(projects.filter(project => project.id !== projectId))
    } catch (error) {
      console.error('Failed to delete project:', error)
      Alert.alert('Error', 'Failed to delete project')
    }
  }

  const confirmDeleteProject = (project: Project, resetRow: () => void) => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${project.name}"?`,
      [
        { 
          text: 'Cancel', 
          style: 'cancel', 
          onPress: () => resetRow()
        },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => deleteProject(project.id) 
        }
      ]
    )
  }

  const openProject = (project: Project) => {
    router.push(`/sessions?projectId=${project.id}`)
  }

  useEffect(() => {
    loadProjects()
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      loadProjects()
    }, [])
  )

  const renderProject = ({ item }: { item: Project }) => (
    <SwipeableRow 
      onDelete={(resetFn) => confirmDeleteProject(item, resetFn)}
      onSwipeStart={() => setScrollEnabled(false)}
      onSwipeEnd={() => setScrollEnabled(true)}
    >
      <TouchableOpacity
        style={styles.projectItem}
        onPress={() => openProject(item)}
      >
        <Text style={styles.projectName}>{item.name}</Text>
        <Text style={styles.projectUrl}>{item.url}</Text>
        <Text style={styles.projectDate}>
          Created {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
    </SwipeableRow>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading projects...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <Button title="Add Project" onPress={() => setShowScanner(true)} />
      </View>
      
      {projects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No projects yet</Text>
          <Text style={styles.emptySubtext}>Tap "Add Project" to scan a QR code</Text>
        </View>
      ) : (
        <FlatList
          data={projects}
          renderItem={renderProject}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          style={styles.list}
          scrollEnabled={scrollEnabled}
          directionalLockEnabled={true}
          bounces={true}
        />
      )}

      <Modal
        visible={showScanner}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <QRScanner
          onScanSuccess={handleQRSuccess}
          onCancel={() => setShowScanner(false)}
        />
      </Modal>

      <Modal
        visible={showNameInput}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Name Your Project</Text>
            <Text style={styles.modalSubtitle}>
              Scanned: {scannedData?.link}
            </Text>
            <TextInput
              style={styles.textInput}
              value={projectName}
              onChangeText={setProjectName}
              placeholder="Enter project name"
              placeholderTextColor="#888888"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleNameSubmit}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowNameInput(false)
                  setProjectName('')
                  setScannedData(null)
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitButton}
                onPress={handleNameSubmit}
              >
                <Text style={styles.modalSubmitText}>Add Project</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  projectItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    backgroundColor: '#1e1e1e',
  },
  projectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  projectUrl: {
    color: '#0066cc',
    fontSize: 14,
    marginBottom: 4,
  },
  projectDate: {
    color: '#888888',
    fontSize: 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    margin: 20,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 16,
    textAlign: 'center',
  },
  textInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    backgroundColor: '#121212',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  modalCancelText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  modalSubmitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0066cc',
  },
  modalSubmitText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
})