/**
 * ElevenLabs API client-side implementation
 * Handles direct API calls to ElevenLabs from the browser
 */

class ElevenLabsClient {
  constructor() {
    this.apiBaseUrl = 'https://api.elevenlabs.io/v1';
  }

  /**
   * Transcribe audio directly to ElevenLabs API
   * @param {File} audioFile - The audio file to transcribe
   * @param {String} apiKey - ElevenLabs API key
   * @param {Object} params - Transcription parameters
   * @param {Array} additionalFormats - Additional format configurations
   * @returns {Promise} - Promise resolving to transcription result
   */
  async transcribeAudio(audioFile, apiKey, params, additionalFormats = []) {
    try {
      // Create FormData object
      const formData = new FormData();
      
      // Add the file
      formData.append('file', audioFile);
      
      // Add parameters
      formData.append('model_id', params.modelId || 'scribe_v1');
      
      if (params.languageCode) {
        formData.append('language_code', params.languageCode);
      }
      
      formData.append('tag_audio_events', params.tagAudioEvents);
      formData.append('diarize', params.diarize);
      
      if (params.numSpeakers && parseInt(params.numSpeakers) > 1) {
        formData.append('num_speakers', parseInt(params.numSpeakers));
      }
      
      if (params.timestampsGranularity) {
        formData.append('timestamps_granularity', params.timestampsGranularity);
      }
      
      // Add additional formats if provided
      if (additionalFormats && additionalFormats.length > 0) {
        formData.append('additional_formats', JSON.stringify(additionalFormats));
      }
      
      // Make API request directly to ElevenLabs
      const response = await fetch(`${this.apiBaseUrl}/speech-to-text`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey
        },
        body: formData
      });
      
      // Check if response is ok
      if (!response.ok) {
        // Handle API error
        const errorData = await response.json();
        throw {
          status: response.status,
          data: errorData
        };
      }
      
      // Return the transcription data
      return await response.json();
      
    } catch (error) {
      console.error('Error during client-side transcription:', error);
      throw error;
    }
  }
  
  /**
   * Validate API key and check user's speech-to-text quota
   * @param {String} apiKey - ElevenLabs API key
   * @returns {Promise} - Promise resolving to validation result
   */
  async validateApiKey(apiKey) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/user/subscription`, {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey
        }
      });
      
      if (!response.ok) {
        throw new Error('Invalid API key or access denied');
      }
      
      const data = await response.json();
      
      // Check if user has speech-to-text access
      const hasSTTAccess = data.tier && data.available_models && 
        data.available_models.some(model => model.model_id.includes('scribe'));
      
      return {
        valid: true,
        hasSTTAccess: hasSTTAccess,
        quota: data.character_count,
        tierName: data.tier
      };
      
    } catch (error) {
      console.error('Error validating API key:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }
} 