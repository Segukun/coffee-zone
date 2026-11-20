import { useEffect, useId, useRef } from 'react';
import CreatePost from './CreatePost.jsx';

export default function EditPostModal({ post, onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    dialogRef.current.showModal();
    dialogRef.current.querySelector('textarea').focus();
  }, []);

  function handleClose() {
    dialogRef.current.close();
    onClose();
  }

  return (
    <dialog ref={dialogRef} className="edit-profile-modal edit-post-modal" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); handleClose(); }}>
      <header className="edit-post-heading"><h2 id={titleId}>Edit post</h2></header>
      <CreatePost post={post} onSaved={handleClose} onCancel={handleClose} />
    </dialog>
  );
}
