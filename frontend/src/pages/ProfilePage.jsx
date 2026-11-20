import { useState } from 'react';
import EditProfileModal from '../components/profile/EditProfileModal.jsx';
import ProfileHeader from '../components/profile/ProfileHeader.jsx';
import PostCard from '../components/posts/PostCard.jsx';
import useData from '../hooks/useData.js';

export default function ProfilePage() {
  const { profile, posts, services } = useData();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const ownPosts = posts.filter(post => post.author.id === profile.id);
  const replies = [];
  function collectReplies(items, postId) {
    for (const item of items) {
      if (item.author.id === profile.id) replies.push({ comment: item, postId });
      collectReplies(item.comments ?? [], postId);
    }
  }
  for (const post of posts) collectReplies(post.comments ?? [], post.id);

  return (
    <>
      <ProfileHeader profile={profile} postsCount={ownPosts.length} onEdit={() => setIsEditing(true)} />
      {isEditing && <EditProfileModal profile={profile} onSave={services.updateProfile} onClose={() => setIsEditing(false)} />}
      <section className="profile-posts" aria-label={activeTab === 'posts' ? 'Your posts' : 'Your replies'}>
        <header className="profile-posts-header">
          <button type="button" aria-pressed={activeTab === 'posts'} onClick={() => setActiveTab('posts')}>Posts</button>
          <button type="button" aria-pressed={activeTab === 'replies'} onClick={() => setActiveTab('replies')}>Replies</button>
        </header>
        <ul className="post-list">
          {activeTab === 'posts' ? ownPosts.map(post => <li key={post.id}><PostCard post={post} /></li>) : replies.map(({ comment, postId }) => (
            <li key={comment.id}><PostCard post={comment} isComment threadPath={`/posts/${postId}/comments/${comment.id}`} /></li>
          ))}
        </ul>
        {(activeTab === 'posts' ? ownPosts.length : replies.length) === 0 && <p className="profile-preview-note">{activeTab === 'posts' ? 'No posts yet. Share something from Home.' : 'No replies yet. Join a conversation.'}</p>}
      </section>
    </>
  );
}
