import { useId, useRef } from 'react';
import { IoAttachOutline, IoImageOutline } from 'react-icons/io5';

export default function AttachmentPicker({ onSelect, disabled = false, errorId }) {
  const id = useId();
  const imagesRef = useRef(null);
  const filesRef = useRef(null);

  function handleChange(event, kind) {
    const files = Array.from(event.target.files);
    event.target.value = '';
    onSelect(files, kind);
  }

  return (
    <>
      <button className="create-post-tool" type="button" aria-label="Add images" title="Add images (up to 10 MB each)" aria-controls={`${id}-images`} aria-describedby={errorId} onClick={() => imagesRef.current.click()} disabled={disabled}>
        <IoImageOutline className="icon" size={24} aria-hidden="true" focusable="false" />
      </button>
      <button className="create-post-tool" type="button" aria-label="Attach files" title="Attach files (up to 25 MB each)" aria-controls={`${id}-files`} aria-describedby={errorId} onClick={() => filesRef.current.click()} disabled={disabled}>
        <IoAttachOutline className="icon" size={24} aria-hidden="true" focusable="false" />
      </button>
      <input id={`${id}-images`} ref={imagesRef} type="file" aria-label="Choose images" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={event => handleChange(event, 'image')} hidden />
      <input id={`${id}-files`} ref={filesRef} type="file" aria-label="Choose files" multiple onChange={event => handleChange(event, 'file')} hidden />
    </>
  );
}
