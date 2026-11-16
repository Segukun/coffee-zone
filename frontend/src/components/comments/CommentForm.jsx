import { useId, useState } from 'react';
import { IoImageOutline } from 'react-icons/io5';
import { HiOutlineGif } from 'react-icons/hi2';
import Avatar from '../common/Avatar.jsx';

export default function CommentForm({ replyingTo }) {
  const formId = useId();
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function handleChange(event) {
    setContent(event.target.value);
    setError('');
    setNotice('');
  }

  function handleSubmit(event) {
    event.preventDefault();
    setNotice('');
    if (!content.trim()) {
      setError('Write a comment before replying.');
      event.currentTarget.elements.namedItem('content').focus();
      return;
    }
    setError('');
    setNotice('No comment was published. Replies will be available when the backend is connected. Your text is still here.');
  }

  return (
    <form className="create-post comment-form" aria-label={`Reply to @${replyingTo}`} onSubmit={handleSubmit} noValidate>
      <Avatar initials="CZ" accent />
      <div className="create-post-body">
        <p className="comment-replying">Replying to <span>@{replyingTo}</span></p>
        <textarea
          id="reply-content"
          className="create-post-content"
          name="content"
          aria-label="Your comment"
          placeholder="Write your reply..."
          rows={3}
          required
          value={content}
          onChange={handleChange}
          aria-invalid={Boolean(error)}
          aria-describedby={`${formId}-hint${error ? ` ${formId}-error` : ''}`}
        />
        <p className="create-post-hint" id={`${formId}-hint`}>Share an idea, ask a question, or keep the conversation going.</p>
        {error && <p className="create-post-error" id={`${formId}-error`} role="alert">{error}</p>}
        <div className="create-post-toolbar">
          <div className="create-post-tools">
            <button className="create-post-tool" type="button" aria-label="Add image (not available)" title="Image attachments are not available in this preview." disabled>
              <IoImageOutline className="icon" size={24} aria-hidden="true" focusable="false" />
            </button>
            <button className="create-post-tool" type="button" aria-label="Add GIF (not available)" title="GIF attachments are not available in this preview." disabled>
              <HiOutlineGif className="icon" size={24} aria-hidden="true" focusable="false" />
            </button>
          </div>
          <button className="create-post-submit" type="submit">Reply</button>
        </div>
        <p className="create-post-pending">Design preview · replies are not published or saved.</p>
        <div className="create-post-notice" role="status">{notice}</div>
      </div>
    </form>
  );
}
