import * as SecureStore from 'expo-secure-store'

export interface Project {
  id: string
  name: string
  url: string
  authToken: string
  createdAt: number
  updatedAt: number
}

export interface QRCodeData {
  link: string
  auth: string
}

const PROJECTS_KEY = 'mobilecode_projects'

export const projectStorage = {
  async getProjects(): Promise<Project[]> {
    try {
      const stored = await SecureStore.getItemAsync(PROJECTS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load projects:', error)
      return []
    }
  },

  async saveProjects(projects: Project[]): Promise<void> {
    try {
      await SecureStore.setItemAsync(PROJECTS_KEY, JSON.stringify(projects))
    } catch (error) {
      console.error('Failed to save projects:', error)
      throw new Error('Failed to save projects')
    }
  },

  async addProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const projects = await this.getProjects()
    const now = Date.now()
    const newProject: Project = {
      ...projectData,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    }
    
    projects.push(newProject)
    await this.saveProjects(projects)
    return newProject
  },

  async updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'url' | 'authToken'>>): Promise<Project | null> {
    const projects = await this.getProjects()
    const projectIndex = projects.findIndex(p => p.id === id)
    
    if (projectIndex === -1) {
      return null
    }
    
    projects[projectIndex] = {
      ...projects[projectIndex],
      ...updates,
      updatedAt: Date.now()
    }
    
    await this.saveProjects(projects)
    return projects[projectIndex]
  },

  async deleteProject(id: string): Promise<boolean> {
    const projects = await this.getProjects()
    const filteredProjects = projects.filter(p => p.id !== id)
    
    if (filteredProjects.length === projects.length) {
      return false // Project not found
    }
    
    await this.saveProjects(filteredProjects)
    return true
  },

  async getProject(id: string): Promise<Project | null> {
    const projects = await this.getProjects()
    return projects.find(p => p.id === id) || null
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

export function validateQRCodeData(data: string): QRCodeData | null {
  try {
    const parsed = JSON.parse(data)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.link === 'string' &&
      typeof parsed.auth === 'string' &&
      parsed.link.trim() !== '' &&
      parsed.auth.trim() !== ''
    ) {
      return {
        link: parsed.link.trim(),
        auth: parsed.auth.trim()
      }
    }
    return null
  } catch {
    return null
  }
}