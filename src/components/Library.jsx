import { useRef, useState } from 'react';

export default function Library({ books, onOpenBook, onAddBook, onRemoveBook, addToast }) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (file) => {
    if (!file || !file.name.endsWith('.epub')) {
      addToast('Please upload a valid EPUB file', 'error');
      return;
    }
    
    setIsUploading(true);
    try {
      const newBook = await onAddBook(file);
      addToast(`Added "${newBook.title}"`, 'success');
    } catch (err) {
      addToast('Failed to add book', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="library-view">
      {isUploading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
      
      <header className="library-header">
        <h1>📚 Bookie</h1>
      </header>
      
      <div 
        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          accept=".epub" 
          className="sr-only" 
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleUpload(e.target.files[0]);
              // Reset input so the same file can be uploaded again if needed
              e.target.value = '';
            }
          }}
        />
        <div className="upload-zone-icon">✨</div>
        <div className="upload-zone-text">Click to upload or drag an EPUB here</div>
        <div className="upload-zone-hint">Supported formats: .epub</div>
      </div>
      
      {books.length > 0 ? (
        <div className="library-grid">
          {books.map((book) => (
            <div key={book.id} className="book-card" onClick={() => onOpenBook(book.id)}>
              <button 
                className="book-card-delete" 
                title="Remove book"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Remove "${book.title}" from your library?`)) {
                    onRemoveBook(book.id);
                  }
                }}
              >
                ✕
              </button>
              
              <div className="book-card-cover">
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span>📖</span>
                )}
              </div>
              
              <div className="book-card-info">
                <h3 className="book-card-title truncate" title={book.title}>{book.title}</h3>
                <p className="book-card-author truncate" title={book.author}>{book.author}</p>
                <div className="book-card-meta">Added {new Date(book.addedAt).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🛋️</div>
          <h2 className="empty-state-title">Your library is empty</h2>
          <p className="empty-state-text">Add your first book above to start reading. Your progress and bookmarks will be saved securely in your browser.</p>
        </div>
      )}
    </div>
  );
}
