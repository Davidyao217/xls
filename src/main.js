import * as engine from '../src/engine.js';
import { initUI } from '../src/ui.js';

// 1. Initialize the UI and pass it the engine to bind to
initUI(engine);

// 2. Hydrate the engine with initial data
engine.initEngine({});

// 3. Prevent accidental data loss on reload/quit
window.addEventListener('beforeunload', (e) => {
    e.preventDefault();
    e.returnValue = '';
});

// Google Drive Integration
let tokenClient;
let currentAccessToken = null;
let currentFileId = null;

window.onload = () => {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: '508217834882-hvbos0eqf369vebbtif9mghn56neolsr.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                // Cache the token in memory for immediate use
                currentAccessToken = tokenResponse.access_token;
                executeDriveUpload(currentAccessToken);
            }
        },
    });
};

document.getElementById('sv').addEventListener('click', () => {
    if (currentAccessToken) {
        executeDriveUpload(currentAccessToken);
    } else {
        tokenClient.requestAccessToken();
    }
});

function executeDriveUpload(accessToken) {
    // 1. Extract engine state
    const fileContent = JSON.stringify(engine.getData());
    const fileBlob = new Blob([fileContent], { type: 'application/json' });

    // 2. Define Drive metadata
    const metadata = {
        name: `xls-sh-workbook.json`,
        mimeType: 'application/json'
    };
    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });

    // 3. Construct multipart payload
    const form = new FormData();
    form.append('metadata', metadataBlob);
    form.append('file', fileBlob);

    // 4. Upload (POST for new file, PATCH for updating existing file)
    const method = currentFileId ? 'PATCH' : 'POST';
    const url = currentFileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${currentFileId}?uploadType=multipart`
        : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    fetch(url, {
        method: method,
        headers: {
            'Authorization': `Bearer ${accessToken}`
        },
        body: form
    })
        .then(res => {
            if (res.status === 401) {
                // Token expired. Clear cache and re-request.
                currentAccessToken = null;
                tokenClient.requestAccessToken();
                throw new Error('Token expired, prompting re-auth.');
            }
            return res.json();
        })
        .then(data => {
            if (data && data.id) {
                currentFileId = data.id; // Store ID to overwrite next time
                console.log(`Successfully saved to Drive. File ID: ${data.id} (Method: ${method})`);
                // Optional: Flash success to user, e.g. via an alert or toast.
                // alert('Successfully saved to Drive!');
            }
        })
        .catch(console.error);
}