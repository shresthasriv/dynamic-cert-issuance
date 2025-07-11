import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Project, ApiResponse } from '../types';
import { ProjectService } from '../services/projectService';
import { BatchService } from '../services/batchService';

const router = express.Router();

// Configure multer for template PDFs
const templateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectId = req.params.id || 'temp';
    const uploadPath = path.join(__dirname, '../../../uploads/projects', projectId);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Keep original filename for template PDFs
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `template_${timestamp}${ext}`);
  }
});

const templateUpload = multer({
  storage: templateStorage,
  fileFilter: (req, file, cb) => {
    // Only allow PDF files for templates
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for certificate templates'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Configure multer for batch ZIP files
const batchStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectId = req.params.id;
    const uploadPath = path.join(__dirname, '../../../uploads/projects', projectId, 'batches');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `batch_${timestamp}${ext}`);
  }
});

const batchUpload = multer({
  storage: batchStorage,
  fileFilter: (req, file, cb) => {
    // Only allow ZIP files for batch uploads
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed for batch uploads'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for ZIP files
  }
});

// GET /api/projects - Get all projects
router.get('/', async (req, res) => {
  try {
    const { search, issuer } = req.query;
    
    let projects: Project[];
    
    if (search && typeof search === 'string') {
      projects = await ProjectService.searchProjects(search);
    } else if (issuer && typeof issuer === 'string') {
      projects = await ProjectService.getProjectsByIssuer(issuer);
    } else {
      projects = await ProjectService.getAllProjects();
    }
    
    const response: ApiResponse<Project[]> = {
      success: true,
      data: projects
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch projects'
    });
  }
});

// GET /api/projects/:id - Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const project = await ProjectService.getProjectById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const response: ApiResponse<Project> = {
      success: true,
      data: project
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch project'
    });
  }
});

// POST /api/projects - Create new project
router.post('/', async (req, res) => {
  try {
    const { name, description, issuer, issueDate } = req.body;

    // Validation
    if (!name || !issuer || !issueDate) {
      return res.status(400).json({
        success: false,
        error: 'Name, issuer, and issue date are required'
      });
    }

    // Validate issue date is not in the past
    const selectedDate = new Date(issueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      return res.status(400).json({
        success: false,
        error: 'Issue date cannot be in the past'
      });
    }

    const project = await ProjectService.createProject({
      name: name.trim(),
      description: description?.trim(),
      issuer: issuer.trim(),
      issueDate
    });

    const response: ApiResponse<Project> = {
      success: true,
      data: project,
      message: 'Project created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating project:', error);
    
    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create project'
    });
  }
});

// POST /api/projects/:id/template - Upload template PDF
router.post('/:id/template', templateUpload.single('template'), async (req, res) => {
  try {
    const project = await ProjectService.getProjectById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Template PDF file is required'
      });
    }

    // Update project with template path
    const templatePath = path.relative(
      path.join(__dirname, '../../../'),
      req.file.path
    );

    const updatedProject = await ProjectService.saveTemplatePath(req.params.id, templatePath);

    if (!updatedProject) {
      return res.status(404).json({
        success: false,
        error: 'Failed to update project'
      });
    }

    const response: ApiResponse<Project> = {
      success: true,
      data: updatedProject,
      message: 'Template PDF uploaded successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error uploading template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload template PDF'
    });
  }
});

// POST /api/projects/:id/batch - Upload batch ZIP file
router.post('/:id/batch', batchUpload.single('batchZip'), async (req, res) => {
  try {
    const project = await ProjectService.getProjectById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if project is ready for batch upload (has template and QR coordinates)
    if (!project.templatePdfPath || !project.qrCoordinates) {
      return res.status(400).json({
        success: false,
        error: 'Project must have template PDF and QR coordinates before uploading batch'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Batch ZIP file is required'
      });
    }

    // Process the ZIP file and validate contents
    const batch = await BatchService.processZipFile(req.params.id, req.file.path);

    const response: ApiResponse = {
      success: true,
      data: batch,
      message: batch.validationResults?.isValid 
        ? 'Batch ZIP processed successfully'
        : 'Batch ZIP processed with validation errors'
    };

    res.json(response);
  } catch (error) {
    console.error('Error processing batch ZIP:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process batch ZIP'
    });
  }
});

// GET /api/projects/:id/batches - Get all batches for a project
router.get('/:id/batches', async (req, res) => {
  try {
    const project = await ProjectService.getProjectById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const batches = await BatchService.getBatchesByProject(req.params.id);

    const response: ApiResponse = {
      success: true,
      data: batches
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch batches'
    });
  }
});

// GET /api/projects/:id/batches/:batchId - Get specific batch details
router.get('/:id/batches/:batchId', async (req, res) => {
  try {
    const batch = await BatchService.getBatchById(req.params.batchId);
    
    if (!batch || batch.projectId !== req.params.id) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    const response: ApiResponse = {
      success: true,
      data: batch
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching batch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch batch'
    });
  }
});

// PUT /api/projects/:id/coordinates - Save QR code coordinates
router.put('/:id/coordinates', async (req, res) => {
  try {
    const project = await ProjectService.getProjectById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const { x, y } = req.body;

    if (typeof x !== 'number' || typeof y !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Valid x and y coordinates are required'
      });
    }

    // Validate coordinate ranges
    if (x < 0 || x > 100 || y < 0 || y > 100) {
      return res.status(400).json({
        success: false,
        error: 'Coordinates must be between 0 and 100'
      });
    }

    const updatedProject = await ProjectService.saveCoordinates(req.params.id, { x, y });

    if (!updatedProject) {
      return res.status(404).json({
        success: false,
        error: 'Failed to update project'
      });
    }

    const response: ApiResponse<Project> = {
      success: true,
      data: updatedProject,
      message: 'QR coordinates saved successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error saving coordinates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save QR coordinates'
    });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await ProjectService.deleteProject(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Project deleted successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project'
    });
  }
});

export default router; 