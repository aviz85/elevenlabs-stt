# ElevenLabs Speech-to-Text Tester

A web application for testing ElevenLabs' speech-to-text API with full parameter support. The app allows you to transcribe audio files with various configuration options including language detection, diarization, and additional export formats.

## Features

- Upload audio files in various formats (mp3, wav, m4a, mp4, etc.)
- Configure all available speech-to-text parameters:
  - Language selection (default: Hebrew)
  - Speaker diarization (identify different speakers)
  - Audio event tagging (laughter, footsteps, etc.)
  - Timestamp granularity (none, word, character)
  - Export to additional formats (SRT, VTT)
- View and download transcription results
- RTL support for Hebrew transcriptions

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js with Express.js
- **Deployment**: Vercel

## Setup & Installation

1. Clone this repository
2. Install the required dependencies:
   ```
   npm install
   ```
3. Obtain an API key from [ElevenLabs](https://elevenlabs.io/)

## Running the App Locally

Start the development server:

```
npm run dev
```

For production:

```
npm start
```

## Deployment to Vercel

This project is configured for easy deployment to Vercel:

1. Install Vercel CLI:
   ```
   npm install -g vercel
   ```

2. Deploy to Vercel:
   ```
   vercel
   ```

You can also connect your GitHub repository to Vercel for automatic deployments.

## Environment Variables

You can set the following environment variables in your Vercel project:

- `PORT`: The port number for the server (default: 3000)

## API Endpoints

The application exposes a single API endpoint:

- `POST /api/transcribe`: Accepts audio files and transcription parameters

## Usage

1. Enter your ElevenLabs API key
2. Upload an audio or video file
3. Configure the transcription parameters:
   - Select the model
   - Set the language code (default is "heb" for Hebrew)
   - Choose timestamp granularity
   - Enable/disable diarization
   - Configure other parameters as needed
4. Click "Transcribe" to process the file
5. View the transcription results, word-level details, and any additional formats
6. Download the transcript in the available formats

## Notes

- The maximum file size for transcription is 100MB
- The API supports all major audio and video formats 