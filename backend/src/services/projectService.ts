import { ProjectModel, ProjectDocument } from '../models/Project';
import { BatchModel } from '../models/Batch';
import { CertificateModel } from '../models/Certificate';
import { Project } from '../types';
import fs from 'fs';
import path from 'path';

export class ProjectService {
  /**
   * Get all projects
   */
  static async getAllProjects(): Promise<Project[]> {
    try {
      const projects = await ProjectModel.find().sort({ createdAt: -1 }).lean();
      return projects.map(this.transformDocument);
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw new Error('Failed to fetch projects');
    }
  }

  /**
   * Get project by ID
   */
  static async getProjectById(id: string): Promise<Project | null> {
    try {
      const project = await ProjectModel.findById(id).lean();
      return project ? this.transformDocument(project) : null;
    } catch (error) {
      console.error('Error fetching project:', error);
      throw new Error('Failed to fetch project');
    }
  }

  /**
   * Create new project
   */
  static async createProject(projectData: {
    name: string;
    description?: string;
    issuer: string;
    issueDate: string;
  }): Promise<Project> {
    try {
      // Check if project name already exists
      const existingProject = await ProjectModel.findOne({ 
        name: { $regex: new RegExp(`^${projectData.name}$`, 'i') }
      });
      
      if (existingProject) {
        throw new Error('A project with this name already exists');
      }

      const project = new ProjectModel(projectData);
      const savedProject = await project.save();
      return this.transformDocument(savedProject.toObject());
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        throw error;
      }
      console.error('Error creating project:', error);
      throw new Error('Failed to create project');
    }
  }

  /**
   * Update project
   */
  static async updateProject(id: string, updateData: Partial<Project>): Promise<Project | null> {
    try {
      const project = await ProjectModel.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date().toISOString() },
        { new: true, runValidators: true }
      ).lean();
      
      return project ? this.transformDocument(project) : null;
    } catch (error) {
      console.error('Error updating project:', error);
      throw new Error('Failed to update project');
    }
  }

  /**
   * Save template PDF path
   */
  static async saveTemplatePath(id: string, templatePath: string): Promise<Project | null> {
    return this.updateProject(id, { templatePdfPath: templatePath });
  }

  /**
   * Save QR coordinates
   */
  static async saveCoordinates(
    id: string, 
    coordinates: { x: number; y: number }
  ): Promise<Project | null> {
    return this.updateProject(id, { qrCoordinates: coordinates });
  }

  /**
   * Delete project and all associated data
   */
  static async deleteProject(id: string): Promise<boolean> {
    try {
      // Get the project first to check if it exists
      const project = await ProjectModel.findById(id).lean();
      if (!project) {
        return false;
      }

      // Delete all certificates associated with this project
      await CertificateModel.deleteMany({ projectId: id });

      // Delete all batches associated with this project
      await BatchModel.deleteMany({ projectId: id });

      // Delete project files and directories
      const projectUploadDir = path.join(__dirname, '../../../uploads/projects', id);
      if (fs.existsSync(projectUploadDir)) {
        try {
          fs.rmSync(projectUploadDir, { recursive: true, force: true });
          console.log(`Deleted project files: ${projectUploadDir}`);
        } catch (fileError) {
          console.error(`Error deleting project files: ${fileError}`);
          // Continue with database deletion even if file deletion fails
        }
      }

      // Finally, delete the project itself
      const result = await ProjectModel.findByIdAndDelete(id);
      
      console.log(`Project ${id} and all associated data deleted successfully`);
      return !!result;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw new Error('Failed to delete project');
    }
  }

  /**
   * Get projects by issuer
   */
  static async getProjectsByIssuer(issuer: string): Promise<Project[]> {
    try {
      const projects = await ProjectModel.find({ issuer }).sort({ createdAt: -1 }).lean();
      return projects.map(this.transformDocument);
    } catch (error) {
      console.error('Error fetching projects by issuer:', error);
      throw new Error('Failed to fetch projects by issuer');
    }
  }

  /**
   * Search projects by name
   */
  static async searchProjects(searchTerm: string): Promise<Project[]> {
    try {
      const projects = await ProjectModel.find({
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { issuer: { $regex: searchTerm, $options: 'i' } }
        ]
      }).sort({ createdAt: -1 }).lean();
      
      return projects.map(this.transformDocument);
    } catch (error) {
      console.error('Error searching projects:', error);
      throw new Error('Failed to search projects');
    }
  }

  /**
   * Transform MongoDB document to Project interface
   */
  private static transformDocument(doc: any): Project {
    return {
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
      issuer: doc.issuer,
      issueDate: doc.issueDate,
      templatePdfPath: doc.templatePdfPath,
      qrCoordinates: doc.qrCoordinates,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
} 