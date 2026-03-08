import React from 'react';

export default function NoticeItem({ notice }) {
    if (!notice) return null;

    // Helper to format dates mentioned in text to red (WOW factor)
    const formatContent = (text) => {
        if (!text) return null;
        
        // Use non-capturing groups (?:...) for month and suffix so split only returns the full date
        const dateRegex = /(\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/gi;
        
        // Handle line breaks first to maintain structure
        return text.split('\n').map((line, i) => {
            if (!line) return <br key={i} />;
            
            const parts = line.split(dateRegex);
            return (
                <div key={i} className="mb-1">
                    {parts.map((part, j) => {
                        // Use a non-global regex for testing to avoid lastIndex issues
                        if (part && /(\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i.test(part)) {
                            return <span key={j} className="text-red-500 font-bold">{part}</span>;
                        }
                        return part;
                    })}
                </div>
            );
        });
    };

    const getFileUrl = (path) => {
        if (!path) return '#';
        // Ensure path uses forward slashes
        const relativePath = path.replace(/\\/g, '/');
        const baseUrl = import.meta.env.VITE_API_URL || '';
        // If baseUrl ends with /api, we might need to adjust if files are served from /uploads
        // Actually, our index.js serves /uploads statically.
        // If VITE_API_URL is http://localhost:5000/api, we need to strip /api
        const rootUrl = baseUrl.replace(/\/api$/, '') || baseUrl;
        return `${rootUrl}/${relativePath}`;
    };


    return (
        <div className="bg-[#f0f9ff] border-2 border-[#3b82f6] rounded-xl p-6 mb-6 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xl font-extrabold text-[#113d7c] mb-4 tracking-tight">
                {notice.title}
            </h3>
            
            <div className="text-gray-700 font-medium mb-6 leading-relaxed">
                {formatContent(notice.content)}
            </div>

            {notice.links?.length > 0 && (
                <div className="space-y-2 mb-4">
                    {notice.links.map((link, idx) => (
                        <div key={idx} className="flex items-center text-blue-600 hover:text-blue-800 font-semibold">
                            <i className="fas fa-globe mr-2 text-sm"></i>
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="underline decoration-2 underline-offset-4">
                                {link.title}
                            </a>
                        </div>
                    ))}
                </div>
            )}

            {notice.attachments?.length > 0 && (
                <div className="space-y-2">
                    {notice.attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center text-[#0ea5e9] hover:text-[#0369a1] font-bold">
                            <i className="fas fa-paperclip mr-2 text-sm"></i>
                            <a href={getFileUrl(att.path)} target="_blank" rel="noopener noreferrer" className="underline decoration-2 underline-offset-4">
                                {att.title || 'Attachment'}
                            </a>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="mt-6 pt-4 border-t border-blue-100 flex justify-between items-center text-[10px] font-bold text-gray-400 tracking-widest">
                <span>Posted On: {new Date(notice.createdAt).toLocaleDateString()}</span>
                <span>Internship Office</span>
            </div>
        </div>
    );
}
