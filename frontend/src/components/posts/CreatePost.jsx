import { useId, useState } from 'react';
import { IoImageOutline } from 'react-icons/io5';
import Avatar from '../common/Avatar.jsx';
import Icon from '../common/Icon.jsx';

const snippetLanguages = ['JavaScript', 'TypeScript', 'Python', 'Java', 'HTML', 'CSS', 'SQL', 'Bash', 'Other'];

export default function CreatePost() {
  const formId = useId();
  const [values, setValues] = useState({ content: '', code: '', language: 'JavaScript' });
  const [isSnippetOpen, setIsSnippetOpen] = useState(false);
  const [contentError, setContentError] = useState('');
  const [notice, setNotice] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;
    setValues(current => ({ ...current, [name]: value }));
    if (name === 'content') setContentError('');
    setNotice('');
  }

  function handleSubmit(event) {
    event.preventDefault();
    setNotice('');

    if (!values.content.trim()) {
      setContentError('Write something before posting.');
      event.currentTarget.elements.namedItem('content').focus();
      return;
    }

    setContentError('');
    setNotice('No post was published. Publishing will be available when the backend is connected. Your text and code are still here.');
  }

  return (
    <form className="create-post" aria-label="Create a post" onSubmit={handleSubmit} noValidate>
      <Avatar initials="CZ" accent />
      <div className="create-post-body">
        <textarea
          id={`${formId}-content`}
          className="create-post-content"
          name="content"
          aria-label="Post content"
          placeholder="What are you building today?"
          rows={2}
          required
          value={values.content}
          onChange={handleChange}
          aria-invalid={Boolean(contentError)}
          aria-describedby={`${formId}-hint${contentError ? ` ${formId}-error` : ''}`}
        />
        <p className="create-post-hint" id={`${formId}-hint`}>An idea, something you learned, or that bug you finally fixed.</p>
        {contentError && <p className="create-post-error" id={`${formId}-error`} role="alert">{contentError}</p>}
        <div className="create-post-snippet" id={`${formId}-snippet`} hidden={!isSnippetOpen}>
          <div className="create-post-snippet-header">
            <label htmlFor={`${formId}-language`}>Code snippet <span>(optional)</span></label>
            <select id={`${formId}-language`} name="language" aria-label="Snippet language" value={values.language} onChange={handleChange}>
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
          />
        </div>
        <div className="create-post-toolbar">
          <div className="create-post-tools">
            <button className="create-post-tool" type="button" aria-label="Add image (not available)" title="Image uploads are not available in this preview." disabled>
              <IoImageOutline className="icon" size={24} aria-hidden="true" focusable="false" />
            </button>
            <button
              className="create-post-tool"
              type="button"
              aria-label={isSnippetOpen ? 'Hide code snippet editor' : 'Show code snippet editor'}
              title={isSnippetOpen ? 'Hide editor (keeps your code)' : 'Add a code snippet'}
              aria-expanded={isSnippetOpen}
              aria-controls={`${formId}-snippet`}
              onClick={() => setIsSnippetOpen(current => !current)}
            >
              <Icon name="code" />
            </button>
          </div>
          <button className="create-post-submit" type="submit">Post</button>
        </div>
        <p className="create-post-pending">Design preview · publishing is not connected yet.</p>
        <div className="create-post-notice" role="status">{notice}</div>
      </div>
    </form>
  );
}
