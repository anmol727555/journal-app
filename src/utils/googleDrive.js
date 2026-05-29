// Google Drive API Sync Utility using pure REST endpoints (OAuth 2.0 Authorization Code Flow)

export const GoogleDriveSync = {
  /**
   * Generates the OAuth 2.0 redirection URL for Google Identity Services.
   * Requests an authorization code with offline access to retrieve a refresh token.
   */
  getAuthUrl: (clientId, redirectUri, folderId) => {
    const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
      state: folderId, // Pass folderId in state to preserve it across OAuth redirection
      access_type: 'offline', // Crucial to request a refresh token
      prompt: 'select_account consent' // Forces consent dialog to guarantee refresh token is returned
    });
    
    return `${baseUrl}?${params.toString()}`;
  },

  /**
   * Exchanges an authorization code for an access token and a refresh token.
   */
  exchangeCodeForTokens: async (clientId, clientSecret, redirectUri, authCode) => {
    const bodyParams = {
      code: authCode,
      client_id: clientId,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    };
    
    // Add client_secret if provided
    if (clientSecret) {
      bodyParams.client_secret = clientSecret;
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(bodyParams).toString()
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error_description || errorJson.error || `Token exchange failed (Status: ${response.status})`);
    }

    return await response.json(); // Returns { access_token, expires_in, refresh_token, token_type, scope }
  },

  /**
   * Refreshes the access token using a stored refresh token.
   */
  refreshAccessToken: async (clientId, clientSecret, refreshToken) => {
    const bodyParams = {
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    };

    if (clientSecret) {
      bodyParams.client_secret = clientSecret;
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(bodyParams).toString()
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error_description || errorJson.error || `Token refresh failed (Status: ${response.status})`);
    }

    return await response.json(); // Returns { access_token, expires_in, token_type, scope }
  },

  /**
   * Creates a native Google Doc inside a specific folder on Google Drive.
   * Leverages Drive API v3 multipart/related upload with HTML translation to embed images.
   */
  createGoogleDoc: async (accessToken, folderId, title, content, imageUrl) => {
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
    const paragraphsHtml = (content || '')
      .split('\n')
      .map(p => p.trim() ? `<p style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #333333; margin-bottom: 12px;">${escapeHtml(p)}</p>` : '')
      .join('');

    let imageHtml = '';
    if (imageUrl) {
      imageHtml = `
        <div style="margin: 20px 0; text-align: center;">
          <img src="${imageUrl}" alt="Visual Reflection" style="max-width: 100%; max-height: 450px; border-radius: 8px;" />
        </div>
      `;
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
          ${paragraphsHtml}
        </div>
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
  updateGoogleDoc: async (accessToken, fileId, title, content, imageUrl) => {
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
    const paragraphsHtml = (content || '')
      .split('\n')
      .map(p => p.trim() ? `<p style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #333333; margin-bottom: 12px;">${escapeHtml(p)}</p>` : '')
      .join('');

    let imageHtml = '';
    if (imageUrl) {
      imageHtml = `
        <div style="margin: 20px 0; text-align: center;">
          <img src="${imageUrl}" alt="Visual Reflection" style="max-width: 100%; max-height: 450px; border-radius: 8px;" />
        </div>
      `;
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
          ${paragraphsHtml}
        </div>
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

    // Extract text paragraphs
    const pTags = Array.from(body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li'));
    const paragraphs = pTags
      .map(p => p.textContent.trim())
      .filter(text => text.length > 0);

    const content = paragraphs.join('\n\n');

    return {
      content,
      imageUrl
    };
  }
};
