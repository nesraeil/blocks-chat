import { useState } from 'react';
import './HtmlPreview.css';

interface HtmlPreviewProps {
    html: string;
    title?: string;
}

export function HtmlPreview({ html, title }: HtmlPreviewProps) {
    const [isExpanded, setIsExpanded] = useState(true);


    const handleOpenInNewTab = () => {
        // Open the blob URL in a new window
        const newWindow = window.open('', '_blank');
        if (newWindow) {
            newWindow.document.write(html);
            newWindow.document.close();
        }
    };

    return (
        <div className="html-preview">
            <button
                className="preview-toggle"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                {isExpanded ? 'Hide Preview' : 'Show Preview'}
                {title && <span className="preview-title">{title}</span>}
            </button>

            {isExpanded && (
                <div className="preview-container">
                    <div className="preview-toolbar">
                        <span className="preview-label">Live Preview</span>
                        <button
                            onClick={handleOpenInNewTab}
                            className="open-new-tab"
                        >
                            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                            </svg>
                            Open in New Tab
                        </button>
                    </div>
                    <iframe
                        srcDoc={html}
                        title={title || 'Preview'}
                        className="preview-iframe"
                        sandbox="allow-scripts"
                    />
                </div>
            )}
        </div>
    );
}
