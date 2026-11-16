export default function Avatar({ initials, src, accent = false }) {
  return (
    <span className={`avatar${accent ? ' avatar-accent' : ''}`} aria-hidden="true">
      {src ? <img src={src} alt="" loading="lazy" /> : initials}
    </span>
  );
}
