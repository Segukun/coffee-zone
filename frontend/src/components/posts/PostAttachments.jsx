export default function PostAttachments({ attachments, onRemove }) {
  if (!attachments?.length) return null;

  return (
    <ul className="post-attachments" aria-label={onRemove ? 'Draft attachments' : 'Post attachments'}>
      {attachments.map(attachment => (
        <li className="post-attachment" key={attachment.id}>
          {attachment.kind === 'image' && <img className="post-attachment-image" src={attachment.url} alt={attachment.name} />}
          <div className="post-attachment-info">
            {attachment.kind === 'image' ? <span>{attachment.name}</span> : <a href={attachment.url} download={attachment.name}>{attachment.name}</a>}
            <small>{Math.max(1, Math.round(attachment.size / 1024))} KB</small>
            {onRemove && <button className="post-attachment-remove" type="button" aria-label={`Remove ${attachment.name}`} onClick={() => onRemove(attachment.id)}>Remove</button>}
          </div>
        </li>
      ))}
    </ul>
  );
}
