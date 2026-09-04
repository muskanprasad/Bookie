import { getDB } from '../utils/db';

export function useBackupRestore() {
  const exportData = async (bookId) => {
    try {
      const db = await getDB();
      const bookmarks = await db.getAllFromIndex('bookmarks', 'bookId', bookId);
      const progress = await db.get('progress', bookId);
      const book = await db.get('library', bookId);

      const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        book: {
          id: book.id,
          title: book.title,
          author: book.author
        },
        bookmarks,
        progress
      };

      return backup;
    } catch (err) {
      console.error('Export failed:', err);
      throw err;
    }
  };

  const downloadBackup = async (bookId) => {
    try {
      const backup = await exportData(bookId);
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookie-backup-${backup.book.title.replace(/\s+/g, '-')}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true, message: 'Backup downloaded' };
    } catch (err) {
      console.error('Download failed:', err);
      return { success: false, error: err.message };
    }
  };

  const restoreBackup = async (file) => {
    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (backup.version !== 1) {
        throw new Error('Unsupported backup version');
      }

      const db = await getDB();

      // Restore bookmarks
      if (backup.bookmarks && Array.isArray(backup.bookmarks)) {
        for (const bm of backup.bookmarks) {
          await db.put('bookmarks', bm);
        }
      }

      // Restore progress
      if (backup.progress) {
        await db.put('progress', backup.progress);
      }

      return { 
        success: true, 
        message: `Restored ${backup.bookmarks?.length || 0} bookmarks` 
      };
    } catch (err) {
      console.error('Restore failed:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    downloadBackup,
    restoreBackup
  };
}