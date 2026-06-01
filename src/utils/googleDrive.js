// Google Drive API Sync Utility using pure REST endpoints (Google Identity Services Popup client-side flow)

export const GoogleDriveSync = {
  /**
   * Finds a folder by name in the user's Google Drive root, or creates it if it doesn't exist.
   * Returns the Folder ID.
   */
  findOrCreateFolder: async (accessToken, folderName) => {
    const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false`;
    const fields = 'files(id, name)';
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}`;

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error?.message || `Failed to search folder (Status: ${response.status})`);
    }

    const searchData = await response.json();
    const existingFolders = searchData.files || [];

    if (existingFolders.length > 0) {
      return existingFolders[0].id;
    }

    // Create the folder if it doesn't exist
    const createUrl = 'https://www.googleapis.com/drive/v3/files?fields=id';
    const metadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: ['root']
    };

    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });

    if (!createResponse.ok) {
      const errorJson = await createResponse.json().catch(() => ({}));
      throw new Error(errorJson.error?.message || `Failed to create folder (Status: ${createResponse.status})`);
    }

    const createData = await createResponse.json();
    return createData.id;
  },

  /**
   * Creates a native Google Doc inside a specific folder on Google Drive.
   * Leverages Drive API v3 multipart/related upload with HTML translation to embed images.
   */
  createGoogleDoc: async (accessToken, folderId, title, content, imageUrl, mood, weather) => {
    const boundary = 'solace_journal_upload_boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const metadata = {
      name: title || 'Untitled Reflection',
      mimeType: 'application/vnd.google-apps.document', // Creates a native Google Doc!
      parents: folderId ? [folderId] : []
    };

    // Helper to escape HTML characters
    const escapeHtml = (text) => {
      if (!text) return '';
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const escapedTitle = escapeHtml(title || 'Untitled Reflection');

    let imageHtml = '';
    if (imageUrl) {
      imageHtml = `
        <div style="margin: 20px 0; text-align: center;">
          <img src="${imageUrl}" alt="Visual Reflection" style="max-width: 100%; max-height: 450px; border-radius: 8px;" />
        </div>
      `;
    }

    let metadataHtml = '';
    if (mood || weather) {
      const metaParts = [];
      if (mood) metaParts.push(`mood=${mood}`);
      if (weather) metaParts.push(`weather=${weather}`);
      metadataHtml = `<p style="color: #888888; font-size: 10px; margin-top: 50px;">[SolaceMetadata: ${metaParts.join('; ')}]</p>`;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #111111;">
        <h1 style="font-family: Georgia, serif; font-size: 24pt; font-weight: normal; color: #111111; margin-bottom: 5px;">${escapedTitle}</h1>
        ${imageHtml}
        <div style="margin-top: 20px;">
          ${content || ''}
        </div>
        ${metadataHtml}
      </body>
      </html>
    `;

    // Construct the multipart body combining JSON metadata and HTML body
    const multipartBody = 
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: text/html; charset=UTF-8\r\n\r\n' +
      htmlContent +
      closeDelim;

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartBody
      }
    );

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error?.message || `Failed to create Google Doc (Status: ${response.status})`);
    }

    const data = await response.json();
    return data; // returns { id, name, mimeType, etc. }
  },

  /**
   * Updates an existing Google Doc on Google Drive (both title and text/HTML content).
   */
  updateGoogleDoc: async (accessToken, fileId, title, content, imageUrl, mood, weather) => {
    // 1. Update the document title (metadata) via PATCH
    const metaResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,modifiedTime`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: title || 'Untitled Reflection'
        })
      }
    );

    if (!metaResponse.ok) {
      const errorJson = await metaResponse.json().catch(() => ({}));
      const err = new Error(errorJson.error?.message || `Failed to update document metadata (Status: ${metaResponse.status})`);
      err.status = metaResponse.status;
      throw err;
    }

    // Helper to escape HTML characters
    const escapeHtml = (text) => {
      if (!text) return '';
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const escapedTitle = escapeHtml(title || 'Untitled Reflection');

    let imageHtml = '';
    if (imageUrl) {
      imageHtml = `
        <div style="margin: 20px 0; text-align: center;">
          <img src="${imageUrl}" alt="Visual Reflection" style="max-width: 100%; max-height: 450px; border-radius: 8px;" />
        </div>
      `;
    }

    let metadataHtml = '';
    if (mood || weather) {
      const metaParts = [];
      if (mood) metaParts.push(`mood=${mood}`);
      if (weather) metaParts.push(`weather=${weather}`);
      metadataHtml = `<p style="color: #888888; font-size: 10px; margin-top: 50px;">[SolaceMetadata: ${metaParts.join('; ')}]</p>`;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #111111;">
        <h1 style="font-family: Georgia, serif; font-size: 24pt; font-weight: normal; color: #111111; margin-bottom: 5px;">${escapedTitle}</h1>
        ${imageHtml}
        <div style="margin-top: 20px;">
          ${content || ''}
        </div>
        ${metadataHtml}
      </body>
      </html>
    `;

    // 2. Update the document content (media body) via PATCH to /upload/drive/v3/files/{fileId}?uploadType=media
    const mediaResponse = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,name,mimeType,modifiedTime`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'text/html; charset=UTF-8'
        },
        body: htmlContent
      }
    );

    if (!mediaResponse.ok) {
      const errorJson = await mediaResponse.json().catch(() => ({}));
      const err = new Error(errorJson.error?.message || `Failed to update document media (Status: ${mediaResponse.status})`);
      err.status = mediaResponse.status;
      throw err;
    }

    const data = await mediaResponse.json();
    return data;
  },

  /**
   * Permanently deletes a file from Google Drive.
   */
  deleteGoogleDoc: async (accessToken, fileId) => {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error?.message || `Failed to delete Google Doc (Status: ${response.status})`);
    }

    return true;
  },

  /**
   * Lists all native Google Docs inside a specific folder on Google Drive.
   */
  listGoogleDocs: async (accessToken, folderId) => {
    const query = `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.document' and trashed = false`;
    const fields = 'files(id, name, mimeType, modifiedTime)';
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error?.message || `Failed to list files (Status: ${response.status})`);
    }

    const data = await response.json();
    return data.files || []; // Array of { id, name, mimeType, modifiedTime }
  },

  /**
   * Downloads a native Google Doc, exports it to HTML, and parses content + images.
   */
  downloadAndParseGoogleDoc: async (accessToken, fileId, title) => {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/html`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error?.message || `Failed to export Google Doc (Status: ${response.status})`);
    }

    const htmlText = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const body = doc.body;

    // Clean up title duplications
    const h1s = body.querySelectorAll('h1');
    h1s.forEach(h1 => {
      if (h1.textContent.trim().toLowerCase() === title.toLowerCase()) {
        h1.remove();
      }
    });

    const titles = body.querySelectorAll('.title');
    titles.forEach(t => {
      if (t.textContent.trim().toLowerCase() === title.toLowerCase()) {
        t.remove();
      }
    });

    // Extract image if present
    const img = body.querySelector('img');
    let imageUrl = '';
    if (img) {
      imageUrl = img.getAttribute('src') || '';
    }

    let mood = '';
    let weather = '';

    // Extract text paragraphs
    const pTags = Array.from(body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li'));
    const paragraphs = [];
    
    pTags.forEach(p => {
      const text = p.textContent.trim();
      if (!text) return;
      
      const metaMatch = text.match(/\[SolaceMetadata:\s*(.*?)\]/);
      if (metaMatch) {
        const parts = metaMatch[1].split(';');
        parts.forEach(part => {
          const [key, value] = part.split('=').map(s => s.trim());
          if (key === 'mood') mood = value;
          if (key === 'weather') weather = value;
        });
      } else {
        paragraphs.push(text);
      }
    });

    const content = paragraphs.join('\n\n');

    return {
      content,
      imageUrl,
      mood,
      weather
    };
  },

  /**
   * Finds a file in Google Drive by its exact name within a specific folder.
   */
  findFileByName: async (accessToken, folderId, filename) => {
    const query = `'${folderId}' in parents and name = '${filename}' and trashed = false`;
    const fields = 'files(id, name, mimeType, modifiedTime)';
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error?.message || `Failed to find file (Status: ${response.status})`);
    }

    const data = await response.json();
    return data.files || [];
  },

  /**
   * Creates a custom plain text or JSON file in a specific folder on Google Drive.
   */
  createCustomFile: async (accessToken, folderId, filename, mimeType, fileContent) => {
    const boundary = 'solace_custom_file_upload_boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const metadata = {
      name: filename,
      parents: folderId ? [folderId] : []
    };

    const multipartBody = 
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
      fileContent +
      closeDelim;

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartBody
      }
    );

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error?.message || `Failed to create file (Status: ${response.status})`);
    }

    return await response.json();
  },

  /**
   * Overwrites the media content of an existing file on Google Drive.
   */
  updateCustomFileContent: async (accessToken, fileId, mimeType, fileContent) => {
    const response = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,name,mimeType,modifiedTime`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `${mimeType}; charset=UTF-8`
        },
        body: fileContent
      }
    );

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error?.message || `Failed to update file media (Status: ${response.status})`);
    }

    return await response.json();
  },

  /**
   * Downloads the raw content of a file on Google Drive.
   */
  downloadCustomFileContent: async (accessToken, fileId) => {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error?.message || `Failed to download file (Status: ${response.status})`);
    }

    return await response.text();
  },

  /**
   * Retrieves user profile details (name, given_name, family_name, picture) using OAuth2 userinfo endpoint.
   */
  getUserInfo: async (accessToken) => {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error?.message || `Failed to fetch user profile (Status: ${response.status})`);
    }

    return await response.json();
  }
};
