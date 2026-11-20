import { useId, useRef, useState } from 'react';
import { HiOutlineGif } from 'react-icons/hi2';
import Avatar from '../common/Avatar.jsx';
import AttachmentPicker from '../posts/AttachmentPicker.jsx';
import PostAttachments from '../posts/PostAttachments.jsx';
import useAttachments from '../../hooks/useAttachments.js';
import useData from '../../hooks/useData.js';

export default function CommentForm({ replyingTo, parentId }) {
  const formId = useId();
  const { profile, services } = useData();
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const media = useAttachments();
  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

  function handleChange(event) {
    setContent(event.target.value);
    setError('');
    setNotice('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current || media.isLoading) return;
    setNotice('');
    if (!content.trim() && !media.attachments.length) {
      setError('Write a comment or add an attachment before replying.');
      event.currentTarget.elements.namedItem('content').focus();
      return;
    }
    setError('');
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await services.addComment(parentId, { content, attachments: media.attachments });
      setContent('');
      media.reset();
      setNotice('Reply added locally.');
    } catch (cause) {
      setNotice(cause.message);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <form className="create-post comment-form" aria-label={`Reply to @${replyingTo}`} onSubmit={handleSubmit} noValidate aria-busy={isSubmitting || media.isLoading}>
      <Avatar initials={initials} src={profile.avatarUrl} accent />
      <div className="create-post-body">
        <p className="comment-replying">Replying to <span>@{replyingTo}</span></p>
        <textarea
          id="reply-content"
          className="create-post-content"
          name="content"
          aria-label="Your comment"
          placeholder="Write your reply..."
          rows={2}
          value={content}
          onChange={handleChange}
          disabled={isSubmitting}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${formId}-error` : undefined}
        />
        {error && <p className="create-post-error" id={`${formId}-error`} role="alert">{error}</p>}
        <PostAttachments attachments={media.attachments} onRemove={isSubmitting ? undefined : media.removeAttachment} />
        {media.error && <p className="attachment-error" id={`${formId}-attachment-error`} role="alert">{media.error}</p>}
        <div className="create-post-toolbar">
          <div className="create-post-tools">
            <AttachmentPicker onSelect={media.addFiles} disabled={isSubmitting || media.isLoading} errorId={media.error ? `${formId}-attachment-error` : undefined} />
            <button className="create-post-tool" type="button" aria-label="Add GIF from GIPHY (not available)" title="GIPHY search is not connected yet. You can attach your own GIF image." disabled>
              <HiOutlineGif className="icon" size={24} aria-hidden="true" focusable="false" />
            </button>
          </div>
          <button className="create-post-submit" type="submit" disabled={isSubmitting || media.isLoading}>{isSubmitting ? 'Saving...' : 'Reply'}</button>
        </div>
        {media.isLoading && <p className="create-post-hint" role="status">Checking attachments...</p>}
        <div className="create-post-notice" role="status">{notice}</div>
      </div>
    </form>
  );
}
