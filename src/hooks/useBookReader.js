import { useState, useRef, useEffect, useCallback } from 'react';
import EPub from 'epubjs';
import { getDB } from '../utils/db';

const applyTheme = (rendition, themeName) => {
  if (!rendition) return;
  const themeStyles = {
    midnight: { 
      body: { color: '#e8e8f0 !important', background: '#14151f !important' }, 
      '*': { color: '#e8e8f0 !important' }, 
      'a': { color: '#f0a050 !important' } 
    },
    daylight: { 
      body: { color: '#1a1a2e !important', background: '#ffffff !important' }, 
      '*': { color: '#1a1a2e !important' }, 
      'a': { color: '#6c5ce7 !important' } 
    },
    sepia: { 
      body: { color: '#3d2e1e !important', background: '#faf5e8 !important' }, 
      '*': { color: '#3d2e1e !important' }, 
      'a': { color: '#c0783a !important' } 
    }
  };
  
  rendition.themes.register(themeName, themeStyles[themeName]);
  rendition.themes.select(themeName);
};

export function useBookReader(bookArrayBuffer, bookId, theme) {
  const viewerRef = useRef(null);
  const renditionRef = useRef(null);
  const bookRef = useRef(null);
  const currentCfiRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [bookTitle, setBookTitle] = useState('');
  const [toc, setToc] = useState([]);
  const [currentChapter, setCurrentChapter] = useState({ index: 0, title: '', href: '' });
  const [progress, setProgress] = useState(0);
  const [totalChapters, setTotalChapters] = useState(1);
  const [fontSize, setFontSizeState] = useState(100);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!bookArrayBuffer || !viewerRef.current || !bookId) return;
    
    let isMounted = true;
    
    const initBook = async () => {
      setIsLoading(true);
      setIsReady(false);
      
      if (renditionRef.current) {
        renditionRef.current.destroy();
        renditionRef.current=null;
      }
      if (bookRef.current) {
        bookRef.current.destroy();
        bookRef.current=null;
      }
      
      viewerRef.current.innerHTML = '';
      
      try {
        const epub = new EPub(bookArrayBuffer);
        bookRef.current = epub;
        await epub.ready;
        
        if (!isMounted) return;
        
        const title = epub.package.metadata.title || 'Unknown Title';
        setBookTitle(title);
        
        const epubToc = await epub.loaded.navigation;
        setToc(epubToc.toc || []);
        
        const spineLength = epub.spine.spineItems.length;
        setTotalChapters(spineLength || 1);
        
        const rendition = epub.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: 'none',
        });
        
        renditionRef.current = rendition;
        
        applyTheme(rendition, theme);
        rendition.themes.fontSize(fontSize + '%');

        rendition.on('relocated', async (location) => {
          if (!location || !isMounted || !location.start) return;

          let chapterTitle = `Chapter ${location.start.index + 1}`;
          const findChapter = (items, href) => {
            for (const item of items) {
              if (href && item.href && href.includes(item.href)) return item;
              if (item.subitems?.length) {
                const found = findChapter(item.subitems, href);
                if (found) return found;
              }
            }
            return null;
          };

          const matchedTocItem = findChapter(epubToc.toc, location.start.href);
          if (matchedTocItem) chapterTitle = matchedTocItem.label;

          const currentPct = Math.round(((location.start.index + 1) / (spineLength || 1)) * 100);
          currentCfiRef.current = location.start.cfi;
          setCurrentChapter({
            index: location.start.index,
            title: chapterTitle,
            href: location.start.href
          });
          setProgress(currentPct);

          const dbInstance = await getDB();
          await dbInstance.put('progress', {
            bookId,
            currentCfi: location.start.cfi,
            chapterIndex: location.start.index,
            chapterTitle,
            percentage: currentPct,
            lastReadAt: Date.now()
          });
        });
        
        const db = await getDB();
        const savedProgress = await db.get('progress', bookId);
        
        if (savedProgress?.currentCfi) {
          await rendition.display(savedProgress.currentCfi);
        } else {
          await rendition.display();
        }
        if (isMounted) setIsReady(true);

      } catch (err) {
        console.error("Failed to initialize book", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    initBook();
    
    return () => {
      isMounted = false;
      if (renditionRef.current) {
        renditionRef.current.destroy();
        renditionRef.current = null;
      }
      if (bookRef.current) {
        bookRef.current.destroy();
        bookRef.current = null;
      }
      currentCfiRef.current = null;
    };
    // Exclude theme and fontSize from dependencies so it doesn't re-render the whole book
  }, [bookArrayBuffer, bookId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (renditionRef.current) {
      applyTheme(renditionRef.current, theme);
    }
  }, [theme]);

  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(fontSize + '%');
    }
  }, [fontSize]);

  const setFontSize = useCallback((size) => {
    const clamped = Math.max(80, Math.min(150, size));
    setFontSizeState(clamped);
  }, []);

  const runRenditionAction = useCallback((action, name) => {
    if (!renditionRef.current || !isReady) return Promise.resolve(false);
    return Promise.resolve(action()).then(() => true).catch((error) => {
      console.error(`Failed to ${name}`, error);
      return false;
    });
  }, [isReady]);

  const next = useCallback(() => runRenditionAction(() => renditionRef.current.next(), 'go to the next page'), [runRenditionAction]);
  const prev = useCallback(() => runRenditionAction(() => renditionRef.current.prev(), 'go to the previous page'), [runRenditionAction]);
  const goTo = useCallback((href) => {
    if (!href) return Promise.resolve(false);
    return runRenditionAction(() => renditionRef.current.display(href), 'open the selected chapter');
  }, [runRenditionAction]);
  const goToCfi = useCallback((cfi) => {
    if (!cfi) return Promise.resolve(false);
    return runRenditionAction(() => renditionRef.current.display(cfi), 'open the bookmark');
  }, [runRenditionAction]);
  
  const getCurrentCfi = useCallback(() => {
    if (currentCfiRef.current) return currentCfiRef.current;

    const location = renditionRef.current?.currentLocation?.() || renditionRef.current?.location;
    if (location?.start?.cfi) {
      currentCfiRef.current = location.start.cfi;
      return location.start.cfi;
    }
    return null;
  }, []);

  // Global keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [next, prev]);

  return {
    viewerRef,
    isLoading,
    bookTitle,
    toc,
    currentChapter,
    progress,
    totalChapters,
    next,
    prev,
    goTo,
    goToCfi,
    getCurrentCfi,
    setFontSize,
    fontSize,
    isReady,
  };
}
