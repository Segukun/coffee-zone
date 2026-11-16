import { useState } from 'react';
import EditProfileModal from '../components/profile/EditProfileModal.jsx';
import ProfileHeader from '../components/profile/ProfileHeader.jsx';
import PostCard from '../components/posts/PostCard.jsx';
import { previewProfile, profilePosts } from '../utils/previewPosts.js';

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <>
      <ProfileHeader profile={previewProfile} postsCount={profilePosts.length} onEdit={() => setIsEditing(true)} />
      {isEditing && <EditProfileModal profile={previewProfile} onClose={() => setIsEditing(false)} />}
      <section className="profile-posts" aria-labelledby="profile-posts-heading">
        <header className="profile-posts-header">
          <h2 id="profile-posts-heading"><span>Posts</span></h2>
          <button type="button" title="Replies are not available in this preview." disabled>Replies</button>
        </header>
        <ul className="post-list">
          {profilePosts.map(post => <li key={post.id}><PostCard post={post} /></li>)}
        </ul>
        <p className="profile-preview-note">Example profile · explore the comments. Saving and likes are not connected yet.</p>
      </section>
    </>
  );
}
