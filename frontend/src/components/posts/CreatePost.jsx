import { useId, useRef, useState } from 'react';
import Avatar from '../common/Avatar.jsx';
import Icon from '../common/Icon.jsx';
import useAttachments from '../../hooks/useAttachments.js';
import useData from '../../hooks/useData.js';
import AttachmentPicker from './AttachmentPicker.jsx';
import PostAttachments from './PostAttachments.jsx';

const snippetLanguages = ['JavaScript', 'TypeScript', 'Python', 'Java', 'HTML', 'CSS', 'SQL', 'Bash', 'Other'];

export default function CreatePost({ post, onSaved, onCancel }) {
  const formId = useId();
  const { profile, services } = useData();
  const [values, setValues] = useState({ content: post?.content ?? '', code: post?.codeSnippet?.code ?? '', language: post?.codeSnippet?.language ?? 'JavaScript' });
  const [isSnippetOpen, setIsSnippetOpen] = useState(Boolean(post?.codeSnippet));
  const [contentError, setContentError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const media = useAttachments(post?.attachments);
  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

  function handleChange(event) {
    const { name, value } = event.target;
    setValues(current => ({ ...current, [name]: value }));
    setContentError('');
    setNotice('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current || media.isLoading) return;
    setNotice('');
    if (!values.content.trim() && !values.code.trim() && !media.attachments.length) {
      setContentError('Add text, code or an attachment before posting.');
      event.currentTarget.elements.namedItem('content').focus();
      return;
    }
    setContentError('');
    submittingRef.current = true;
    setIsSubmitting(true);
    const payload = { content: values.content, codeSnippet: { language: values.language, code: values.code }, attachments: media.attachments };
    try {
      if (post) {
        await services.updatePost(post.id, payload);
        onSaved();
      } else {
        await services.createPost(payload);
        setValues({ content: '', code: '', language: 'JavaScript' });
        setIsSnippetOpen(false);
        media.reset();
        setNotice('Post added locally. Changes reset when you reload the page.');
      }
    } catch (error) {
      setNotice(error.message);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <form className="create-post" aria-label={post ? 'Edit post' : 'Create a post'} onSubmit={handleSubmit} noValidate aria-busy={isSubmitting || media.isLoading}>
      <Avatar initials={initials} src={profile.avatarUrl} accent />
      <div className="create-post-body">
        <textarea
          id={`${formId}-content`}
          className="create-post-content"
          name="content"
          aria-label="Post content"
          placeholder="What are you building today?"
          rows={2}
          value={values.content}
          onChange={handleChange}
          disabled={isSubmitting}
          aria-invalid={Boolean(contentError)}
          aria-describedby={contentError ? `${formId}-error` : undefined}
        />
        {contentError && <p className="create-post-error" id={`${formId}-error`} role="alert">{contentError}</p>}
        <div className="create-post-snippet" id={`${formId}-snippet`} hidden={!isSnippetOpen}>
          <div className="create-post-snippet-header">
            <label htmlFor={`${formId}-language`}>Code snippet <span>(optional)</span></label>
            <select id={`${formId}-language`} name="language" aria-label="Snippet language" value={values.language} onChange={handleChange} disabled={isSubmitting}>
              {snippetLanguages.map(language => <option key={language} value={language}>{language}</option>)}
            </select>
          </div>
          <textarea
            id={`${formId}-code`}
            className="create-post-code"
            name="code"
            aria-label="Code snippet"
            placeholder="Paste your code here..."
            rows={5}
            wrap="off"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            value={values.code}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>
        <PostAttachments attachments={media.attachments} onRemove={isSubmitting ? undefined : media.removeAttachment} />
        {media.error && <p className="attachment-error" id={`${formId}-attachment-error`} role="alert">{media.error}</p>}
        <div className="create-post-toolbar">
          <div className="create-post-tools">
            <AttachmentPicker onSelect={media.addFiles} disabled={isSubmitting || media.isLoading} errorId={media.error ? `${formId}-attachment-error` : undefined} />
            <button
              className="create-post-tool"
              type="button"
              aria-label={isSnippetOpen ? 'Hide code snippet editor' : 'Show code snippet editor'}
              title={isSnippetOpen ? 'Hide editor (keeps your code)' : 'Add a code snippet'}
              aria-expanded={isSnippetOpen}
              aria-controls={`${formId}-snippet`}
              onClick={() => setIsSnippetOpen(current => !current)}
              disabled={isSubmitting}
            >
              <Icon name="code" />
            </button>
          </div>
          <div className="post-form-actions">
            {onCancel && <button className="post-form-cancel" type="button" onClick={onCancel} disabled={isSubmitting}>Cancel</button>}
            <button className="create-post-submit" type="submit" disabled={isSubmitting || media.isLoading}>{isSubmitting ? 'Saving...' : post ? 'Save Changes' : 'Post'}</button>
          </div>
        </div>
        {media.isLoading && <p className="create-post-hint" role="status">Checking attachments...</p>}
        <div className="create-post-notice" role="status">{notice}</div>
      </div>
    </form>
  );
}
