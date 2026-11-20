import Avatar from '../common/Avatar.jsx';
import Icon from '../common/Icon.jsx';

// Static Figma examples; these are not API responses or authenticated users.
const developers = [
  { name: 'Sofía Chen', username: '@sofiadev', initials: 'SC' },
  { name: 'Diego Ruiz', username: '@diegobuilds', initials: 'DR' },
  { name: 'Valentina Torres', username: '@valenjs', initials: 'VT' },
];
const trends = [
  { tag: '#ReactJS', count: 128 },
  { tag: '#BuildInPublic', count: 86 },
  { tag: '#FirstCommit', count: 42 },
];

export default function RightSidebar() {
  return (
    <aside className="right-sidebar" aria-label="Discover the community">
      <div className="search-placeholder">
        <Icon name="search" />
        <input type="search" placeholder="Search Coffee Zone" aria-label="Search Coffee Zone (coming soon)" aria-describedby="discovery-demo-note" disabled />
      </div>
      <p className="discovery-note" id="discovery-demo-note">Demo preview · search and following coming soon.</p>
      <section className="discovery-panel" aria-labelledby="developers-title">
        <h2 id="developers-title">Developers to follow</h2>
        <ul className="developer-list">
          {developers.map(({ name, username, initials }) => (
            <li key={username}>
              <div className="developer-info">
                <Avatar initials={initials} />
                <div><strong>{name}</strong><span>{username}</span></div>
              </div>
              <button className="follow-button" type="button" disabled aria-label={`Follow ${name} (coming soon)`}>Follow</button>
            </li>
          ))}
        </ul>
      </section>
      <section className="discovery-panel" aria-labelledby="trends-title">
        <h2 id="trends-title">In the conversation</h2>
        <p className="panel-note">Sample trends</p>
        <ul className="trend-list">
          {trends.map(({ tag, count }) => (
            <li key={tag}><span>{tag}</span><small>{count} posts</small></li>
          ))}
        </ul>
      </section>
      <p className="community-footer">Made for learning and sharing.</p>
    </aside>
  );
}
