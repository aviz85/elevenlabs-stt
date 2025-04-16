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
    const toggleWordDetailsBtn = document.getElementById('toggleWordDetails');
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
    
    // Toggle Word Details visibility
    toggleWordDetailsBtn.addEventListener('click', function() {
        const isHidden = wordDetailsSection.classList.contains('d-none');
        if (isHidden) {
            wordDetailsSection.classList.remove('d-none');
            toggleWordDetailsBtn.innerHTML = '<i class="bi bi-eye-slash"></i> Hide Details';
        } else {
            wordDetailsSection.classList.add('d-none');
            toggleWordDetailsBtn.innerHTML = '<i class="bi bi-eye"></i> Show Details';
        }
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
            
            // Check if any format is selected
            const anyFormatSelected = Array.from(formatCheckboxes).some(cb => cb.checked);
            
            // Auto-enable diarize and timestamps when formats are selected
            if (anyFormatSelected) {
                // Enable diarization if not already enabled
                if (!diarizeCheck.checked) {
                    diarizeCheck.checked = true;
                    // Add a highlight effect to show it was auto-enabled
                    diarizeCheck.parentElement.classList.add('highlight-change');
                    setTimeout(() => {
                        diarizeCheck.parentElement.classList.remove('highlight-change');
                    }, 2000);
                }
                
                // Ensure timestamps granularity is not "none"
                if (timestampsGranularitySelect.value === "none") {
                    timestampsGranularitySelect.value = "word";
                    // Add a highlight effect to show it was auto-changed
                    timestampsGranularitySelect.classList.add('highlight-change');
                    setTimeout(() => {
                        timestampsGranularitySelect.classList.remove('highlight-change');
                    }, 2000);
                }
                
                // Show notice if it doesn't exist yet
                if (!document.getElementById('formatRequirementsNotice')) {
                    const notice = document.createElement('div');
                    notice.id = 'formatRequirementsNotice';
                    notice.className = 'alert alert-info mt-3';
                    notice.innerHTML = '<i class="bi bi-info-circle-fill me-2"></i> <strong>Note:</strong> When using additional formats, diarization and timestamps must be enabled.';
                    
                    // Find the formats card
                    const headings = document.querySelectorAll('.card-header h5');
                    let formatsCard = null;
                    headings.forEach(heading => {
                        if (heading.textContent.includes('Additional Export Formats')) {
                            formatsCard = heading.closest('.card');
                        }
                    });
                    
                    if (formatsCard) {
                        formatsCard.appendChild(notice);
                    }
                }
            } else {
                // Remove the notice if no formats are selected
                const notice = document.getElementById('formatRequirementsNotice');
                if (notice) {
                    notice.remove();
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
        // Hide loading overlay
        loadingOverlay.classList.add('d-none');
        
        // Show results section
        resultsSection.classList.remove('d-none');
        
        // Set detected language
        if (data.detected_language) {
            detectedLanguage.textContent = getLanguageName(data.detected_language.language_code) || data.detected_language.language_code;
            languageProbability.textContent = (data.detected_language.probability * 100).toFixed(2) + '%';
        } else {
            detectedLanguage.textContent = 'Not available';
            languageProbability.textContent = 'N/A';
        }
        
        // Set transcript text
        if (data.text) {
            transcriptText.textContent = data.text;
            
            // Handle RTL languages (Hebrew, Arabic, etc.)
            if (data.detected_language && ['he', 'heb', 'ar', 'ara'].includes(data.detected_language.language_code)) {
                transcriptText.dir = 'rtl';
            } else {
                transcriptText.dir = 'ltr';
            }
        } else {
            transcriptText.textContent = 'No transcript available';
        }
        
        // Reset word details
        wordDetailsTable.innerHTML = '';
        
        // Add word-level details if available
        if (data.words && data.words.length > 0) {
            // Word details section is now hidden by default
            // Keep it hidden until the user clicks the toggle button
            
            // Still populate the table
            data.words.forEach(word => {
                const row = document.createElement('tr');
                
                // Word text
                const wordCell = document.createElement('td');
                wordCell.textContent = word.text;
                row.appendChild(wordCell);
                
                // Start time
                const startCell = document.createElement('td');
                startCell.textContent = formatTime(word.start_time_s);
                row.appendChild(startCell);
                
                // End time
                const endCell = document.createElement('td');
                endCell.textContent = formatTime(word.end_time_s);
                row.appendChild(endCell);
                
                // Speaker (if available)
                const speakerCell = document.createElement('td');
                speakerCell.textContent = word.speaker || 'N/A';
                row.appendChild(speakerCell);
                
                wordDetailsTable.appendChild(row);
            });
        } else {
            // Hide word details section if no words data
            wordDetailsSection.classList.add('d-none');
            toggleWordDetailsBtn.parentElement.classList.add('d-none');
        }
        
        // Show the toggle button container if we have word details
        if (data.words && data.words.length > 0) {
            toggleWordDetailsBtn.parentElement.classList.remove('d-none');
        }
        
        // Handle additional formats
        displayAdditionalFormats(data);
        
        // Set raw response data
        rawResponseData.textContent = JSON.stringify(data, null, 2);
    }
    
    // Format time in seconds to readable format
    function formatTime(seconds) {
        if (seconds === undefined || seconds === null) return 'N/A';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = (seconds % 60).toFixed(2);
        return `${minutes}:${remainingSeconds.padStart(5, '0')}`;
    }
    
    // Get language name from ISO code
    function getLanguageName(code) {
        const languages = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'nl': 'Dutch',
            'ru': 'Russian',
            'zh': 'Chinese',
            'ja': 'Japanese',
            'ko': 'Korean',
            'ar': 'Arabic',
            'hi': 'Hindi',
            'he': 'Hebrew',
            'heb': 'Hebrew',
            'tr': 'Turkish',
            'pl': 'Polish',
            'cs': 'Czech',
            'sv': 'Swedish',
            'da': 'Danish',
            'fi': 'Finnish',
            'el': 'Greek',
            'hu': 'Hungarian',
            'ro': 'Romanian',
            'sk': 'Slovak',
            'uk': 'Ukrainian',
            'bg': 'Bulgarian',
            'hr': 'Croatian',
            'lt': 'Lithuanian',
            'lv': 'Latvian',
            'et': 'Estonian',
            'sl': 'Slovenian'
        };
        
        return languages[code] || null;
    }
    
    // Display additional formats
    function displayAdditionalFormats(data) {
        // Reset additional formats section
        additionalFormatsContent.innerHTML = '';
        
        // Check if additional formats exist
        if (data.additional_formats && data.additional_formats.length > 0) {
            // Show additional formats section
            additionalFormatsSection.classList.remove('d-none');
            
            // Create a container for the formats
            const formatsContainer = document.createElement('div');
            formatsContainer.className = 'row';
            
            // Process each format
            data.additional_formats.forEach(format => {
                // Create a card for each format
                const formatCard = document.createElement('div');
                formatCard.className = 'col-lg-6 col-md-12 mb-3';
                
                // Determine format name for display
                const formatName = format.requested_format || format.format || 'Unknown Format';
                const fileExtension = format.file_extension || formatName;
                const formatClass = `format-badge-${formatName.toLowerCase()}`;
                
                // Create card HTML
                formatCard.innerHTML = `
                    <div class="card h-100">
                        <div class="card-header bg-light">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-0 text-uppercase">${formatName}</h6>
                                    <span class="format-badge ${formatClass}">${fileExtension}</span>
                                </div>
                                <button class="btn btn-sm btn-outline-primary download-btn">
                                    <i class="bi bi-download me-1"></i>Download
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="format-preview"></div>
                        </div>
                    </div>
                `;
                
                // Append to container
                formatsContainer.appendChild(formatCard);
                
                // Get content and preview container
                const content = format.content || '';
                const previewContainer = formatCard.querySelector('.format-preview');
                const downloadBtn = formatCard.querySelector('.download-btn');
                
                // Determine content type and create appropriate preview
                let mimeType = format.content_type || 'text/plain';
                const isBase64 = format.is_base64_encoded || false;
                
                // Create preview based on format type
                if (formatName.toLowerCase() === 'html') {
                    // For HTML, create an iframe preview
                    const iframe = document.createElement('iframe');
                    iframe.className = 'w-100 border-0';
                    iframe.style.height = '200px';
                    previewContainer.appendChild(iframe);
                    
                    // If base64 encoded, decode first
                    let htmlContent = isBase64 ? atob(content) : content;
                    
                    // Set content to iframe
                    setTimeout(() => {
                        const doc = iframe.contentDocument || iframe.contentWindow.document;
                        doc.open();
                        doc.write(htmlContent);
                        doc.close();
                    }, 0);
                    
                } else if (['docx', 'pdf'].includes(formatName.toLowerCase())) {
                    // For binary formats like DOCX, PDF - just show download option
                    previewContainer.innerHTML = `
                        <div class="text-center p-4 bg-light rounded">
                            <i class="bi bi-file-earmark-${formatName.toLowerCase() === 'pdf' ? 'pdf' : 'word'} fs-1 text-primary"></i>
                            <p class="mt-3 mb-0">Preview not available for ${formatName.toUpperCase()} format.</p>
                        </div>
                    `;
                    
                    // Set correct mime type
                    if (formatName.toLowerCase() === 'docx') {
                        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                    } else if (formatName.toLowerCase() === 'pdf') {
                        mimeType = 'application/pdf';
                    }
                    
                } else if (['txt', 'srt', 'vtt', 'json', 'segmented_json'].includes(formatName.toLowerCase())) {
                    // For text-based formats, show in textarea
                    const textarea = document.createElement('textarea');
                    textarea.className = 'form-control';
                    textarea.readOnly = true;
                    textarea.rows = 8;
                    
                    // If base64 encoded, decode first
                    textarea.value = isBase64 ? atob(content) : content;
                    
                    previewContainer.appendChild(textarea);
                    
                    // Set correct mime type
                    if (formatName.toLowerCase() === 'json' || formatName.toLowerCase() === 'segmented_json') {
                        mimeType = 'application/json';
                    }
                    
                } else {
                    // For other formats
                    const textarea = document.createElement('textarea');
                    textarea.className = 'form-control';
                    textarea.readOnly = true;
                    textarea.rows = 8;
                    textarea.value = isBase64 ? '[Base64 encoded content]' : content;
                    previewContainer.appendChild(textarea);
                }
                
                // Add download functionality
                downloadBtn.addEventListener('click', () => {
                    downloadTextFile(content, `transcript.${fileExtension}`, mimeType, isBase64);
                });
            });
            
            // Add the formats container to the page
            additionalFormatsContent.appendChild(formatsContainer);
            
        } else {
            // Hide additional formats section if no formats
            additionalFormatsSection.classList.add('d-none');
        }
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