import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import pages from '@/lib/public-seo.json';

// Keep metadata correct when React Router navigates without loading a new HTML document.
export default function PageMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const path = pathname.replace(/\/+$/, '') || '/';
    const page = pages[path as keyof typeof pages];
    document.title = page?.title ?? 'Workspace — BoostD';
    const setMeta = (attribute: 'name' | 'property', key: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.content = content;
    };
    setMeta('name', 'robots', page?.robots ?? 'noindex, follow');
    setMeta('name', 'description', page?.description ?? 'Your BoostD workspace.');
    for (const attribute of ['og:title', 'og:description', 'og:url']) {
      const content = attribute === 'og:title' ? document.title : attribute === 'og:description'
        ? page?.description ?? 'Your BoostD workspace.' : `https://www.boostd.app${path === '/' ? '/' : path}`;
      setMeta('property', attribute, content);
      setMeta('name', attribute.replace('og:', 'twitter:'), content);
    }
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical && page) canonical.href = `https://www.boostd.app${path}`;
    else canonical?.remove();
    if (page && !canonical) {
      const link = document.createElement('link');
      link.rel = 'canonical';
      link.href = `https://www.boostd.app${path}`;
      document.head.appendChild(link);
    }
  }, [pathname]);
  return null;
}
