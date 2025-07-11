import mongoose, { Schema, Document } from 'mongoose';
import { Project as IProject } from '../types';

// Extend the interface with Mongoose Document
export interface ProjectDocument extends Omit<IProject, 'id'>, Document {
  _id: string;
}

const ProjectSchema = new Schema<ProjectDocument>({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    minlength: 3,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  issuer: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  issueDate: {
    type: String,
    required: true
  },
  templatePdfPath: {
    type: String
  },
  qrCoordinates: {
    x: {
      type: Number,
      min: 0,
      max: 100
    },
    y: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  createdAt: {
    type: String,
    default: () => new Date().toISOString()
  },
  updatedAt: {
    type: String,
    default: () => new Date().toISOString()
  }
}, {
  timestamps: false, // We're managing timestamps manually to match existing format
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete (ret as any)._id;
      delete (ret as any).__v;
      return ret;
    }
  }
});

// Update the updatedAt field on save
ProjectSchema.pre('save', function(this: ProjectDocument) {
  this.updatedAt = new Date().toISOString();
});

// Create indexes for better performance
ProjectSchema.index({ name: 1 });
ProjectSchema.index({ issuer: 1 });
ProjectSchema.index({ createdAt: -1 });

export const ProjectModel = mongoose.model<ProjectDocument>('Project', ProjectSchema); 