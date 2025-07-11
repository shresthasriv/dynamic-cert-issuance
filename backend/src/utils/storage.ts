import fs from 'fs';
import path from 'path';
import { Project } from '../types';

const DATA_DIR = path.join(__dirname, '../../../uploads/data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize projects file if it doesn't exist
if (!fs.existsSync(PROJECTS_FILE)) {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify([], null, 2));
}

export class ProjectStorage {
  static getAllProjects(): Project[] {
    try {
      const data = fs.readFileSync(PROJECTS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading projects:', error);
      return [];
    }
  }

  static getProjectById(id: string): Project | null {
    const projects = this.getAllProjects();
    return projects.find(p => p.id === id) || null;
  }

  static saveProject(project: Project): Project {
    const projects = this.getAllProjects();
    const existingIndex = projects.findIndex(p => p.id === project.id);
    
    if (existingIndex >= 0) {
      projects[existingIndex] = project;
    } else {
      projects.push(project);
    }

    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
    return project;
  }

  static deleteProject(id: string): boolean {
    const projects = this.getAllProjects();
    const filteredProjects = projects.filter(p => p.id !== id);
    
    if (filteredProjects.length !== projects.length) {
      fs.writeFileSync(PROJECTS_FILE, JSON.stringify(filteredProjects, null, 2));
      return true;
    }
    
    return false;
  }
} 