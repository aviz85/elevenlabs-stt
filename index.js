const express = require('express');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Use the original file name
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max size
  fileFilter: function(req, file, cb) {
    // Accept audio and video files
    const filetypes = /mp3|wav|m4a|mp4|mpeg|mpga|webm/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only audio and video files are allowed!'));
    }
  }
});

// Route to serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to transcribe audio
app.post('/api/transcribe', upload.single('audioFile'), async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    // Extract parameters from the request
    const apiKey = req.body.apiKey;
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    // Read the file as binary data
    const fileData = fs.readFileSync(req.file.path);
    
    // Prepare multipart form data
    const formData = new URLSearchParams();
    
    // Add model ID
    formData.append('model_id', req.body.modelId || 'scribe_v1');
    
    // Add optional parameters if provided
    if (req.body.languageCode) {
      formData.append('language_code', req.body.languageCode);
    }
    
    // Boolean parameters
    const tagAudioEvents = req.body.tagAudioEvents === 'true';
    const diarize = req.body.diarize === 'true';
    const timestampsGranularity = req.body.timestampsGranularity || 'word';
    
    formData.append('tag_audio_events', tagAudioEvents);
    formData.append('diarize', diarize);
    
    // Add num_speakers if provided and greater than 1
    if (req.body.numSpeakers && parseInt(req.body.numSpeakers) > 1) {
      formData.append('num_speakers', parseInt(req.body.numSpeakers));
    }
    
    // Add timestamps_granularity if provided
    if (timestampsGranularity) {
      formData.append('timestamps_granularity', timestampsGranularity);
    }
    
    // Handle additional formats
    let additionalFormats = [];
    if (req.body.additionalFormats) {
      try {
        additionalFormats = JSON.parse(req.body.additionalFormats);
        if (additionalFormats.length > 0) {
          // Validate requirements for additional formats
          if (!diarize || timestampsGranularity === 'none') {
            return res.status(400).json({
              error: 'Invalid parameters',
              message: 'When using additional formats, diarization and timestamps must be enabled.',
              detail: {
                status: 'invalid_parameters',
                message: 'Requesting additional formats must have diarization and timestamps enabled.'
              }
            });
          }
          formData.append('additional_formats', JSON.stringify(additionalFormats));
        }
      } catch (e) {
        console.error('Error parsing additional formats:', e);
      }
    }

    console.log('Making API request with these params:');
    console.log('Model ID:', req.body.modelId || 'scribe_v1');
    console.log('Language Code:', req.body.languageCode || 'auto');
    console.log('Tag Audio Events:', req.body.tagAudioEvents === 'true');
    console.log('Diarize:', req.body.diarize === 'true');
    console.log('Number of Speakers:', req.body.numSpeakers || 'auto');
    console.log('Timestamps Granularity:', req.body.timestampsGranularity || 'word');
    console.log('Additional Formats:', additionalFormats.length > 0 ? JSON.stringify(additionalFormats) : 'none');

    // Create a boundary for the multipart form
    const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substr(2);
    
    // Build the multipart form manually
    let requestBody = '';
    
    // Add form fields
    for (const [key, value] of formData.entries()) {
      requestBody += `--${boundary}\r\n`;
      requestBody += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
      requestBody += `${value}\r\n`;
    }
    
    // Add the file
    requestBody += `--${boundary}\r\n`;
    requestBody += `Content-Disposition: form-data; name="file"; filename="${path.basename(req.file.path)}"\r\n`;
    requestBody += `Content-Type: ${req.file.mimetype}\r\n\r\n`;
    
    // Convert text part to buffer
    const textBuffer = Buffer.from(requestBody, 'utf-8');
    
    // Create buffer for closing boundary
    const closingBuffer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
    
    // Combine all buffers
    const requestBodyBuffer = Buffer.concat([
      textBuffer,
      fileData,
      closingBuffer
    ]);

    // Make API request to ElevenLabs
    const response = await axios.post(
      'https://api.elevenlabs.io/v1/speech-to-text', 
      requestBodyBuffer,
      {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'xi-api-key': apiKey,
        },
        params: {
          enable_logging: req.body.enableLogging === 'true'
        }
      }
    );

    // Delete the temporary file
    fs.unlinkSync(req.file.path);

    // Return the transcription result
    res.json(response.data);
    
  } catch (error) {
    console.error('Error during transcription:', error);
    
    // Delete the temporary file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }
    
    // Return appropriate error information
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const status = error.response.status;
      const errorData = error.response.data;
      
      // Special handling for common error codes
      if (status === 403) {
        return res.status(403).json({
          error: 'Authentication failed. Check your API key and account permissions.',
          details: errorData
        });
      } else if (status === 401) {
        return res.status(401).json({
          error: 'Unauthorized. Your API key is invalid.',
          details: errorData
        });
      }
      
      return res.status(status).json({
        error: 'API error',
        details: errorData
      });
    } else if (error.request) {
      // The request was made but no response was received
      return res.status(500).json({
        error: 'No response from ElevenLabs API. Please check your internet connection.'
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      return res.status(500).json({
        error: 'Transcription failed',
        message: error.message
      });
    }
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 