import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { ToolPart } from './ToolRenderer'
import { PermissionPrompt } from './PermissionPrompt'

interface EditToolProps {
  part: ToolPart
  onPermissionResponse?: (callID: string, response: 'accept' | 'reject' | 'accept_always') => void
  requiresPermission?: boolean
  pendingPermission?: any // Permission object with metadata
}

export const EditTool: React.FC<EditToolProps> = ({ 
  part, 
  onPermissionResponse,
  requiresPermission = false,
  pendingPermission 
}) => {
  const [expanded, setExpanded] = useState(false)
  
  const input = part.state.input || {}
  let metadata = part.state.metadata || {}
  
  // Merge permission metadata if available (like GO TUI does)
  if (pendingPermission?.metadata) {
    metadata = { ...metadata, ...pendingPermission.metadata }
  }
  
  const filePath = input.filePath || metadata.filePath || 'Unknown file'
  const diff = metadata.diff || ''
  
  
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
      case 'completed': return 'Edit completed'
      case 'error': return 'Edit failed'
      case 'running': return 'Editing...'
      case 'pending': return 'Preparing edit...'
      default: return 'Edit'
    }
  }

  const handlePermissionResponse = (response: 'accept' | 'reject' | 'accept_always') => {
    if (onPermissionResponse && part.callID) {
      onPermissionResponse(part.callID, response)
    }
  }

  const parseDiff = (diffText: string) => {
    const lines = diffText.split('\n')
    let currentOldLine = 0
    let currentNewLine = 0
    const result = []
    
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index]
      let type: 'context' | 'added' | 'removed' = 'context'
      let displayLine = line
      let oldLineNumber = null
      let newLineNumber = null

      // Skip header lines entirely
      if (line.startsWith('Index:') || line.startsWith('===') || 
          line.startsWith('+++') || line.startsWith('---')) {
        continue
      } else if (line.startsWith('@@')) {
        // Parse hunk header to get line numbers but don't add it to results
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
        if (match) {
          currentOldLine = parseInt(match[1]) - 1
          currentNewLine = parseInt(match[2]) - 1
        }
        continue
      } else if (line.startsWith('+')) {
        type = 'added'
        displayLine = line.slice(1)
        currentNewLine++
        newLineNumber = currentNewLine
      } else if (line.startsWith('-')) {
        type = 'removed'
        displayLine = line.slice(1)
        currentOldLine++
        oldLineNumber = currentOldLine
      } else if (line.startsWith(' ')) {
        type = 'context'
        displayLine = line.slice(1)
        currentOldLine++
        currentNewLine++
        oldLineNumber = currentOldLine
        newLineNumber = currentNewLine
      } else {
        // Skip any other unrecognized lines
        continue
      }

      result.push({ 
        line: displayLine, 
        type, 
        original: line, 
        index,
        oldLineNumber,
        newLineNumber 
      })
    }
    
    return result
  }

  const truncateDiff = (diffText: string, maxLines: number = 20) => {
    const lines = diffText.split('\n')
    if (lines.length <= maxLines) return diffText
    return lines.slice(0, maxLines).join('\n') + '\n...'
  }

  const renderDiffLine = (item: ReturnType<typeof parseDiff>[0]) => {
    let style = styles.diffContext
    let prefix = '  '
    
    switch (item.type) {
      case 'added':
        style = styles.diffAdded
        prefix = '+ '
        break
      case 'removed':
        style = styles.diffRemoved
        prefix = '- '
        break
      default:
        prefix = '  '
    }

    const lineNumber = item.oldLineNumber || item.newLineNumber
    const lineNumberText = lineNumber ? `${lineNumber.toString().padStart(3, ' ')} ` : '    '

    return (
      <View key={item.index} style={styles.diffLineContainer}>
        <Text style={styles.lineNumber}>{lineNumberText}</Text>
        <Text style={style}>
          {prefix}{item.line}
        </Text>
      </View>
    )
  }

  const renderDiff = () => {
    if (!diff) return null

    const displayDiff = expanded ? diff : truncateDiff(diff)
    const parsedDiff = parseDiff(displayDiff)
    const contentLenght = parsedDiff.length

    const addedLines = parsedDiff.filter(l => l.type === 'added').length
    const removedLines = parsedDiff.filter(l => l.type === 'removed').length

    return (
      <View style={styles.diffContainer}>
        <View style={styles.diffFileHeader}>
          <Text style={styles.diffFileName}>{filePath}</Text>
          <Text style={styles.diffStats}>
            +{addedLines} -{removedLines} lines
          </Text>
        </View>
        
        <View style={styles.diffContent}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={styles.scrollContentContainer}
            style={styles.scrollViewContainer}
          >
            <View>
              {parsedDiff.map(renderDiffLine)}
            </View>
          </ScrollView>
        </View>
        
        {contentLenght > 20 && (
          <TouchableOpacity 
            style={styles.expandButton}
            onPress={() => setExpanded(!expanded)}
          >
            <Text style={styles.expandText}>
              {expanded ? 'Show less' : `Show ${contentLenght - 20} more lines`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  const renderDiagnostics = () => {
    const diagnostics = metadata.diagnostics?.[filePath]
    if (!diagnostics || !Array.isArray(diagnostics)) return null

    const errorDiagnostics = diagnostics.filter((d: any) => d.severity === 1)
    if (errorDiagnostics.length === 0) return null

    return (
      <View style={styles.diagnosticsContainer}>
        <Text style={styles.diagnosticsTitle}>Diagnostics:</Text>
        {errorDiagnostics.map((diagnostic: any, index: number) => (
          <Text key={index} style={styles.diagnosticText}>
            Error [{diagnostic.range.start.line + 1}:{diagnostic.range.start.character + 1}] {diagnostic.message}
          </Text>
        ))}
      </View>
    )
  }

  return (
    <View style={[styles.container, { borderLeftColor: getStatusColor() }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.toolIcon}>✏️</Text>
          <View>
            <Text style={styles.toolTitle}>{getStatusText()}</Text>
          </View>
        </View>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
      </View>

      {renderDiff()}
      {renderDiagnostics()}

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
    backgroundColor: '#2d2d30',
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
    color: '#ffffff',
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
  diffContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  diffFileHeader: {
    backgroundColor: '#404040',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  diffFileName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  diffStats: {
    fontSize: 11,
    color: '#b3b3b3',
    fontFamily: 'monospace',
  },
  diffContent: {
    backgroundColor: '#1a1a1a',
  },
  scrollViewContainer: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContentContainer: {
    flexGrow: 0,
  },
  diffLineContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  lineNumber: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#888888',
    backgroundColor: '#2d2d30',
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginRight: 8,
    minWidth: 40,
    textAlign: 'right',
  },
  diffContext: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#ffffff',
    lineHeight: 16,
    flex: 1,
  },
  diffAdded: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#4caf50',
    backgroundColor: '#1b5e20',
    lineHeight: 16,
    flex: 1,
  },
  diffRemoved: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#f44336',
    backgroundColor: '#4a1a1a',
    lineHeight: 16,
    flex: 1,
  },
  diffHeader: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#888888',
    fontWeight: 'bold',
    lineHeight: 16,
    flex: 1,
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
  diagnosticsContainer: {
    backgroundColor: '#663c00',
    padding: 8,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  diagnosticsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffcc02',
    marginBottom: 4,
  },
  diagnosticText: {
    fontSize: 11,
    color: '#ffcc02',
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  errorContainer: {
    backgroundColor: '#4a1a1a',
    padding: 8,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    fontFamily: 'monospace',
  },
})
