import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { ToolPart } from './ToolRenderer'
import { PermissionPrompt } from './PermissionPrompt'

interface BashToolProps {
  part: ToolPart
  onPermissionResponse?: (callID: string, response: 'accept' | 'reject' | 'accept_always') => void
  requiresPermission?: boolean
}

export const BashTool: React.FC<BashToolProps> = ({ 
  part, 
  onPermissionResponse,
  requiresPermission = false 
}) => {
  const [expanded, setExpanded] = useState(false)
  
  const input = part.state.input || {}
  const metadata = part.state.metadata || {}
  const command = input.command || ''
  const description = input.description || ''
  const stdout = metadata.stdout || ''
  const stderr = metadata.stderr || ''
  
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
    if (description && part.state.status === 'pending') {
      return description
    }
    
    switch (part.state.status) {
      case 'completed': return 'Command completed'
      case 'error': return 'Command failed'
      case 'running': return 'Running command...'
      case 'pending': return 'Preparing command...'
      default: return 'Bash'
    }
  }

  const handlePermissionResponse = (response: 'accept' | 'reject' | 'accept_always') => {
    if (onPermissionResponse && part.callID) {
      onPermissionResponse(part.callID, response)
    }
  }

  const truncateOutput = (text: string, maxLines: number = 15) => {
    if (!text) return ''
    const lines = text.split('\n')
    if (lines.length <= maxLines) return text
    return lines.slice(0, maxLines).join('\n') + '\n... (truncated)'
  }

  const renderOutput = () => {
    const hasOutput = stdout || stderr
    if (!hasOutput) return null

    const displayStdout = expanded ? stdout : truncateOutput(stdout)
    const displayStderr = expanded ? stderr : truncateOutput(stderr)
    const totalLines = (stdout.split('\n').length - 1) + (stderr.split('\n').length - 1)

    return (
      <View style={styles.outputContainer}>
        <View style={styles.outputHeader}>
          <Text style={styles.outputTitle}>Output</Text>
          {totalLines > 15 && (
            <TouchableOpacity onPress={() => setExpanded(!expanded)}>
              <Text style={styles.expandText}>
                {expanded ? 'Show less' : `${totalLines} lines`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        <ScrollView style={styles.outputContent} horizontal={true}>
          <View>
            {displayStdout && (
              <Text style={styles.stdoutText}>{displayStdout}</Text>
            )}
            {displayStderr && (
              <>
                {displayStdout && <Text>{'\n'}</Text>}
                <Text style={styles.stderrText}>{displayStderr}</Text>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    )
  }

  const renderCommand = () => {
    if (!command) return null

    return (
      <View style={styles.commandContainer}>
        <View style={styles.commandHeader}>
          <Text style={styles.commandPrompt}>$</Text>
          <ScrollView horizontal={true} style={styles.commandScroll}>
            <Text style={styles.commandText}>{command}</Text>
          </ScrollView>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { borderLeftColor: getStatusColor() }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.toolIcon}>💻</Text>
          <View style={styles.titleInfo}>
            <Text style={styles.toolTitle}>{getStatusText()}</Text>
            {description && description !== getStatusText() && (
              <Text style={styles.description}>{description}</Text>
            )}
          </View>
        </View>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
      </View>

      {renderCommand()}
      {renderOutput()}

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
  titleInfo: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  commandContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  commandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#212529',
    padding: 8,
  },
  commandPrompt: {
    color: '#28a745',
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
  },
  commandScroll: {
    flex: 1,
  },
  commandText: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  outputContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  outputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  outputTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#495057',
  },
  expandText: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '500',
  },
  outputContent: {
    backgroundColor: '#212529',
    padding: 12,
    maxHeight: 300,
  },
  stdoutText: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 16,
  },
  stderrText: {
    color: '#ff6b6b',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 16,
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
