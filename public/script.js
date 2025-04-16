document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const apiKeyInput = document.getElementById('apiKey');
    const toggleApiKeyBtn = document.getElementById('toggleApiKey');
    const fileInput = document.getElementById('fileInput');
    const browseButton = document.getElementById('browseButton');
    const dropArea = document.getElementById('dropArea');
    const filePreview = document.getElementById('filePreview');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const removeFileBtn = document.getElementById('removeFile');
    const transcribeBtn = document.getElementById('transcribeButton');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const resultsSection = document.getElementById('resultsSection');
    const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
    const errorMessage = document.getElementById('errorMessage');
    const errorDetails = document.getElementById('errorDetails');
    const errorDetailsText = document.getElementById('errorDetailsText');
    
    // Form elements
    const modelIdSelect = document.getElementById('modelId');
    const languageCodeInput = document.getElementById('languageCode');
    const tagAudioEventsCheck = document.getElementById('tagAudioEvents');
    const diarizeCheck = document.getElementById('diarize');
    const enableLoggingCheck = document.getElementById('enableLogging');
    const numSpeakersInput = document.getElementById('numSpeakers');
    const timestampsGranularitySelect = document.getElementById('timestampsGranularity');
    const fileFormatSelect = document.getElementById('fileFormat');
    
    // Format checkboxes
    const formatCheckboxes = document.querySelectorAll('.format-checkbox');
    
    // Result elements
    const detectedLanguage = document.getElementById('detectedLanguage');
    const languageProbability = document.getElementById('languageProbability');
    const transcriptText = document.getElementById('transcriptText');
    const wordDetailsSection = document.getElementById('wordDetailsSection');
    const wordDetailsTable = document.getElementById('wordDetailsTable');
    const additionalFormatsSection = document.getElementById('additionalFormatsSection');
    const additionalFormatsContent = document.getElementById('additionalFormatsContent');
    const rawResponseData = document.getElementById('rawResponseData');
    
    let selectedFile = null;
    
    // Toggle API Key visibility
    toggleApiKeyBtn.addEventListener('click', function() {
        const type = apiKeyInput.type === 'password' ? 'text' : 'password';
        apiKeyInput.type = type;
        toggleApiKeyBtn.innerHTML = type === 'password' ? 
            '<i class="bi bi-eye"></i>' : 
            '<i class="bi bi-eye-slash"></i>';
    });
    
    // Validate API Key
    apiKeyInput.addEventListener('input', updateTranscribeButton);
    
    // File input setup
    browseButton.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });
    
    // Format checkbox handling
    formatCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const format = this.dataset.format;
            const configDiv = document.getElementById(`${format}Config`);
            
            if (configDiv) {
                if (this.checked) {
                    configDiv.classList.remove('d-none');
                } else {
                    configDiv.classList.add('d-none');
                }
            }
        });
    });
    
    // Handle file drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.add('dragover');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.remove('dragover');
        }, false);
    });
    
    dropArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        
        if (file && isAudioOrVideoFile(file)) {
            handleFileSelection(file);
        } else {
            showError('Invalid file type', 'Please upload an audio or video file (MP3, WAV, M4A, MP4, etc.)');
        }
    });
    
    // Remove selected file
    removeFileBtn.addEventListener('click', () => {
        selectedFile = null;
        fileInput.value = '';
        filePreview.classList.add('d-none');
        updateTranscribeButton();
    });
    
    // Handle file selection
    function handleFileSelection(file) {
        if (!isAudioOrVideoFile(file)) {
            showError('Invalid file type', 'Please upload an audio or video file (MP3, WAV, M4A, MP4, etc.)');
            return;
        }
        
        if (file.size > 100 * 1024 * 1024) { // 100MB limit
            showError('File too large', 'Maximum file size is 100MB');
            return;
        }
        
        selectedFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        filePreview.classList.remove('d-none');
        updateTranscribeButton();
    }
    
    // Check if file is audio or video
    function isAudioOrVideoFile(file) {
        const fileType = file.type.toLowerCase();
        return fileType.startsWith('audio/') || fileType.startsWith('video/');
    }
    
    // Format file size for display
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' bytes';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    }
    
    // Update transcribe button state
    function updateTranscribeButton() {
        const hasApiKey = apiKeyInput.value.trim() !== '';
        const hasFile = selectedFile !== null;
        
        transcribeBtn.disabled = !(hasApiKey && hasFile);
    }
    
    // Gather format configurations
    function getAdditionalFormats() {
        const formats = [];
        
        // Process each checked format
        formatCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const format = checkbox.dataset.format;
                const formatConfig = { format };
                
                // Build the configuration based on format type
                switch (format) {
                    case 'txt':
                        addCommonFormatOptions(formatConfig, 'txt');
                        addMaxCharsOption(formatConfig, 'txt');
                        break;
                    case 'srt':
                        addCommonFormatOptions(formatConfig, 'srt');
                        addMaxCharsOption(formatConfig, 'srt');
                        break;
                    case 'docx':
                    case 'html':
                    case 'pdf':
                        addCommonFormatOptions(formatConfig, format);
                        break;
                    case 'segmented_json':
                        addSegmentOptions(formatConfig, 'segmentedJson');
                        break;
                    case 'vtt':
                        // Simple format without additional options
                        break;
                }
                
                formats.push(formatConfig);
            }
        });
        
        return formats;
    }
    
    // Helper function to add common format options
    function addCommonFormatOptions(config, idPrefix) {
        // Include speakers option
        const includeSpeakersElement = document.getElementById(`${idPrefix}IncludeSpeakers`);
        if (includeSpeakersElement && includeSpeakersElement.parentElement.classList.contains('form-check')) {
            config.include_speakers = includeSpeakersElement.checked;
        }
        
        // Include timestamps option
        const includeTimestampsElement = document.getElementById(`${idPrefix}IncludeTimestamps`);
        if (includeTimestampsElement && includeTimestampsElement.parentElement.classList.contains('form-check')) {
            config.include_timestamps = includeTimestampsElement.checked;
        }
        
        // Add segmentation options
        addSegmentOptions(config, idPrefix);
    }
    
    // Helper function to add max chars per line option
    function addMaxCharsOption(config, idPrefix) {
        const maxCharsElement = document.getElementById(`${idPrefix}MaxCharsPerLine`);
        if (maxCharsElement && maxCharsElement.value) {
            config.max_characters_per_line = parseInt(maxCharsElement.value);
        }
    }
    
    // Helper function to add segmentation options
    function addSegmentOptions(config, idPrefix) {
        // Max segment chars
        const maxSegmentCharsElement = document.getElementById(`${idPrefix}MaxSegmentChars`);
        if (maxSegmentCharsElement && maxSegmentCharsElement.value) {
            config.max_segment_chars = parseInt(maxSegmentCharsElement.value);
        }
        
        // Max segment duration
        const maxSegmentDurationElement = document.getElementById(`${idPrefix}MaxSegmentDuration`);
        if (maxSegmentDurationElement && maxSegmentDurationElement.value) {
            config.max_segment_duration_s = parseFloat(maxSegmentDurationElement.value);
        }
        
        // Segment on silence longer than
        const segmentOnSilenceElement = document.getElementById(`${idPrefix}SegmentOnSilence`);
        if (segmentOnSilenceElement && segmentOnSilenceElement.value) {
            config.segment_on_silence_longer_than_s = parseFloat(segmentOnSilenceElement.value);
        }
    }
    
    // Transcribe button click handler
    transcribeBtn.addEventListener('click', async () => {
        // Hide any previous results
        resultsSection.classList.add('d-none');
        
        // Show loading overlay
        loadingOverlay.classList.remove('d-none');
        
        // Get additional formats with their configurations
        const additionalFormats = getAdditionalFormats();
        
        // Create form data
        const formData = new FormData();
        formData.append('apiKey', apiKeyInput.value);
        formData.append('audioFile', selectedFile);
        formData.append('modelId', modelIdSelect.value);
        formData.append('languageCode', languageCodeInput.value);
        formData.append('tagAudioEvents', tagAudioEventsCheck.checked);
        formData.append('diarize', diarizeCheck.checked);
        formData.append('enableLogging', enableLoggingCheck.checked);
        formData.append('numSpeakers', numSpeakersInput.value);
        formData.append('timestampsGranularity', timestampsGranularitySelect.value);
        formData.append('fileFormat', fileFormatSelect.value);
        formData.append('additionalFormats', JSON.stringify(additionalFormats));
        
        try {
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            // Hide loading overlay
            loadingOverlay.classList.add('d-none');
            
            if (!response.ok) {
                // Handle API errors
                showError(
                    data.error || `Error: ${response.status}`, 
                    data.message || 'Transcription failed', 
                    data.details
                );
                return;
            }
            
            // Display results
            displayResults(data);
            
        } catch (error) {
            // Hide loading overlay
            loadingOverlay.classList.add('d-none');
            
            // Show error
            showError(
                'Connection Error', 
                'Failed to connect to the server. Please check your internet connection.',
                error
            );
        }
    });
    
    // Display transcription results
    function displayResults(data) {
        // Set language info
        detectedLanguage.textContent = data.language_code || 'N/A';
        languageProbability.textContent = 
            data.language_probability ? `${(data.language_probability * 100).toFixed(2)}%` : 'N/A';
        
        // Set transcript text
        transcriptText.textContent = data.text || 'No transcript available';
        
        // Check if text is in Hebrew or another RTL language
        if (data.language_code === 'heb' || data.language_code === 'ar') {
            transcriptText.setAttribute('dir', 'rtl');
        } else {
            transcriptText.removeAttribute('dir');
        }
        
        // Word details
        if (data.words && data.words.length > 0) {
            const wordData = data.words.filter(word => word.type === 'word');
            
            if (wordData.length > 0) {
                wordDetailsTable.innerHTML = '';
                
                wordData.forEach(word => {
                    const row = document.createElement('tr');
                    
                    const wordCell = document.createElement('td');
                    wordCell.textContent = word.text;
                    if (data.language_code === 'heb' || data.language_code === 'ar') {
                        wordCell.setAttribute('dir', 'rtl');
                    }
                    
                    const startCell = document.createElement('td');
                    startCell.textContent = word.start ? `${word.start.toFixed(2)}s` : 'N/A';
                    
                    const endCell = document.createElement('td');
                    endCell.textContent = word.end ? `${word.end.toFixed(2)}s` : 'N/A';
                    
                    const speakerCell = document.createElement('td');
                    speakerCell.textContent = word.speaker_id || 'N/A';
                    
                    row.appendChild(wordCell);
                    row.appendChild(startCell);
                    row.appendChild(endCell);
                    row.appendChild(speakerCell);
                    
                    wordDetailsTable.appendChild(row);
                });
                
                wordDetailsSection.classList.remove('d-none');
            } else {
                wordDetailsSection.classList.add('d-none');
            }
        } else {
            wordDetailsSection.classList.add('d-none');
        }
        
        // Additional formats
        if (data.additional_formats && data.additional_formats.length > 0) {
            additionalFormatsContent.innerHTML = '';
            
            data.additional_formats.forEach(format => {
                const formatName = format.requested_format || format.format || 'Unknown';
                const formatContent = format.content || '';
                const fileExtension = format.file_extension || formatName;
                
                const formatContainer = document.createElement('div');
                formatContainer.className = 'format-container';
                
                const formatTitle = document.createElement('h6');
                formatTitle.textContent = formatName.toUpperCase();
                formatContainer.appendChild(formatTitle);
                
                const formatTextArea = document.createElement('textarea');
                formatTextArea.className = 'form-control mb-2';
                formatTextArea.rows = 5;
                formatTextArea.readOnly = true;
                formatTextArea.value = formatContent;
                formatContainer.appendChild(formatTextArea);
                
                const downloadButton = document.createElement('button');
                downloadButton.className = 'btn btn-sm btn-outline-primary';
                downloadButton.innerHTML = `<i class="bi bi-download me-1"></i>Download ${formatName.toUpperCase()}`;
                downloadButton.addEventListener('click', () => {
                    let content = formatContent;
                    
                    // Handle base64 encoded content
                    if (format.is_base64_encoded) {
                        try {
                            content = atob(content);
                        } catch (e) {
                            console.error('Failed to decode base64 content:', e);
                        }
                    }
                    
                    // Determine the appropriate MIME type for the download
                    let mimeType = format.content_type || 'text/plain';
                    if (formatName === 'docx') {
                        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                    } else if (formatName === 'pdf') {
                        mimeType = 'application/pdf';
                    } else if (formatName === 'html') {
                        mimeType = 'text/html';
                    } else if (formatName === 'segmented_json') {
                        mimeType = 'application/json';
                    }
                    
                    downloadTextFile(content, `transcript.${fileExtension}`, mimeType, format.is_base64_encoded);
                });
                formatContainer.appendChild(downloadButton);
                
                additionalFormatsContent.appendChild(formatContainer);
            });
            
            additionalFormatsSection.classList.remove('d-none');
        } else {
            additionalFormatsSection.classList.add('d-none');
        }
        
        // Raw JSON response
        rawResponseData.textContent = JSON.stringify(data, null, 2);
        
        // Show results section
        resultsSection.classList.remove('d-none');
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Download text file
    function downloadTextFile(content, filename, mimeType = 'text/plain', isBase64 = false) {
        let blob;
        
        if (isBase64) {
            // For binary formats that come as base64 (PDF, DOCX)
            const byteCharacters = atob(content);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            blob = new Blob([byteArray], { type: mimeType });
        } else {
            // For text-based formats
            blob = new Blob([content], { type: mimeType });
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Show error modal
    function showError(title, message, details) {
        errorMessage.textContent = message;
        
        if (details) {
            try {
                if (typeof details === 'object') {
                    errorDetailsText.textContent = JSON.stringify(details, null, 2);
                } else {
                    errorDetailsText.textContent = details;
                }
                errorDetails.classList.remove('d-none');
            } catch (e) {
                errorDetails.classList.add('d-none');
            }
        } else {
            errorDetails.classList.add('d-none');
        }
        
        document.querySelector('#errorModal .modal-title').innerHTML = 
            `<i class="bi bi-exclamation-triangle me-2"></i>${title}`;
        
        errorModal.show();
    }
}); 