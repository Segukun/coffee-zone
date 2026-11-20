import { useEffect, useRef, useState } from 'react';

export default function useAttachments(initialAttachments = []) {
  const [attachments, setAttachments] = useState(initialAttachments);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const urlsRef = useRef(new Map());
  const requestRef = useRef(0);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      requestRef.current += 1;
      for (const url of urls.values()) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  async function addFiles(files, kind) {
    if (!files.length) return;
    const request = ++requestRef.current;
    setIsLoading(true);
    setError('');
    try {
      for (const file of files) {
        const maxSize = kind === 'image' ? 10 : 25;
        if (file.size > maxSize * 1024 * 1024) throw new Error(`${file.name} is too large. Maximum: ${maxSize} MB.`);
        if (kind === 'image') {
          if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
            throw new Error('Choose a PNG, JPG, WebP or GIF image.');
          }
          let bitmap;
          try {
            bitmap = await createImageBitmap(file);
          } catch {
            throw new Error(`${file.name} could not be opened. Choose another image.`);
          }
          bitmap.close();
        }
      }
      if (request !== requestRef.current) return;
      const next = files.map(file => {
        const id = crypto.randomUUID();
        const url = URL.createObjectURL(kind === 'image' ? file : new Blob([file], { type: 'application/octet-stream' }));
        urlsRef.current.set(id, url);
        return { id, name: file.name, size: file.size, type: file.type, kind, file, url };
      });
      setAttachments(current => [...current, ...next]);
    } catch (cause) {
      if (request === requestRef.current) setError(cause.message);
    } finally {
      if (request === requestRef.current) setIsLoading(false);
    }
  }

  function removeAttachment(id) {
    const url = urlsRef.current.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      urlsRef.current.delete(id);
    }
    setAttachments(current => current.filter(attachment => attachment.id !== id));
    setError('');
  }

  function reset() {
    requestRef.current += 1;
    for (const url of urlsRef.current.values()) URL.revokeObjectURL(url);
    urlsRef.current.clear();
    setAttachments([]);
    setError('');
    setIsLoading(false);
  }

  return { attachments, error, isLoading, addFiles, removeAttachment, reset };
}
