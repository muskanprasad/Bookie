import { useState, useEffect, useCallback } from 'react';
import EPub from 'epubjs';
import { getDB } from '../utils/db';

const normalizeCoverUrl = async (coverPath) => {
  if (!coverPath || typeof coverPath !== 'string') return null;
  if (coverPath.startsWith('data:')) return coverPath;

  try {
    const response = await fetch(coverPath);
    if (!response.ok) return null;

    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read cover image'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Could not normalize cover image', error);
    return null;
  }
};

export function useLibrary() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const db = await getDB();
      const allBooks = await db.getAll('library');
      
      const booksWithoutData = allBooks.map(b => {
        const { fileData, ...rest } = b;
        const sanitizedCoverUrl = rest.coverUrl && rest.coverUrl.startsWith('blob:') ? null : rest.coverUrl;
        return { ...rest, coverUrl: sanitizedCoverUrl };
      }).sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
      
      setBooks(booksWithoutData);
    } catch (err) {
      console.error("Failed to load library", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const addBook = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const epub = new EPub(arrayBuffer);
      await epub.ready;
      
      const title = epub.package.metadata.title || file.name;
      const author = epub.package.metadata.creator || 'Unknown Author';
      
      let coverUrl = null;
      try {
        const coverPath = await epub.coverUrl();
        if (coverPath) {
          coverUrl = await normalizeCoverUrl(coverPath);
        }
      } catch (e) {
        console.warn("Could not extract cover", e);
      }
       
      epub.destroy();
      
      const newBook = {
        id: crypto.randomUUID(),
        fileName: file.name,
        title,
        author,
        coverUrl,
        fileData: arrayBuffer,
        addedAt: Date.now(),
        lastOpenedAt: Date.now()
      };
      
      const db = await getDB();
      await db.put('library', newBook);
      await loadBooks();
      
      const { fileData, ...bookMeta } = newBook;
      return bookMeta;
    } catch (err) {
      console.error("Failed to add book", err);
      throw err;
    }
  };

  const removeBook = async (bookId) => {
    try {
      const db = await getDB();
      await db.delete('library', bookId);
      await db.delete('progress', bookId);
      
      // Delete bookmarks for this book
      const tx = db.transaction('bookmarks', 'readwrite');
      const index = tx.store.index('bookId');
      let cursor = await index.openCursor(bookId);
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      await tx.done;
      
      await loadBooks();
    } catch (err) {
      console.error("Failed to remove book", err);
      throw err;
    }
  };

  const getBookData = async (bookId) => {
    try {
      const db = await getDB();
      const book = await db.get('library', bookId);
      if (book) {
        book.lastOpenedAt = Date.now();
        await db.put('library', book);
        return book.fileData;
      }
      return null;
    } catch (err) {
      console.error("Failed to get book data", err);
      return null;
    }
  };

  return { books, loading, addBook, removeBook, getBookData, refresh: loadBooks };
}
