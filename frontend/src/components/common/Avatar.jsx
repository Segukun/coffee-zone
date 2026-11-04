export default function Avatar({ initials, accent = false }) {
  return <span className={`avatar${accent ? ' avatar-accent' : ''}`} aria-hidden="true">{initials}</span>;
}
