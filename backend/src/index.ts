import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';

import { connectDatabase } from './config/database';
import projectRoutes from './routes/projects';
import { WebSocketService } from './services/websocketService';

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server for WebSocket support
const server = createServer(app);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize MongoDB connection
const initializeApp = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();
    
    // Initialize WebSocket service
    const websocketService = new WebSocketService(server);
    console.log('✅ WebSocket service initialized');
    
    // Middleware
    app.use(helmet());
    app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }));

    app.use(morgan('combined'));
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP'
    });
    app.use(limiter);

    // Serve static files from uploads directory
    app.use('/uploads', express.static(uploadsDir));

    // Routes
    app.use('/api/projects', projectRoutes);

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ 
        success: true, 
        message: 'Certificate Issuance Portal API is running',
        database: 'MongoDB connected',
        websockets: 'Socket.IO enabled',
        timestamp: new Date().toISOString()
      });
    });

    // Error handling middleware
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
      });
    });

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Route not found'
      });
    });

    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📁 Uploads directory: ${uploadsDir}`);
      console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`🗄️  Database: MongoDB (Mongoose)`);
      console.log(`🔌 WebSockets: Socket.IO enabled`);
    });

  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    process.exit(1);
  }
};

// Start the application
initializeApp(); 