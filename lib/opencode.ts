import { createOpencodeClient } from '@opencode-ai/sdk'
import { projectStorage, type Project } from './projectStorage'

export const getServerUrl = () => {
	// May choose another url based on env.
	return 'https://30991b94bf0b.ngrok-free.app'
}

// Bearer auth configuration
export const bearerAuth = {
	type: 'http' as const,
	scheme: 'bearer' as const
}

// Default client for backward compatibility
export const opencodeClient = createOpencodeClient({
	baseUrl: getServerUrl(),
	auth: 'user:password'
})

// Create client for a specific project
export function createProjectClient(project: Project) {
	return createOpencodeClient({
		baseUrl: project.url,
		auth: project.authToken
	})
}

// Get project client by ID
export async function getProjectClient(projectId: string) {
	const project = await projectStorage.getProject(projectId)
	if (!project) {
		throw new Error(`Project with ID ${projectId} not found`)
	}
	return createProjectClient(project)
}

// Get project URL by ID
export async function getProjectUrl(projectId: string) {
	const project = await projectStorage.getProject(projectId)
	return project ? project.url : getServerUrl()
}

// Get project auth token by ID
export async function getProjectAuthToken(projectId: string) {
	const project = await projectStorage.getProject(projectId)
	return project ? project.authToken : 'user:password'
}

// Get bearer auth for a project
export function getProjectBearerAuth() {
	return bearerAuth
}
