import PageHeader from '../components/layout/PageHeader.jsx';
import CreatePost from '../components/posts/CreatePost.jsx';
import PostCard from '../components/posts/PostCard.jsx';
import useData from '../hooks/useData.js';

export default function HomePage() {
  const { posts } = useData();

  return (
    <>
      <PageHeader title="Home" subtitle="Your daily dose of code" />
      <CreatePost />
      <section className="post-feed" aria-label="Posts">
        <header className="post-feed-header">
          <h2>For you</h2>
          <span className="demo-label">Local demo · changes reset on reload</span>
        </header>
        <ul className="post-list">
          {posts.map(post => <li key={post.id}><PostCard post={post} /></li>)}
        </ul>
        <p className="post-feed-footer">You're all caught up. Time for a coffee.</p>
      </section>
    </>
  );
}
