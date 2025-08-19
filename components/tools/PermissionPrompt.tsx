import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

interface PermissionPromptProps {
  onResponse: (response: 'accept' | 'reject' | 'accept_always') => void
}

export const PermissionPrompt: React.FC<PermissionPromptProps> = ({ onResponse }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Permission required to run this tool</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[styles.button, styles.acceptButton]} 
          onPress={() => onResponse('accept')}
        >
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.acceptAlwaysButton]} 
          onPress={() => onResponse('accept_always')}
        >
          <Text style={styles.acceptAlwaysText}>Always</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.rejectButton]} 
          onPress={() => onResponse('reject')}
        >
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ffeaa7',
    marginTop: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#28a745',
  },
  acceptAlwaysButton: {
    backgroundColor: '#17a2b8',
  },
  rejectButton: {
    backgroundColor: '#dc3545',
  },
  acceptText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  acceptAlwaysText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  rejectText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
})
