import PageHeader from '../components/layout/PageHeader.jsx';
import PagePlaceholder from '../components/common/PagePlaceholder.jsx';

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile" />
      <PagePlaceholder icon="profile" title="Your profile, your journey" description="This space is reserved for profile information and posts. Profile editing will be implemented later." />
    </>
  );
}
