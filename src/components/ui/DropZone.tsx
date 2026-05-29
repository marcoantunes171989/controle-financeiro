import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText } from 'lucide-react';
import { clsx } from 'clsx';

interface DropZoneProps {
  onFilesAccepted: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  label?: string;
  hint?: string;
}

export default function DropZone({ onFilesAccepted, accept, maxSize = 10 * 1024 * 1024, label, hint }: DropZoneProps) {
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback(
    (accepted: File[]) => {
      setFiles((prev) => [...prev, ...accepted]);
      onFilesAccepted(accepted);
    },
    [onFilesAccepted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept, maxSize });

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      {label && <span className="label">{label}</span>}
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-accent'
        )}
      >
        <input {...getInputProps()} />
        <Upload size={20} className="mx-auto mb-1 text-slate-400" />
        <p className="text-xs text-slate-500">
          {isDragActive ? 'Solte os arquivos aqui' : 'Arraste ou clique para anexar'}
        </p>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((file, idx) => (
            <li key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 text-xs">
              <FileText size={14} className="text-slate-400 shrink-0" />
              <span className="truncate flex-1 text-slate-700">{file.name}</span>
              <span className="text-slate-400 shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
              <button type="button" onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500">
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
