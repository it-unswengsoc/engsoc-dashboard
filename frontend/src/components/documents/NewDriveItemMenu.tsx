'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Plus,
  ChevronDown,
  FolderPlus,
  FileText,
  FileSpreadsheet,
  Presentation,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { CREATABLE_FILE_TYPES } from '@/services/documents';

interface NewDriveItemMenuProps {
  disabled: boolean;
  disabledReason: string;
  onCreateFolder: () => void;
  onCreateFile: (mimeType: string, label: string) => void;
  onUploadFiles: (files: FileList) => void;
}

const FILE_TYPE_ICONS: Record<string, LucideIcon> = {
  doc: FileText,
  sheet: FileSpreadsheet,
  slides: Presentation,
};

/* Replaces the old plain "Upload" button — a real menu of everything the
   member might want to add to wherever they're currently browsing: a
   folder, a blank Google Doc/Sheet/Slides, or an upload of existing files.
   Disabled outright (with an explanatory title tooltip) rather than
   letting any of these through when the current location's own
   capabilities.canAddChildren says the signed-in member can't — the same
   real per-account permission Drive itself enforces, not a guess. */
export default function NewDriveItemMenu({
  disabled,
  disabledReason,
  onCreateFolder,
  onCreateFile,
  onUploadFiles,
}: NewDriveItemMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        className="flex items-center gap-1.5 rounded-xl bg-[#ED6672] px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition-all hover:bg-[#d95a66] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#ED6672] disabled:hover:shadow-sm disabled:active:scale-100"
      >
        <Plus className="h-4 w-4" />
        Add
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg">
          <MenuItem
            icon={FolderPlus}
            label="New folder"
            onClick={() => {
              setOpen(false);
              onCreateFolder();
            }}
          />
          {Object.entries(CREATABLE_FILE_TYPES).map(([key, type]) => (
            <MenuItem
              key={key}
              icon={FILE_TYPE_ICONS[key]}
              label={type.label}
              onClick={() => {
                setOpen(false);
                onCreateFile(type.mimeType, type.label);
              }}
            />
          ))}
          <div className="my-1 border-t border-gray-100" />
          <MenuItem
            icon={Upload}
            label="Upload files"
            onClick={() => {
              setOpen(false);
              fileInputRef.current?.click();
            }}
          />
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) onUploadFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
    >
      <Icon className="h-4 w-4 text-[#3D6C94]" />
      {label}
    </button>
  );
}
