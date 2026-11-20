import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { IoArrowBackOutline } from 'react-icons/io5';
import CommentForm from '../components/comments/CommentForm.jsx';
import PostCard from '../components/posts/PostCard.jsx';
import useData from '../hooks/useData.js';
import { findThread } from '../services/localData.js';
import NotFoundPage from './NotFoundPage.jsx';

export default function ThreadPage() {
  const { postId, commentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const headingRef = useRef(null);
  const { posts, profile } = useData();
  const thread = findThread(posts, postId, commentId);
  const post = thread?.post;
  const selected = thread?.selected;
  const parent = thread?.parent;
  const postPath = `/posts/${postId}`;
  const parentPath = parent && parent !== post ? `${postPath}/comments/${parent.id}` : postPath;
  const fallbackPath = commentId ? parentPath : post?.author.id === profile.id ? '/profile' : '/';

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
      <PostCard key={selected.id} post={selected} isComment={Boolean(commentId)} isDetail />
      <CommentForm key={`reply-${selected.id}`} replyingTo={selected.author.username} parentId={selected.id} />
      <section className="thread-comments" aria-labelledby="thread-comments-heading">
        <header className="thread-comments-header">
          <h2 id="thread-comments-heading">{commentId ? 'Replies' : 'Comments'} <span>{comments.length}</span></h2>
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
            <p>Be the first to join this conversation.</p>
          </div>
        )}
      </section>
    </>
  );
}
