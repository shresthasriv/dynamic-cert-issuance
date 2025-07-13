import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
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

// Step 3: Certificate Issuance Routes

// POST /api/projects/:id/batches/:batchId/start-issuance - Start certificate issuance
router.post('/:id/batches/:batchId/start-issuance', async (req, res) => {
  try {
    const { CertificateIssuanceService } = await import('../services/certificateIssuanceService');
    const issuanceService = CertificateIssuanceService.getInstance();

    const project = await ProjectService.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const batch = await BatchService.getBatchById(req.params.batchId);
    if (!batch || batch.projectId !== req.params.id) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    if (batch.status === 'processing') {
      return res.status(400).json({
        success: false,
        error: 'Batch is already being processed'
      });
    }

    if (batch.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Batch has already been processed'
      });
    }

    if (!batch.validationResults?.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Cannot process invalid batch. Please fix validation errors first.'
      });
    }

    // Start processing in background
    issuanceService.startBatchProcessing(req.params.batchId).catch(error => {
      console.error('Background batch processing error:', error);
    });

    const response: ApiResponse = {
      success: true,
      message: 'Certificate issuance started successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error starting issuance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start certificate issuance'
    });
  }
});

// GET /api/projects/:id/certificates - Get all certificates for a project
router.get('/:id/certificates', async (req, res) => {
  try {
    const { CertificateIssuanceService } = await import('../services/certificateIssuanceService');
    const issuanceService = CertificateIssuanceService.getInstance();

    const project = await ProjectService.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const certificates = await issuanceService.getCertificatesByProject(req.params.id);

    const response: ApiResponse = {
      success: true,
      data: certificates
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch certificates'
    });
  }
});

// GET /api/projects/:id/batches/:batchId/certificates - Get certificates for a specific batch
router.get('/:id/batches/:batchId/certificates', async (req, res) => {
  try {
    const { CertificateIssuanceService } = await import('../services/certificateIssuanceService');
    const issuanceService = CertificateIssuanceService.getInstance();

    const batch = await BatchService.getBatchById(req.params.batchId);
    if (!batch || batch.projectId !== req.params.id) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    const certificates = await issuanceService.getCertificatesByBatch(req.params.batchId);

    const response: ApiResponse = {
      success: true,
      data: certificates
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching batch certificates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch batch certificates'
    });
  }
});

// GET /api/projects/:id/batches/:batchId/status - Get batch processing status
router.get('/:id/batches/:batchId/status', async (req, res) => {
  try {
    const { CertificateIssuanceService } = await import('../services/certificateIssuanceService');
    const issuanceService = CertificateIssuanceService.getInstance();

    const batch = await BatchService.getBatchById(req.params.batchId);
    if (!batch || batch.projectId !== req.params.id) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    const status = await issuanceService.getBatchStatus(req.params.batchId);

    const response: ApiResponse = {
      success: true,
      data: status
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching batch status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch batch status'
    });
  }
});

// POST /api/projects/:id/certificates/:certId/retry - Retry failed certificate
router.post('/:id/certificates/:certId/retry', async (req, res) => {
  try {
    const { CertificateIssuanceService } = await import('../services/certificateIssuanceService');
    const issuanceService = CertificateIssuanceService.getInstance();

    await issuanceService.retryCertificate(req.params.certId);

    const response: ApiResponse = {
      success: true,
      message: 'Certificate retry initiated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error retrying certificate:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retry certificate'
    });
  }
});

// POST /api/projects/:id/certificates/:certificateId/reissue - Reissue certificate
router.post('/:id/certificates/:certificateId/reissue', async (req, res) => {
  try {
    const { CertificateIssuanceService } = await import('../services/certificateIssuanceService');
    const issuanceService = CertificateIssuanceService.getInstance();
    
    const project = await ProjectService.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    await issuanceService.reissueCertificate(req.params.certificateId);

    const response: ApiResponse = {
      success: true,
      message: 'Certificate reissue initiated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error reissuing certificate:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reissue certificate'
    });
  }
});

// POST /api/projects/:id/certificates/:certificateId/republish - Republish certificate
router.post('/:id/certificates/:certificateId/republish', async (req, res) => {
  try {
    const { CertificateIssuanceService } = await import('../services/certificateIssuanceService');
    const issuanceService = CertificateIssuanceService.getInstance();
    
    const project = await ProjectService.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    await issuanceService.republishCertificate(req.params.certificateId);

    const response: ApiResponse = {
      success: true,
      message: 'Certificate republish initiated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error republishing certificate:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to republish certificate'
    });
  }
});

// POST /api/projects/:id/certificates/bulk-retry - Bulk retry certificates
router.post('/:id/certificates/bulk-retry', async (req, res) => {
  try {
    const { CertificateIssuanceService } = await import('../services/certificateIssuanceService');
    const issuanceService = CertificateIssuanceService.getInstance();
    const { certificateIds } = req.body;

    if (!Array.isArray(certificateIds) || certificateIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Certificate IDs array is required'
      });
    }

    const project = await ProjectService.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    await issuanceService.bulkRetryCertificates(certificateIds);

    const response: ApiResponse = {
      success: true,
      message: `Bulk retry initiated for ${certificateIds.length} certificates`
    };

    res.json(response);
  } catch (error) {
    console.error('Error with bulk retry:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retry certificates'
    });
  }
});

// POST /api/projects/:id/certificates/bulk-reissue - Bulk reissue certificates
router.post('/:id/certificates/bulk-reissue', async (req, res) => {
  try {
    const { CertificateIssuanceService } = await import('../services/certificateIssuanceService');
    const issuanceService = CertificateIssuanceService.getInstance();
    const { certificateIds } = req.body;

    if (!Array.isArray(certificateIds) || certificateIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Certificate IDs array is required'
      });
    }

    const project = await ProjectService.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    await issuanceService.bulkReissueCertificates(certificateIds);

    const response: ApiResponse = {
      success: true,
      message: `Bulk reissue initiated for ${certificateIds.length} certificates`
    };

    res.json(response);
  } catch (error) {
    console.error('Error with bulk reissue:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reissue certificates'
    });
  }
});

// GET /api/projects/:id/batches/:batchId/download - Download all certificates as ZIP
router.get('/:id/batches/:batchId/download', async (req, res) => {
  try {
    const { CertificateIssuanceService } = await import('../services/certificateIssuanceService');
    const issuanceService = CertificateIssuanceService.getInstance();
    
    const project = await ProjectService.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const batch = await BatchService.getBatchById(req.params.batchId);
    if (!batch || batch.projectId !== req.params.id) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    // Get all issued certificates for this batch
    const certificates = await issuanceService.getCertificatesByBatch(req.params.batchId);
    const issuedCertificates = certificates.filter((cert: any) => cert.status === 'issued' && cert.issuedPdfPath);

    if (issuedCertificates.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No issued certificates found for download'
      });
    }

    // Set response headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${batch.name}_certificates.zip"`);

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to create ZIP archive'
        });
      }
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add certificates to archive
    for (const cert of issuedCertificates) {
      const filePath = path.join(__dirname, '../../../', cert.issuedPdfPath!);
      
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: `${cert.certificateId}.pdf` });
      } else {
        console.warn(`Certificate file not found: ${filePath}`);
      }
    }

    // Add a summary file
    const summaryContent = `Certificate Batch Summary
========================

Project: ${project.name}
Batch: ${batch.name}
Total Certificates: ${issuedCertificates.length}
Generated: ${new Date().toISOString()}

Certificate List:
${issuedCertificates.map((cert: any) => `- ${cert.certificateId} (${cert.filename})`).join('\n')}
`;

    archive.append(summaryContent, { name: 'batch_summary.txt' });

    // Finalize the archive
    archive.finalize();

  } catch (error) {
    console.error('Error downloading certificates:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to download certificates'
      });
    }
  }
});

export default router; 