import { useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Avatar from '../common/Avatar.jsx';
import Icon from '../common/Icon.jsx';
import useData from '../../hooks/useData.js';
import EditPostModal from './EditPostModal.jsx';
import PostAttachments from './PostAttachments.jsx';

const dateFormatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' });

export default function PostCard({ post, threadPath = `/posts/${post.id}`, isComment = false, isDetail = false }) {
  const authorId = useId();
  const location = useLocation();
  const { profile, services } = useData();
  const [isEditing, setIsEditing] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const likingRef = useRef(false);
  const [error, setError] = useState('');
  const { author, createdAt, content, codeSnippet, likesCount, comments = [], isLiked = false } = post;
  const initials = author.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const date = new Date(createdAt);
  const contentElement = (
    <p className="post-content">
      {content.split(/(#[\p{L}\p{N}_]+)/gu).map((part, index) => (
        part.startsWith('#') ? <span className="post-hashtag" key={index}>{part}</span> : part
      ))}
    </p>
  );

  async function handleLike() {
    if (likingRef.current) return;
    likingRef.current = true;
    setIsLiking(true);
    setError('');
    try {
      await services.toggleLike(post.id);
    } catch (cause) {
      setError(cause.message);
    } finally {
      likingRef.current = false;
      setIsLiking(false);
    }
  }

  return (
    <article className={`post-card${isComment ? ' comment-card' : ''}${isDetail ? ' thread-selected' : ''}`} aria-labelledby={authorId}>
      <Avatar initials={initials} src={author.avatarUrl} accent={author.avatarAccent} />
      <div className="post-body">
        <header className="post-header">
          <div className="post-author">
            <h3 id={authorId}>{author.name}</h3>
            <span className="post-username">@{author.username}</span>
            <span className="post-date-separator" aria-hidden="true">·</span>
            <time dateTime={createdAt} title={date.toLocaleString('en')}>{dateFormatter.format(date)}</time>
            {post.editedAt && <span className="post-edited">Edited</span>}
          </div>
          {author.id === profile.id && (
            <details className="post-options">
              <summary className="post-more" aria-label={`Options for your ${isComment ? 'comment' : 'post'}`}><Icon name="more" /></summary>
              <div className="post-options-panel">
                <button type="button" onClick={event => { event.currentTarget.closest('details').open = false; setIsEditing(true); }}>Edit {isComment ? 'comment' : 'post'}</button>
              </div>
            </details>
          )}
        </header>
        {isComment && !isDetail ? (
          <Link className="comment-content-link" to={threadPath} state={{ threadFrom: location.pathname }} aria-label={`Open comment by ${author.name}`}>{contentElement}</Link>
        ) : contentElement}
        {codeSnippet?.code && (
          <figure className="post-snippet">
            <figcaption>{codeSnippet.language}</figcaption>
            <pre tabIndex={0} aria-label={`${codeSnippet.language} code snippet`}><code>{codeSnippet.code}</code></pre>
          </figure>
        )}
        <PostAttachments attachments={post.attachments} />
        <footer className="post-actions">
          <button className={`post-action${isLiked ? ' is-liked' : ''}`} type="button" aria-label={`${likesCount} likes`} aria-pressed={isLiked} onClick={handleLike} disabled={isLiking}>
            <Icon name="heart" />
            <span>{likesCount}</span>
          </button>
          {isDetail ? (
            <button className="post-action" type="button" aria-label={`Reply to ${author.name}`} onClick={() => document.getElementById('reply-content').focus()}>
              <Icon name="comment" />
              <span>{comments.length}</span>
              <span>Reply</span>
            </button>
          ) : (
            <Link className="post-action" to={threadPath} state={{ threadFrom: location.pathname }} aria-label={`View ${comments.length} ${isComment ? 'replies' : 'comments'} on ${author.name}'s ${isComment ? 'comment' : 'post'}`}>
              <Icon name="comment" />
              <span>{comments.length}</span>
            </Link>
          )}
        </footer>
        {error && <p className="create-post-error" role="alert">{error}</p>}
        {isEditing && <EditPostModal post={post} onClose={() => setIsEditing(false)} />}
      </div>
    </article>
  );
}
