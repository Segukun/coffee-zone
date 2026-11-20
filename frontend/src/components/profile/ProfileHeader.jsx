import { useId } from 'react';
import { Link } from 'react-router-dom';
import { IoArrowBackOutline, IoCalendarOutline, IoLocationOutline } from 'react-icons/io5';
import Avatar from '../common/Avatar.jsx';

const joinedDateFormatter = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export default function ProfileHeader({ profile, postsCount, onEdit }) {
  const nameId = useId();
  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

  return (
    <>
      <header className="profile-page-header">
        <Link className="profile-back" to="/" aria-label="Back to Home">
          <IoArrowBackOutline className="icon" size={24} aria-hidden="true" focusable="false" />
        </Link>
        <div>
          <h1>{profile.name}</h1>
          <p>{postsCount} {postsCount === 1 ? 'post' : 'posts'}</p>
        </div>
      </header>
      <section className="profile-overview" aria-labelledby={nameId}>
        <div className="profile-cover">
          {profile.bannerUrl ? <img className="profile-cover-image" src={profile.bannerUrl} alt="Profile banner" /> : (
            <>
              <p>// always learning</p>
              <span>A coffee. An idea. A new commit.</span>
            </>
          )}
        </div>
        <div className="profile-details">
          <div className="profile-toolbar">
            <Avatar initials={initials} src={profile.avatarUrl} accent />
            <button className="profile-edit" type="button" aria-haspopup="dialog" onClick={onEdit}>Edit Profile</button>
          </div>
          <h2 id={nameId}>{profile.name}</h2>
          <p className="profile-username">@{profile.username}</p>
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          <ul className="profile-metadata" aria-label="Profile details">
            {profile.location && (
              <li>
                <IoLocationOutline className="icon" size={18} aria-hidden="true" focusable="false" />
                <span>{profile.location}</span>
              </li>
            )}
            <li>
              <IoCalendarOutline className="icon" size={18} aria-hidden="true" focusable="false" />
              <span>Joined <time dateTime={profile.joinedAt}>{joinedDateFormatter.format(new Date(profile.joinedAt))}</time></span>
            </li>
          </ul>
          <dl className="profile-stats">
            <div><dt>Following</dt><dd>{profile.followingCount}</dd></div>
            <div><dt>Followers</dt><dd>{profile.followersCount}</dd></div>
          </dl>
        </div>
      </section>
    </>
  );
}
