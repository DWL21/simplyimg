import { useCallback, type DragEvent } from 'react';

export function useDropZone(onFiles: (files: File[]) => void) {
  const onDrop = useCallback(
    (event: DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) {
        onFiles(files);
      }
    },
    [onFiles],
  );

  return {
    onDrop,
    onDragOver: (event: DragEvent<HTMLLabelElement>) => event.preventDefault(),
  };
}
