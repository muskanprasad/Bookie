import { useCallback, useRef, useEffect } from 'react';
import { getDB } from '../utils/db';

const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const CLIENT_ID = '1084776962347-5hd0g0d9cgg49532t7nlv2kmg4pg5uhb.apps.googleusercontent.com'; // Get from Google Console

let gapiLoaded = false;
let gisLoaded = false;

const loadGapi = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      window.gapi.load('client', () => {
        gapiLoaded = true;
        resolve();
      });
    };
    document.head.appendChild(script);
  });
};

const loadGis = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      gisLoaded = true;
      resolve();
    };
    document.head.appendChild(script);
  });
};

export function useDriveSync() {
  const tokenRef = useRef(null);
  const gapiReadyRef = useRef(false);

  const initGapi = useCallback(async () => {
    if (gapiReadyRef.current) return;

    try {
      if (!gapiLoaded) await loadGapi();
      if (!gisLoaded) await loadGis();

      await window.gapi.client.init({
        apiKey: 'YOUR_API_KEY', // Get from Google Console
        clientId: CLIENT_ID,
        scope: SCOPES,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
      });

      gapiReadyRef.current = true;
    } catch (err) {
      console.error('Failed to init Google API:', err);
    }
  }, []);

  const authorize = useCallback(async () => {
    try {
      await initGapi();

      const authResult = await window.gapi.auth2.getAuthInstance().signIn();
      const user = authResult.getBasicProfile();
      tokenRef.current = authResult.getAuthResponse().id_token;

      return { success: true, email: user.getEmail() };
    } catch (err) {
      console.error('Authorization failed:', err);
      return { success: false, error: err.message };
    }
  }, [initGapi]);

  const uploadToDrive = useCallback(async (bookId) => {
    if (!tokenRef.current) {
      const auth = await authorize();
      if (!auth.success) return { success: false, error: auth.error };
    }

    try {
      const db = await getDB();
      const bookmarks = await db.getAllFromIndex('bookmarks', 'bookId', bookId);
      const progress = await db.get('progress', bookId);

      const syncData = {
        bookId,
        bookmarks,
        progress,
        syncedAt: Date.now()
      };

      const blob = new Blob([JSON.stringify(syncData)], { type: 'application/json' });
      const metadata = {
        name: `bookie-sync-${bookId}.json`,
        mimeType: 'application/json',
        parents: ['appDataFolder'] // Hidden folder in Drive
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenRef.current}` },
        body: form
      });

      if (response.ok) {
        return { success: true, message: 'Synced to Drive' };
      } else {
        return { success: false, error: 'Upload failed' };
      }
    } catch (err) {
      console.error('Upload error:', err);
      return { success: false, error: err.message };
    }
  }, [authorize]);

  const downloadFromDrive = useCallback(async (bookId) => {
    if (!tokenRef.current) {
      const auth = await authorize();
      if (!auth.success) return { success: false, error: auth.error };
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='bookie-sync-${bookId}.json' and trashed=false&spaces=appDataFolder&fields=files(id,webContentLink)`,
        {
          headers: { Authorization: `Bearer ${tokenRef.current}` }
        }
      );

      const data = await response.json();
      if (!data.files || data.files.length === 0) {
        return { success: false, error: 'No backup found' };
      }

      const fileId = data.files[0].id;
      const fileResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: { Authorization: `Bearer ${tokenRef.current}` }
        }
      );

      const syncData = await fileResponse.json();
      return { success: true, data: syncData };
    } catch (err) {
      console.error('Download error:', err);
      return { success: false, error: err.message };
    }
  }, [authorize]);

  const autoSync = useCallback(async (bookId) => {
    // Check if online
    if (!navigator.onLine) return { success: false, error: 'Offline' };

    return uploadToDrive(bookId);
  }, [uploadToDriver]);

  // Auto-sync when connection restored
  useEffect(() => {
    const handleOnline = async () => {
      const db = await getDB();
      const allBooks = await db.getAll('library');
      
      for (const book of allBooks) {
        await autoSync(book.id);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [autoSync]);

  return {
    authorize,
    uploadToDriver,
    downloadFromDrive,
    autoSync
  };
}