import { openDB } from 'idb';

let dbPromise = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB('bookie-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('library')) {
          db.createObjectStore('library', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('bookmarks')) {
          const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id', autoIncrement: true });
          bookmarkStore.createIndex('bookId', 'bookId');
        }
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress', { keyPath: 'bookId' });
        }
      },
    });
  }
  return dbPromise;
}
