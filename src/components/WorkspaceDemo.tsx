import React from 'react';
import './WorkspaceDemo.css';

export default function WorkspaceDemo() {
  return (
    <section className="workspace-demo-section" aria-labelledby="workspace-demo-heading">
      <div className="workspace-demo-heading">
        <h2 id="workspace-demo-heading">Your workspace.<br /><em>Beautifully in view.</em></h2>
      </div>
      <div className="workspace-demo-stage">
        <div className="workspace-demo-window">
          <video autoPlay muted loop playsInline preload="metadata" controls={false}
            aria-label="A preview of the BoostD dashboard">
            <source src="/dashboard.webm" type="video/webm" />
            Your browser does not support video playback.
          </video>
        </div>
      </div>
    </section>
  );
}



