import { useState, useEffect } from 'react'
import { opencodeClient, basicAuth } from '@/lib/opencode'
import type { Provider } from '@opencode-ai/sdk'

export const useProviders = () => {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const providersData = await opencodeClient.config.providers({
          security: [basicAuth]
        })
        setProviders(providersData.data!.providers)
      } catch (error) {
        console.error('Failed to load providers:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProviders()
  }, [])

  return { providers, loading }
}
