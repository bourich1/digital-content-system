import React, { useEffect, useRef, useState } from 'react';
import './WorkspaceDemo.css';

export default function WorkspaceDemo() {
  const stage = useRef<HTMLDivElement>(null);
  const [showVideo, setShowVideo] = useState(false);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setShowVideo(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setShowVideo(true); observer.disconnect(); }
    }, { rootMargin: '100px' });
    if (stage.current) observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  return (
    <section className="workspace-demo-section" aria-labelledby="workspace-demo-heading">
      <div className="workspace-demo-heading">
        <h2 id="workspace-demo-heading">Your workspace.<br /><em>Beautifully in view.</em></h2>
      </div>
      <div className="workspace-demo-stage" ref={stage}>
        <div className="workspace-demo-window">
          {showVideo ? <video autoPlay muted loop playsInline preload="none" controls={false}
            poster="/dashboard-poster.jpg" width="1280" height="720"
            src="/dashboard.webm"
            aria-label="A preview of the BoostD dashboard">
            Your browser does not support video playback.
          </video> : <img src="/dashboard-poster.jpg" width="1280" height="720"
            alt="A preview of the BoostD dashboard" loading="lazy" />}
        </div>
      </div>
    </section>
  );
}



