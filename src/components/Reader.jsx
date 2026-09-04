import { useState, useEffect, useRef } from 'react';
import { useBookReader } from '../hooks/useBookReader';
import { useBookmarks } from '../hooks/useBookmarks';
import { useBackupRestore } from '../hooks/useBackupRestore';
import Sidebar from './Sidebar';

export default function Reader({ bookId, bookData, theme, setTheme, onClose, addToast }) {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  
  const {
    viewerRef,
    isLoading,
    bookTitle,
    toc,
    currentChapter,
    progress,
    next,
    prev,
    goTo,
    goToCfi,
    getCurrentCfi,
    setFontSize,
    fontSize,
    isReady,
  } = useBookReader(bookData, bookId, theme);

  const { bookmarks, addBookmark, removeBookmark } = useBookmarks(bookId);
  const { downloadBackup, restoreBackup } = useBackupRestore();
  const fileInputRef = useRef(null);
  const [backupStatus, setBackupStatus] = useState('');

  // Handle window resize for sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768 && sidebarOpen) {
        setSidebarOpen(false);
      } else if (window.innerWidth > 768 && !sidebarOpen) {
        setSidebarOpen(true);
      }
    };
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  const handleAddBookmark = async () => {
    const cfi = getCurrentCfi();
    if (!cfi) {
      addToast('Cannot add bookmark here', 'error');
      return;
    }

    try {
      await addBookmark({
        cfi,
        chapterTitle: currentChapter.title,
        note: ''
      });
      addToast('Bookmark added', 'success');
    } catch {
      addToast('Failed to add bookmark', 'error');
    }
  };

  const handleBackup = async () => {
    setBackupStatus('Downloading...');
    const result = await downloadBackup(bookId);
    setBackupStatus(result.success ? '✓ Downloaded' : '✗ Failed');
    setTimeout(() => setBackupStatus(''), 2000);
  };

  const handleRestore = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBackupStatus('Restoring...');
    const result = await restoreBackup(file);
    setBackupStatus(result.success ? '✓ Restored' : `✗ ${result.error}`);
    setTimeout(() => setBackupStatus(''), 2000);
    event.target.value = '';
  };

  return (
    <div className="reader-view">
      <header className="reader-toolbar">
        <div className="reader-toolbar-left">
          <button className="toolbar-btn" onClick={onClose} title="Back to Library">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
          <button className={`toolbar-btn ${sidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle Sidebar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>
        
        <div className="reader-toolbar-center">
          <span className="toolbar-book-title truncate">{bookTitle || 'Loading...'}</span>
        </div>
        
        <div className="reader-toolbar-right">
          <div className="theme-switcher">
            <button 
              className={`theme-option ${theme === 'midnight' ? 'active' : ''}`}
              onClick={() => setTheme('midnight')}
              title="Midnight Theme"
            >🌙</button>
            <button 
              className={`theme-option ${theme === 'daylight' ? 'active' : ''}`}
              onClick={() => setTheme('daylight')}
              title="Daylight Theme"
            >☀️</button>
            <button 
              className={`theme-option ${theme === 'sepia' ? 'active' : ''}`}
              onClick={() => setTheme('sepia')}
              title="Sepia Theme"
            >📜</button>
          </div>
          
          <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border)', margin: '0 8px' }}></div>
          
          <button className="toolbar-btn" onClick={() => setFontSize(fontSize - 10)} disabled={!isReady || fontSize <= 80} title="Decrease Font Size">A-</button>
          <button className="toolbar-btn" onClick={() => setFontSize(fontSize + 10)} disabled={!isReady || fontSize >= 150} title="Increase Font Size">A+</button>
          
          <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border)', margin: '0 8px' }}></div>
          
          <button className="toolbar-btn" onClick={handleAddBookmark} title="Add Bookmark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          </button>

          <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border)', margin: '0 8px' }}></div>

          <button className="toolbar-btn" onClick={handleBackup} title="Download backup">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </button>

          <button className="toolbar-btn" onClick={() => fileInputRef.current?.click()} title="Restore backup">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 9v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9"></path><polyline points="17 16 12 21 7 16"></polyline><line x1="12" y1="21" x2="12" y2="9"></line></svg>
          </button>

          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleRestore}
            style={{ display: 'none' }}
          />

          {backupStatus && <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>{backupStatus}</span>}
        </div>
      </header>
      
      <div className="reader-body">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => window.innerWidth <= 768 && setSidebarOpen(false)} 
          toc={toc} 
          goTo={goTo}
          goToCfi={goToCfi}
          currentHref={currentChapter.href}
          bookId={bookId}
          bookmarks={bookmarks}
          removeBookmark={removeBookmark}
        />
        
        <div className="reader-content">
          {isLoading && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
            </div>
          )}
          
          <div className="reader-viewer" ref={viewerRef}></div>
          
          <div className="reader-progress">
            <button className="progress-nav-btn" onClick={prev} disabled={!isReady}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            
            <div className="progress-track" title={`${currentChapter.title} - ${progress}%`}>
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            
            <button className="progress-nav-btn" onClick={next} disabled={!isReady}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
            
            <div className="progress-text">
              {progress}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
