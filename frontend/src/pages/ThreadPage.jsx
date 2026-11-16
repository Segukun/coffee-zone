import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { IoArrowBackOutline } from 'react-icons/io5';
import CommentForm from '../components/comments/CommentForm.jsx';
import PostCard from '../components/posts/PostCard.jsx';
import { homePosts, profilePosts } from '../utils/previewPosts.js';
import NotFoundPage from './NotFoundPage.jsx';

function findComment(comments, commentId, parent) {
  for (const comment of comments) {
    if (comment.id === commentId) return { comment, parent };
    const match = findComment(comment.comments ?? [], commentId, comment);
    if (match) return match;
  }
}

export default function ThreadPage() {
  const { postId, commentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const headingRef = useRef(null);
  const post = [...homePosts, ...profilePosts].find(item => item.id === postId);
  const match = commentId && post ? findComment(post.comments ?? [], commentId, post) : null;
  const selected = commentId ? match?.comment : post;
  const parent = match?.parent;
  const postPath = `/posts/${postId}`;
  const parentPath = parent && parent !== post ? `${postPath}/comments/${parent.id}` : postPath;
  const fallbackPath = commentId ? parentPath : profilePosts.includes(post) ? '/profile' : '/';

  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo(0, 0);
  }, [postId, commentId]);

  function handleBack() {
    if (location.state?.threadFrom) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  }

  if (!selected) return <NotFoundPage />;

  const comments = selected.comments ?? [];

  return (
    <>
      <header className="thread-page-header">
        <button className="thread-back" type="button" aria-label="Go back" onClick={handleBack}>
          <IoArrowBackOutline className="icon" size={24} aria-hidden="true" focusable="false" />
        </button>
        <div>
          <h1 ref={headingRef} tabIndex={-1}>{commentId ? 'Comment' : 'Post'}</h1>
          <p>Keep the conversation going</p>
        </div>
      </header>
      {commentId && (
        <nav className="thread-context" aria-label="Conversation context">
          <Link to={postPath} state={{ threadFrom: location.pathname }}>View original post</Link>
          <span>Replying to @{parent.author.username}</span>
          {parent !== post && <Link to={parentPath} state={{ threadFrom: location.pathname }}>View parent comment</Link>}
        </nav>
      )}
      <PostCard post={selected} isComment={Boolean(commentId)} isDetail />
      <CommentForm key={commentId ?? postId} replyingTo={selected.author.username} />
      <section className="thread-comments" aria-labelledby="thread-comments-heading">
        <header className="thread-comments-header">
          <h2 id="thread-comments-heading">{commentId ? 'Replies' : 'Comments'} <span>{comments.length}</span></h2>
          <span className="demo-label">Example conversation</span>
        </header>
        {comments.length > 0 ? (
          <ul className="post-list">
            {comments.map(comment => (
              <li key={comment.id}>
                <PostCard post={comment} isComment threadPath={`${postPath}/comments/${comment.id}`} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="thread-empty">
            <h3>No replies yet</h3>
            <p>This example conversation ends here. You can try the reply form above.</p>
          </div>
        )}
        <p className="post-feed-footer">Design preview · likes, publishing and attachments are not connected yet.</p>
      </section>
    </>
  );
}
