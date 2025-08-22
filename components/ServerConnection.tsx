import React, { useState } from 'react'
import { View, Text, Button, Alert } from 'react-native'
import { opencodeClient, getServerUrl, basicAuth } from '../lib/opencode'

export const ServerConnection = ({ onConnected }: {onConnected: () => void }) => {
  const serverUrl = getServerUrl()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  const testConnection = async () => {
    setIsConnecting(true)
    try {
      const appInfo = await opencodeClient.app.get({
        security: [basicAuth]
      })
      setIsConnected(true)
      Alert.alert('Connected!', `Connected to OpenCode at ${appInfo.data?.path.cwd}`)
      onConnected()
    } catch(err) {
      Alert.alert('Connection failed', 'Could not connect to OpenCode server')
      setIsConnected(false)
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <View style={{ padding: 20 }}>
      <Text>OpenCode Server URL: {serverUrl}</Text>
      <Button
        title={isConnecting ? "Connecting" : "Connect"}
        onPress={testConnection}
        disabled={isConnecting}
      />
      {isConnected && <Text style={{ color: 'green' }}>✓ Connected</Text>}
    </View>
  )
}
