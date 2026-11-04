import Icon from './Icon.jsx';

export default function PagePlaceholder({ title, description, icon = 'code' }) {
  return (
    <section className="page-placeholder">
      <span className="placeholder-icon"><Icon name={icon} /></span>
      <span className="demo-label">Placeholder · Coming soon</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}
