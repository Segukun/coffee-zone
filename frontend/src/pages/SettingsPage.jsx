import PageHeader from '../components/layout/PageHeader.jsx';
import PagePlaceholder from '../components/common/PagePlaceholder.jsx';

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <PagePlaceholder icon="settings" title="Interface Preferences" description="This space is reserved for appearance and text size preferences. For now, Coffee Zone starts in dark mode and does not save preferences." />
    </>
  );
}
