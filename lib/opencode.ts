import { createOpencodeClient } from '@opencode-ai/sdk'

export const getServerUrl = () => {
	// May choose another url based on env.
	return 'https://30991b94bf0b.ngrok-free.app'
}

// Basic auth configuration
export const basicAuth = {
	type: 'http' as const,
	scheme: 'basic' as const
}

export const opencodeClient = createOpencodeClient({
	baseUrl: getServerUrl(),
	auth: 'user:password'
})
