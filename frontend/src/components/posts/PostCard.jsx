import { useId } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Avatar from '../common/Avatar.jsx';
import Icon from '../common/Icon.jsx';

const dateFormatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' });

export default function PostCard({ post, threadPath = `/posts/${post.id}`, isComment = false, isDetail = false }) {
  const authorId = useId();
  const location = useLocation();
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
          </div>
          <button className="post-more" type="button" aria-label={`More options for ${author.name}'s ${isComment ? 'comment' : 'post'}`} title="Options are not available in this preview." disabled>
            <Icon name="more" />
          </button>
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
        <footer className="post-actions">
          <button className={`post-action${isLiked ? ' is-liked' : ''}`} type="button" aria-label={`${likesCount} likes`} aria-pressed={isLiked} title="Likes are not available in this preview." disabled>
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
      </div>
    </article>
  );
}
