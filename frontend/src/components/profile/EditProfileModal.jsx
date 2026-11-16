import { useEffect, useId, useRef, useState } from 'react';
import { IoCameraOutline, IoImageOutline } from 'react-icons/io5';
import Avatar from '../common/Avatar.jsx';

export default function EditProfileModal({ profile, onClose }) {
  const formId = useId();
  const dialogRef = useRef(null);
  const imageInputsRef = useRef({});
  const imageUrlsRef = useRef({});
  const imageRequestsRef = useRef({ banner: 0, photo: 0 });
  const [values, setValues] = useState({ name: profile.name, username: profile.username, bio: profile.bio || '', location: profile.location || '' });
  const [imagePreviews, setImagePreviews] = useState({ banner: '', photo: '' });
  const [imageErrors, setImageErrors] = useState({});
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

  useEffect(() => {
    const imageRequests = imageRequestsRef.current;
    const imageUrls = imageUrlsRef.current;
    dialogRef.current.showModal();
    return () => {
      for (const name of ['banner', 'photo']) {
        imageRequests[name] += 1;
        if (imageUrls[name]) URL.revokeObjectURL(imageUrls[name]);
      }
    };
  }, []);

  function handleClose() {
    dialogRef.current.close();
    onClose();
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setValues(current => ({ ...current, [name]: value }));
    setErrors(current => ({ ...current, [name]: undefined }));
    setNotice('');
  }

  async function handleImageChange(event) {
    const { name, files } = event.target;
    const file = files[0];
    event.target.value = '';
    if (!file) return;

    const request = ++imageRequestsRef.current[name];
    setNotice('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setImageErrors(current => ({ ...current, [name]: 'Choose a PNG, JPG or WebP image.' }));
      return;
    }

    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
    } catch {
      if (request === imageRequestsRef.current[name]) {
        setImageErrors(current => ({ ...current, [name]: 'This image could not be opened. Choose another file.' }));
      }
      return;
    }

    if (request !== imageRequestsRef.current[name]) return;
    const previewUrl = URL.createObjectURL(file);
    if (imageUrlsRef.current[name]) URL.revokeObjectURL(imageUrlsRef.current[name]);
    imageUrlsRef.current[name] = previewUrl;
    setImagePreviews(current => ({ ...current, [name]: previewUrl }));
    setImageErrors(current => ({ ...current, [name]: '' }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};

    if (!values.name.trim()) nextErrors.name = 'Enter your name.';
    if (!values.username.trim()) {
      nextErrors.username = 'Choose a username.';
    } else if (!/^[a-zA-Z0-9_]+$/.test(values.username.trim())) {
      nextErrors.username = 'Use only letters, numbers and underscores, without @.';
    }

    setErrors(nextErrors);
    setNotice('');
    const firstInvalidField = Object.keys(nextErrors)[0];
    if (firstInvalidField) {
      event.currentTarget.elements.namedItem(firstInvalidField).focus();
      return;
    }

    setNotice('No changes were saved. Profile updates will be available when the backend is connected. Your edits are still here.');
  }

  return (
    <dialog
      ref={dialogRef}
      className="edit-profile-modal"
      aria-labelledby={`${formId}-title`}
      aria-describedby={`${formId}-description`}
      onCancel={event => { event.preventDefault(); handleClose(); }}
    >
      <header className="edit-profile-heading">
        <h2 id={`${formId}-title`}>Edit Profile</h2>
        <p id={`${formId}-description`}>Update your profile details.</p>
      </header>
      <form className="edit-profile-form" onSubmit={handleSubmit} noValidate>
        <div className="edit-profile-media">
          <div className="profile-cover edit-profile-banner">
            {imagePreviews.banner ? <img src={imagePreviews.banner} alt="Profile banner preview" /> : (
              <>
                <p>// always learning</p>
                <span>A coffee. An idea. A new commit.</span>
              </>
            )}
            <button
              className="edit-profile-image-button"
              type="button"
              aria-label="Change profile banner"
              aria-describedby={`${formId}-image-hint${imageErrors.banner ? ` ${formId}-banner-error` : ''}`}
              onClick={() => imageInputsRef.current.banner.click()}
            >
              <span className="edit-profile-image-overlay" aria-hidden="true">
                <IoImageOutline className="icon" size={28} focusable="false" />
                <span>Change Banner</span>
              </span>
            </button>
          </div>
          <div className="edit-profile-photo">
            <Avatar initials={initials} src={imagePreviews.photo || profile.avatarUrl} accent />
            <button
              className="edit-profile-image-button"
              type="button"
              aria-label="Change profile photo"
              aria-describedby={`${formId}-image-hint${imageErrors.photo ? ` ${formId}-photo-error` : ''}`}
              onClick={() => imageInputsRef.current.photo.click()}
            >
              <span className="edit-profile-image-overlay" aria-hidden="true">
                <IoCameraOutline className="icon" size={24} focusable="false" />
              </span>
            </button>
          </div>
          <input ref={node => { imageInputsRef.current.banner = node; }} type="file" name="banner" aria-label="Choose banner image" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} hidden />
          <input ref={node => { imageInputsRef.current.photo = node; }} type="file" name="photo" aria-label="Choose profile photo" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} hidden />
          <p className="edit-profile-image-hint" id={`${formId}-image-hint`}>Select the banner or photo to change it. PNG, JPG or WebP · local preview only.</p>
          {imageErrors.banner && <p className="edit-profile-error" id={`${formId}-banner-error`} role="alert">Banner: {imageErrors.banner}</p>}
          {imageErrors.photo && <p className="edit-profile-error" id={`${formId}-photo-error`} role="alert">Photo: {imageErrors.photo}</p>}
        </div>
        <div className="edit-profile-field">
          <label htmlFor={`${formId}-name`}>Name</label>
          <input
            id={`${formId}-name`}
            name="name"
            type="text"
            autoComplete="name"
            required
            value={values.name}
            onChange={handleChange}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${formId}-name-error` : undefined}
          />
          {errors.name && <p className="edit-profile-error" id={`${formId}-name-error`} role="alert">{errors.name}</p>}
        </div>
        <div className="edit-profile-field">
          <label htmlFor={`${formId}-username`}>Username</label>
          <div className="edit-profile-username">
            <span aria-hidden="true">@</span>
            <input
              id={`${formId}-username`}
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={values.username}
              onChange={handleChange}
              aria-invalid={Boolean(errors.username)}
              aria-describedby={errors.username ? `${formId}-username-error` : undefined}
            />
          </div>
          {errors.username && <p className="edit-profile-error" id={`${formId}-username-error`} role="alert">{errors.username}</p>}
        </div>
        <div className="edit-profile-field">
          <label htmlFor={`${formId}-bio`}>Bio <span>(optional)</span></label>
          <textarea id={`${formId}-bio`} name="bio" rows={4} value={values.bio} onChange={handleChange} />
        </div>
        <div className="edit-profile-field">
          <label htmlFor={`${formId}-location`}>Location <span>(optional)</span></label>
          <input id={`${formId}-location`} name="location" type="text" placeholder="City, country" value={values.location} onChange={handleChange} />
        </div>
        <p className="edit-profile-pending">Design preview · saving is not connected yet.</p>
        <div className="edit-profile-notice" role="status">{notice}</div>
        <footer className="edit-profile-actions">
          <button className="edit-profile-secondary" type="button" onClick={handleClose}>Cancel</button>
          <button className="edit-profile-submit" type="submit">Save Changes</button>
        </footer>
      </form>
    </dialog>
  );
}
