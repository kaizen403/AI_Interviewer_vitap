'use client';

/**
 * PPT Slide Viewer Component
 * 
 * Displays uploaded PPT slides using Microsoft Office viewer or as a fallback shows file info
 */

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Presentation, ExternalLink } from 'lucide-react';
import { getBackendUrl } from '@/lib/api-config';

interface PPTViewerProps {
    pptFileUrl?: string;
    pptFileName?: string;
    className?: string;
}

export function PPTViewer({ pptFileUrl, pptFileName, className = '' }: PPTViewerProps) {
    const [viewerError, setViewerError] = useState(false);

    const BACKEND_URL = getBackendUrl();

    // Construct full URL for the PPT file
    const fullPptUrl = pptFileUrl
        ? pptFileUrl.startsWith('http')
            ? pptFileUrl
            : `${BACKEND_URL}${pptFileUrl}`
        : null;

    // Microsoft Office viewer URL (works for public URLs)
    const officeViewerUrl = fullPptUrl
        ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullPptUrl)}`
        : null;

    // If no PPT file, show placeholder
    if (!fullPptUrl) {
        return (
            <div className={`bg-gray-800 rounded-xl flex items-center justify-center ${className}`}>
                <div className="text-center p-8">
                    <Presentation className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No presentation uploaded</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-gray-800 rounded-xl overflow-hidden flex flex-col ${className}`}>
            {/* Header */}
            <div className="bg-gray-700/50 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Presentation className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-white truncate max-w-[200px]">
                        {pptFileName || 'Presentation'}
                    </span>
                </div>
                <a
                    href={fullPptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition"
                    title="Open in new tab"
                >
                    <ExternalLink className="w-4 h-4" />
                </a>
            </div>

            {/* Viewer */}
            <div className="flex-1 relative bg-gray-900">
                {!viewerError ? (
                    <iframe
                        src={officeViewerUrl!}
                        className="w-full h-full border-0"
                        title="PPT Viewer"
                        onError={() => setViewerError(true)}
                        onLoad={(e) => {
                            // Check if iframe loaded correctly (may not work due to CORS)
                        }}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center p-8">
                            <Presentation className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400 mb-2">Unable to preview presentation</p>
                            <p className="text-gray-500 text-sm mb-4">
                                The file may need to be publicly accessible for preview
                            </p>
                            <a
                                href={fullPptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Download Presentation
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
