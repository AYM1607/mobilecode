import { createOpencodeClient } from '@opencode-ai/sdk'

export const getServerUrl = () => {
	// May choose another url based on env.
	return 'http://localhost:4096'
}

export const opencodeClient = createOpencodeClient({
	baseUrl: getServerUrl()
})
