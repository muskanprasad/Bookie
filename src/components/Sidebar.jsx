import { useState } from 'react';

export default function Sidebar({ isOpen, onClose, toc, goTo, goToCfi, currentHref, bookmarks, removeBookmark }) {
  const [activeTab, setActiveTab] = useState('toc'); // 'toc' or 'bookmarks'

  const renderTocItem = (item, depth = 0) => {
    // Basic active state matching by href
    const isActive = currentHref && currentHref.includes(item.href);
    
    return (
      <li key={item.id || item.href}>
        <div 
          className={`toc-item ${isActive ? 'active' : ''}`} 
          style={{ paddingLeft: `${16 + (depth * 12)}px` }}
          onClick={() => {
            if (item.href) goTo(item.href);
            // Auto close on mobile after selection
            if (window.innerWidth <= 768) onClose();
          }}
        >
          <div className="truncate">{item.label}</div>
        </div>
        
        {item.subitems && item.subitems.length > 0 && (
          <ul className="toc-list" style={{ marginTop: '2px' }}>
            {item.subitems.map(subitem => renderTocItem(subitem, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <>
      <div className={`sidebar-backdrop ${isOpen ? 'visible' : ''}`} onClick={onClose}></div>
      <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div style={{ fontWeight: 600 }}>Contents</div>
          <button className="toolbar-btn" onClick={onClose} aria-label="Close sidebar">✕</button>
        </div>
        
        <div className="sidebar-tabs">
          <button 
            className={`sidebar-tab ${activeTab === 'toc' ? 'active' : ''}`}
            onClick={() => setActiveTab('toc')}
          >
            Chapters
          </button>
          <button 
            className={`sidebar-tab ${activeTab === 'bookmarks' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookmarks')}
          >
            Bookmarks ({bookmarks.length})
          </button>
        </div>
        
        <div className="sidebar-content">
          {activeTab === 'toc' && (
            <ul className="toc-list">
              {toc.map(item => renderTocItem(item))}
              {toc.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No table of contents available
                </div>
              )}
            </ul>
          )}
          
          {activeTab === 'bookmarks' && (
            <div className="bookmark-list">
              {bookmarks.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No bookmarks yet. Add one from the toolbar!
                </div>
              ) : (
                bookmarks.map((bm) => (
                  <div key={bm.id} className="bookmark-item" onClick={() => {
                    goToCfi(bm.cfi);
                    if (window.innerWidth <= 768) onClose();
                  }}>
                    <div className="bookmark-item-info">
                      <div className="bookmark-item-title truncate">{bm.chapterTitle}</div>
                      {bm.note && <div className="bookmark-item-note truncate">{bm.note}</div>}
                      <div className="bookmark-item-date">{new Date(bm.createdAt).toLocaleString()}</div>
                    </div>
                    <button 
                      className="bookmark-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBookmark(bm.id);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
