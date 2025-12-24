import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: Record<string, string[]>;
  maxFiles?: number;
}

export function UploadDropzone({ onFileSelect, accept, maxFiles = 1 }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept || {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles,
  });
  
  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive || isDragging
          ? 'border-sport-orange bg-orange-50'
          : 'border-gray-300 hover:border-sport-green'
      }`}
      onMouseEnter={() => setIsDragging(true)}
      onMouseLeave={() => setIsDragging(false)}
    >
      <input {...getInputProps()} />
      <div className="space-y-2">
        <p className="text-4xl">📁</p>
        <p className="text-gray-600">
          {isDragActive ? 'Drop files here' : 'Drag & drop files here, or click to select'}
        </p>
        <p className="text-sm text-gray-500">CSV or XLSX files</p>
      </div>
    </div>
  );
}

