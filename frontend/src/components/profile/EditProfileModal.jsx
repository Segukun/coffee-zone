import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { IoCameraOutline, IoImageOutline } from 'react-icons/io5';
import Avatar from '../common/Avatar.jsx';

export default function EditProfileModal({ profile, onSave, onClose }) {
  const formId = useId();
  const dialogRef = useRef(null);
  const imageInputsRef = useRef({});
  const imageUrlsRef = useRef({});
  const imageFilesRef = useRef({});
  const removedImagesRef = useRef({ banner: false, photo: false });
  const imageRequestsRef = useRef({ banner: 0, photo: 0 });
  const pendingImagesRef = useRef({ banner: false, photo: false });
  const saveRequestRef = useRef(0);
  const savingRef = useRef(false);
  const closedRef = useRef(false);
  const [values, setValues] = useState({ name: profile.name, username: profile.username, bio: profile.bio || '', location: profile.location || '' });
  const [imagePreviews, setImagePreviews] = useState({ banner: profile.bannerUrl || '', photo: profile.avatarUrl || '' });
  const [pendingImages, setPendingImages] = useState({ banner: false, photo: false });
  const [imageErrors, setImageErrors] = useState({});
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

  const releaseDraft = useCallback(() => {
    closedRef.current = true;
    saveRequestRef.current += 1;
    for (const name of ['banner', 'photo']) {
      imageRequestsRef.current[name] += 1;
      pendingImagesRef.current[name] = false;
      imageFilesRef.current[name] = undefined;
      if (imageUrlsRef.current[name]) URL.revokeObjectURL(imageUrlsRef.current[name]);
      imageUrlsRef.current[name] = undefined;
    }
  }, []);

  useEffect(() => {
    closedRef.current = false;
    dialogRef.current.showModal();
    return releaseDraft;
  }, [releaseDraft]);

  function handleClose() {
    releaseDraft();
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
    if (!file || savingRef.current || closedRef.current) return;

    const request = ++imageRequestsRef.current[name];
    pendingImagesRef.current[name] = false;
    setPendingImages(current => ({ ...current, [name]: false }));
    setNotice('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setImageErrors(current => ({ ...current, [name]: 'Choose a PNG, JPG or WebP image.' }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageErrors(current => ({ ...current, [name]: 'This image is too large. Choose an image up to 10 MB.' }));
      return;
    }

    pendingImagesRef.current[name] = true;
    setPendingImages(current => ({ ...current, [name]: true }));
    setImageErrors(current => ({ ...current, [name]: '' }));
    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
      if (closedRef.current || request !== imageRequestsRef.current[name]) return;

      const previewUrl = URL.createObjectURL(file);
      if (imageUrlsRef.current[name]) URL.revokeObjectURL(imageUrlsRef.current[name]);
      imageUrlsRef.current[name] = previewUrl;
      imageFilesRef.current[name] = file;
      removedImagesRef.current[name] = false;
      setImagePreviews(current => ({ ...current, [name]: previewUrl }));
    } catch {
      if (!closedRef.current && request === imageRequestsRef.current[name]) {
        setImageErrors(current => ({ ...current, [name]: 'This image could not be opened. Choose another file.' }));
      }
    } finally {
      if (!closedRef.current && request === imageRequestsRef.current[name]) {
        pendingImagesRef.current[name] = false;
        setPendingImages(current => ({ ...current, [name]: false }));
      }
    }
  }

  function handleRemoveImage(name) {
    if (savingRef.current || closedRef.current) return;
    imageRequestsRef.current[name] += 1;
    pendingImagesRef.current[name] = false;
    imageFilesRef.current[name] = undefined;
    removedImagesRef.current[name] = true;
    if (imageUrlsRef.current[name]) URL.revokeObjectURL(imageUrlsRef.current[name]);
    imageUrlsRef.current[name] = undefined;
    setImagePreviews(current => ({ ...current, [name]: '' }));
    setPendingImages(current => ({ ...current, [name]: false }));
    setImageErrors(current => ({ ...current, [name]: '' }));
    setNotice('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (savingRef.current || closedRef.current || pendingImagesRef.current.banner || pendingImagesRef.current.photo) return;
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

    const request = ++saveRequestRef.current;
    savingRef.current = true;
    setSaving(true);
    try {
      await onSave({
        name: values.name.trim(),
        username: values.username.trim(),
        bio: values.bio,
        location: values.location,
        avatarFile: imageFilesRef.current.photo,
        bannerFile: imageFilesRef.current.banner,
        avatarUrl: removedImagesRef.current.photo ? '' : profile.avatarUrl,
        bannerUrl: removedImagesRef.current.banner ? '' : profile.bannerUrl,
      });
      if (!closedRef.current && request === saveRequestRef.current) handleClose();
    } catch (error) {
      if (!closedRef.current && request === saveRequestRef.current) {
        setNotice(`Could not save your profile. ${error instanceof Error && error.message ? `${error.message} ` : ''}Please try saving again.`);
      }
    } finally {
      if (!closedRef.current && request === saveRequestRef.current) {
        savingRef.current = false;
        setSaving(false);
      }
    }
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
      <form className="edit-profile-form" onSubmit={handleSubmit} aria-busy={saving} noValidate>
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
              disabled={saving}
              onClick={() => imageInputsRef.current.banner.click()}
            >
              <span className="edit-profile-image-overlay" aria-hidden="true">
                <IoImageOutline className="icon" size={28} focusable="false" />
                <span>Change Banner</span>
              </span>
            </button>
          </div>
          <div className="edit-profile-photo">
            <Avatar initials={initials} src={imagePreviews.photo} accent />
            <button
              className="edit-profile-image-button"
              type="button"
              aria-label="Change profile photo"
              aria-describedby={`${formId}-image-hint${imageErrors.photo ? ` ${formId}-photo-error` : ''}`}
              disabled={saving}
              onClick={() => imageInputsRef.current.photo.click()}
            >
              <span className="edit-profile-image-overlay" aria-hidden="true">
                <IoCameraOutline className="icon" size={24} focusable="false" />
              </span>
            </button>
          </div>
          {(imagePreviews.banner || imagePreviews.photo) && (
            <div className="edit-profile-remove-images">
              {imagePreviews.banner && <button type="button" disabled={saving} onClick={() => handleRemoveImage('banner')}>Remove banner</button>}
              {imagePreviews.photo && <button type="button" disabled={saving} onClick={() => handleRemoveImage('photo')}>Remove photo</button>}
            </div>
          )}
          <input ref={node => { imageInputsRef.current.banner = node; }} type="file" name="banner" aria-label="Choose banner image" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} disabled={saving} hidden />
          <input ref={node => { imageInputsRef.current.photo = node; }} type="file" name="photo" aria-label="Choose profile photo" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} disabled={saving} hidden />
          <p className="edit-profile-image-hint" id={`${formId}-image-hint`}>Select the banner or photo to change it. PNG/JPG/WebP · up to 10 MB</p>
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
            disabled={saving}
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
              disabled={saving}
              aria-invalid={Boolean(errors.username)}
              aria-describedby={errors.username ? `${formId}-username-error` : undefined}
            />
          </div>
          {errors.username && <p className="edit-profile-error" id={`${formId}-username-error`} role="alert">{errors.username}</p>}
        </div>
        <div className="edit-profile-field">
          <label htmlFor={`${formId}-bio`}>Bio <span>(optional)</span></label>
          <textarea id={`${formId}-bio`} name="bio" rows={4} value={values.bio} onChange={handleChange} disabled={saving} />
        </div>
        <div className="edit-profile-field">
          <label htmlFor={`${formId}-location`}>Location <span>(optional)</span></label>
          <input id={`${formId}-location`} name="location" type="text" placeholder="City, country" value={values.location} onChange={handleChange} disabled={saving} />
        </div>
        <div className="edit-profile-notice" role="status">{notice || (saving ? 'Saving your profile…' : pendingImages.banner || pendingImages.photo ? 'Checking your image…' : '')}</div>
        <footer className="edit-profile-actions">
          <button className="edit-profile-secondary" type="button" onClick={handleClose}>Cancel</button>
          <button className="edit-profile-submit" type="submit" disabled={saving || pendingImages.banner || pendingImages.photo}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </footer>
      </form>
    </dialog>
  );
}
