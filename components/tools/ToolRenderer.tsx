import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { WriteTool } from './WriteTool'
import { EditTool } from './EditTool'
import { BashTool } from './BashTool'
import { TodoTool } from './TodoTool'

export interface ToolPart {
  id: string
  messageID: string
  sessionID: string
  type: 'tool'
  tool: string
  state: {
    status: 'pending' | 'running' | 'completed' | 'error'
    input?: any
    output?: string
    error?: string
    metadata?: any
  }
  callID?: string
}

interface ToolRendererProps {
  part: ToolPart
  onPermissionResponse?: (callID: string, response: 'accept' | 'reject' | 'accept_always') => void
  requiresPermission?: boolean
  pendingPermission?: any
}

export const ToolRenderer: React.FC<ToolRendererProps> = ({ 
  part, 
  onPermissionResponse,
  requiresPermission = false,
  pendingPermission 
}) => {
  const renderToolByType = () => {
    switch (part.tool) {
      case 'write':
        return (
          <WriteTool 
            part={part} 
            onPermissionResponse={onPermissionResponse}
            requiresPermission={requiresPermission}
          />
        )
      case 'edit':
        return (
          <EditTool 
            part={part} 
            onPermissionResponse={onPermissionResponse}
            requiresPermission={requiresPermission}
            pendingPermission={pendingPermission}
          />
        )
      case 'bash':
        return (
          <BashTool 
            part={part} 
            onPermissionResponse={onPermissionResponse}
            requiresPermission={requiresPermission}
          />
        )
      case 'todowrite':
        const metadata = part.state.metadata || {}
        const todos = metadata.todos || []
        return <TodoTool todos={todos} />
      default:
        return <DefaultTool part={part} />
    }
  }

  return (
    <View style={styles.container}>
      {renderToolByType()}
    </View>
  )
}

const DefaultTool: React.FC<{ part: ToolPart }> = ({ part }) => {
  const [expanded, setExpanded] = useState(false)
  
  const getToolTitle = () => {
    const toolName = part.tool.charAt(0).toUpperCase() + part.tool.slice(1)
    
    if (part.state.status === 'pending') {
      return `${toolName}...`
    }
    
    return toolName
  }

  const getStatusColor = () => {
    switch (part.state.status) {
      case 'completed': return '#28a745'
      case 'error': return '#dc3545'
      case 'running': return '#ffc107'
      case 'pending': return '#6c757d'
      default: return '#6c757d'
    }
  }

  const truncateContent = (text: string, maxLines: number = 5) => {
    if (!text) return ''
    const lines = text.split('\n')
    if (lines.length <= maxLines) return text
    return lines.slice(0, maxLines).join('\n') + '\n...'
  }

  // Special handling for read tool
  if (part.tool === 'read') {
    const input = part.state.input || {}
    const metadata = part.state.metadata || {}
    const filePath = input.filePath || 'Unknown file'
    const content = metadata.preview || part.state.output || ''
    const originalLines = content.split('\n').length
    const displayContent = expanded ? content : truncateContent(content)

    return (
      <View style={[styles.readTool, { borderLeftColor: getStatusColor() }]}>
        <View style={styles.readHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.toolIcon}>📖</Text>
            <View>
              <Text style={styles.toolTitle}>{getToolTitle()}</Text>
              <Text style={styles.filePath}>{filePath}</Text>
            </View>
          </View>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
        </View>

        {content && (
          <View style={styles.contentContainer}>
            <View style={styles.fileHeader}>
              <Text style={styles.fileInfo}>
                {originalLines} lines
              </Text>
            </View>
            
            <View style={styles.codeContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={styles.scrollContentContainer}
                style={styles.scrollViewContainer}
              >
                <Text style={styles.codeText}>{displayContent}</Text>
              </ScrollView>
            </View>
            
            {originalLines > 5 && (
              <TouchableOpacity 
                style={styles.expandButton}
                onPress={() => setExpanded(!expanded)}
              >
                <Text style={styles.expandText}>
                  {expanded ? 'Show less' : `Show ${originalLines - 5} more lines`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {part.state.error && (
          <View style={styles.errorContainer}>
            <Text style={styles.error}>{part.state.error}</Text>
          </View>
        )}
      </View>
    )
  }

  // Default rendering for other tools
  return (
    <View style={styles.defaultTool}>
      <Text style={styles.toolTitle}>{getToolTitle()}</Text>
      {part.state.output && (
        <Text style={styles.output}>{part.state.output}</Text>
      )}
      {part.state.error && (
        <Text style={styles.error}>{part.state.error}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  defaultTool: {
    backgroundColor: '#2d2d30',
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#666',
  },
  readTool: {
    backgroundColor: '#2d2d30',
    borderLeftWidth: 4,
  },
  readHeader: {
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
    fontWeight: 'bold',
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 4,
  },
  filePath: {
    fontSize: 12,
    color: '#b3b3b3',
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
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  fileInfo: {
    fontSize: 12,
    color: '#b3b3b3',
  },
  codeContainer: {
    backgroundColor: '#1e1e1e',
    padding: 12,
  },
  scrollViewContainer: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContentContainer: {
    flexGrow: 0,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#ffffff',
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
    color: '#42a7f5',
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#4a1a1a',
    padding: 8,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  output: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#ffffff',
  },
  error: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#ff6b6b',
  },
})
