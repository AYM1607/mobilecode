import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { ToolPart } from './ToolRenderer'
import { PermissionPrompt } from './PermissionPrompt'

interface WriteToolProps {
  part: ToolPart
  onPermissionResponse?: (callID: string, response: 'accept' | 'reject' | 'accept_always') => void
  requiresPermission?: boolean
}

export const WriteTool: React.FC<WriteToolProps> = ({ 
  part, 
  onPermissionResponse,
  requiresPermission = false 
}) => {
  const [expanded, setExpanded] = useState(false)
  
  const input = part.state.input || {}
  const filePath = input.filePath || 'Unknown file'
  const content = input.content || ''
  
  const getStatusColor = () => {
    switch (part.state.status) {
      case 'completed': return '#28a745'
      case 'error': return '#dc3545'
      case 'running': return '#ffc107'
      case 'pending': return '#6c757d'
      default: return '#6c757d'
    }
  }

  const getStatusText = () => {
    switch (part.state.status) {
      case 'completed': return 'Write completed'
      case 'error': return 'Write failed'
      case 'running': return 'Writing...'
      case 'pending': return 'Preparing write...'
      default: return 'Write'
    }
  }

  const handlePermissionResponse = (response: 'accept' | 'reject' | 'accept_always') => {
    if (onPermissionResponse && part.callID) {
      onPermissionResponse(part.callID, response)
    }
  }

  const truncateContent = (text: string, maxLines: number = 10) => {
    const lines = text.split('\n')
    if (lines.length <= maxLines) return text
    return lines.slice(0, maxLines).join('\n') + '\n...'
  }

  const getFileExtension = (path: string) => {
    return path.split('.').pop()?.toLowerCase() || 'txt'
  }

  const renderContent = () => {
    if (!content) return null

    const displayContent = expanded ? content : truncateContent(content)
    const extension = getFileExtension(filePath)
    const lineCount = content.split('\n').length

    return (
      <View style={styles.contentContainer}>
        <View style={styles.fileHeader}>
          <View style={styles.fileInfo}>
            <Text style={styles.fileName}>{filePath.split('/').pop()}</Text>
            <Text style={styles.fileDetails}>
              {extension.toUpperCase()} • {lineCount} lines
            </Text>
          </View>
        </View>
        
        <ScrollView style={styles.codeContainer} horizontal={true}>
          <Text style={styles.codeText}>{displayContent}</Text>
        </ScrollView>
        
        {content.split('\n').length > 10 && (
          <TouchableOpacity 
            style={styles.expandButton}
            onPress={() => setExpanded(!expanded)}
          >
            <Text style={styles.expandText}>
              {expanded ? 'Show less' : 'Show more'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <View style={[styles.container, { borderLeftColor: getStatusColor() }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.toolIcon}>📝</Text>
          <View>
            <Text style={styles.toolTitle}>{getStatusText()}</Text>
            <Text style={styles.filePath}>{filePath}</Text>
          </View>
        </View>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
      </View>

      {renderContent()}

      {part.state.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{part.state.error}</Text>
        </View>
      )}

      {requiresPermission && (
        <PermissionPrompt onResponse={handlePermissionResponse} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 4,
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toolIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  toolTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  filePath: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  fileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
  },
  fileDetails: {
    fontSize: 12,
    color: '#6c757d',
  },
  codeContainer: {
    backgroundColor: '#ffffff',
    padding: 12,
    maxHeight: 300,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
    lineHeight: 16,
  },
  expandButton: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  expandText: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    padding: 8,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#721c24',
    fontSize: 12,
    fontFamily: 'monospace',
  },
})
