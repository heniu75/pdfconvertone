import express from 'express';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import compression from 'compression';
import cors from 'cors';
import { run } from './gemini';

dotenv.config({ path: '../.env' });

const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'https://textify-pdf-helper.lovable.app',
    'https://magical-pasca-4b7eba.netlify.app',
    'http://localhost:3000'
    ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: '*',
  credentials: true
};

// Apply CORS middleware before other middleware
app.use(cors(corsOptions));

const port = process.env.PORT || 3000;
const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.error('API_KEY environment variable is required');
  process.exit(1);
}

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure multer for PDF file uploads with disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const guid = uuidv4();
    const originalName = file.originalname;
    cb(null, `${guid}-${originalName}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit per file
    files: 1, // Maximum number of files
  },
  preservePath: true
});

// Middleware to check API key
const authenticateApiKey = (req: any, res: any, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(400).json({ error: 'No authentication token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (token !== apiKey) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }

  next();
};

// Apply authentication middleware to all routes
app.use(authenticateApiKey);

// Basic route
app.get('/', (req: express.Request, res: express.Response) => {
  res.json({ message: 'API is running' });
});

// Execute endpoint for PDF operations
app.post('/execute', 
  upload.fields([
    { name: 'inputFile', maxCount: 1 }
  ]),
  async (req: any, res: any) => {  // Note: added async
    let tempFilePath: string | null = null;

    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const action = req.body.action;

      // Validate required fields
      if (!files.inputFile || !action) {
        return res.status(400).json({ 
          error: 'Missing required fields. Please provide inputFile and action' 
        });
      }

      const inputFile = files.inputFile[0];
      tempFilePath = inputFile.path;

      // Call Gemini API and await response
      const responseJson = await run(tempFilePath);

      // Set proper headers for compression if not already set
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json');
      }

      res.json({
        message: 'File processed successfully',
        action: action,
        file: {
          originalname: inputFile.originalname,
          size: inputFile.size,
          path: inputFile.path,
          filename: inputFile.filename
        },
        responseJson: responseJson
      });

    } catch (error) {
      console.error('Error processing file:', error);
      res.status(500).json({ 
        error: 'Error processing file',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      // Cleanup: Remove temporary file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
          console.log(`Cleaned up temporary file: ${tempFilePath}`);
        } catch (cleanupError) {
          console.error('Error cleaning up temporary file:', cleanupError);
        }
      }
    }
  }
);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
