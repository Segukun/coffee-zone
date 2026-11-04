import PageHeader from '../components/layout/PageHeader.jsx';
import PagePlaceholder from '../components/common/PagePlaceholder.jsx';

export default function HomePage() {
  return (
    <>
      <PageHeader title="Home" subtitle="Your daily dose of code" />
      <PagePlaceholder title="What are you building today?" description="This space is reserved for the post composer and feed. Posts and interactions will be implemented in a future phase." />
    </>
  );
}
