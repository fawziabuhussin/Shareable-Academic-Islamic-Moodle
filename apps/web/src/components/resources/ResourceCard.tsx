'use client';

import { useMemo, useState } from 'react';
import { Resource } from '@/types/resource';
import Modal from '@/components/Modal';

interface ResourceCardProps {
  resource: Resource;
  showActions?: boolean;
  onEdit?: (resource: Resource) => void;
  onDelete?: (resourceId: string) => void;
}

export default function ResourceCard({
  resource,
  showActions = false,
  onEdit,
  onDelete,
}: ResourceCardProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const previewUrl = useMemo(() => {
    const rawUrl = resource.url?.trim();
    if (!rawUrl) return null;

    const urlWithoutQuery = rawUrl.split('?')[0].toLowerCase();
    if (urlWithoutQuery.endsWith('.pdf')) {
      return rawUrl;
    }
    if (urlWithoutQuery.endsWith('.doc') || urlWithoutQuery.endsWith('.docx')) {
      return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(rawUrl)}`;
    }

    try {
      const parsed = new URL(rawUrl);
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname;

      if (host.includes('docs.google.com')) {
        if (path.includes('/document/d/')) {
          return `https://docs.google.com${path.replace(/\/edit.*$/, '/preview').replace(/\/view.*$/, '/preview')}`;
        }
        if (path.includes('/spreadsheets/d/')) {
          return `https://docs.google.com${path.replace(/\/edit.*$/, '/preview').replace(/\/view.*$/, '/preview')}`;
        }
        if (path.includes('/presentation/d/')) {
          return `https://docs.google.com${path.replace(/\/edit.*$/, '/preview').replace(/\/view.*$/, '/preview')}`;
        }
        if (path.includes('/document/d/e/')) {
          const base = `https://docs.google.com${path}`;
          return rawUrl.includes('embedded=true') ? rawUrl : `${base}?embedded=true`;
        }
      }

      if (host.includes('drive.google.com') && path.includes('/file/d/')) {
        const idMatch = path.match(/\/file\/d\/([^/]+)/);
        if (idMatch?.[1]) {
          return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
        }
      }
    } catch {
      return null;
    }

    return null;
  }, [resource.url]);

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-teal-300 transition">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 flex-1">
          <svg
            className="w-5 h-5 text-gray-600 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h4 className="text-lg font-semibold text-gray-800">{resource.title}</h4>
        </div>
        {showActions && (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit?.(resource)}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm font-semibold"
            >
              تعديل
            </button>
            <button
              onClick={() => onDelete?.(resource.id)}
              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm font-semibold"
            >
              حذف
            </button>
          </div>
        )}
      </div>
      
      {resource.description && (
        <p className="text-gray-600 text-sm mb-3">{resource.description}</p>
      )}
      
      <div className="flex flex-wrap gap-3">
        {previewUrl ? (
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="inline-flex items-center gap-2 text-primary hover:underline font-semibold text-sm"
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <span>معاينة</span>
          </button>
        ) : null}

        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-primary hover:underline font-semibold text-sm"
        >
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          <span>افتح الرابط</span>
        </a>
      </div>

      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={resource.title}
        size="full"
      >
        <div className="w-full h-[75vh] bg-gray-100 rounded-lg overflow-hidden">
          <iframe
            src={previewUrl ?? undefined}
            title={resource.title}
            className="w-full h-full"
          />
        </div>
      </Modal>
    </div>
  );
}
