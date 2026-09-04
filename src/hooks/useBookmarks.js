import { useState, useEffect, useCallback } from 'react';
import { getDB } from '../utils/db';

export function useBookmarks(bookId) {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadBookmarks = useCallback(async () => {
    if (!bookId) {
      setBookmarks([]);
      return;
    }
    setLoading(true);
    try {
      const db = await getDB();
      const allBookmarks = await db.getAllFromIndex('bookmarks', 'bookId', bookId);
      setBookmarks(allBookmarks.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      console.error("Failed to load bookmarks", err);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const addBookmark = async ({ cfi, chapterTitle, note = '' }) => {
    if (!bookId) return null;
    
    try {
      const db = await getDB();
      const newBookmark = {
        bookId,
        cfi,
        chapterTitle,
        note,
        createdAt: Date.now()
      };
      
      const id = await db.add('bookmarks', newBookmark);
      newBookmark.id = id;
      
      await loadBookmarks();
      return newBookmark;
    } catch (err) {
      console.error("Failed to add bookmark", err);
      throw err;
    }
  };

  const removeBookmark = async (bookmarkId) => {
    try {
      const db = await getDB();
      await db.delete('bookmarks', bookmarkId);
      await loadBookmarks();
    } catch (err) {
      console.error("Failed to remove bookmark", err);
      throw err;
    }
  };

  return { bookmarks, addBookmark, removeBookmark, loading };
}
