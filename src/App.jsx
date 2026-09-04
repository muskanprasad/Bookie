import { useState } from 'react';
import Library from './components/Library';
import Reader from './components/Reader';
import Toast from './components/Toast';
import { useLibrary } from './hooks/useLibrary';
import { useTheme } from './hooks/useTheme';
import { useToast } from './hooks/useToast';

export default function App() {
  const [currentBookId, setCurrentBookId] = useState(null);
  const [currentBookData, setCurrentBookData] = useState(null);
  const [isOpeningBook, setIsOpeningBook] = useState(false);
  
  const { books, loading: libraryLoading, addBook, removeBook, getBookData } = useLibrary();
  const { theme, setTheme, themes } = useTheme();
  const { toasts, addToast, removeToast } = useToast();

  const handleOpenBook = async (bookId) => {
    setIsOpeningBook(true);
    try {
      const data = await getBookData(bookId);
      if (data) {
        setCurrentBookData(data);
        setCurrentBookId(bookId);
      } else {
        addToast('Failed to load book data', 'error');
      }
    } catch (e) {
      addToast('Error opening book', 'error');
    } finally {
      setIsOpeningBook(false);
    }
  };

  const handleCloseBook = () => {
    setCurrentBookId(null);
    setCurrentBookData(null);
  };

  return (
    <div className="app">
      {isOpeningBook && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
      
      {!currentBookId ? (
        <Library 
          books={books} 
          onOpenBook={handleOpenBook} 
          onAddBook={addBook}
          onRemoveBook={removeBook}
          addToast={addToast}
        />
      ) : (
        <Reader 
          bookId={currentBookId} 
          bookData={currentBookData} 
          theme={theme}
          setTheme={setTheme}
          themes={themes}
          onClose={handleCloseBook}
          addToast={addToast}
        />
      )}
      
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}