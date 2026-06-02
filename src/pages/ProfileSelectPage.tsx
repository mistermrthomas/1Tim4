import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME } from '../constants/brand';
import { useProfile } from '../context/ProfileContext';
import { HeroArt } from '../components/illustrations/FieldGuideArt';
import './ProfileSelectPage.css';

interface ProfileSelectPageProps {
  /** When true, user is switching profiles (already inside the app). */
  switching?: boolean;
}

export function ProfileSelectPage({ switching }: ProfileSelectPageProps) {
  const navigate = useNavigate();
  const { profiles, selectProfile, createAndSelectProfile, signOutProfile } = useProfile();
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const handleSelect = (profileId: string) => {
    selectProfile(profileId);
    navigate('/', { replace: true });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = newName.trim();
    if (!trimmed) {
      setError('Enter a name for this profile.');
      return;
    }
    if (profiles.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('A profile with this name already exists.');
      return;
    }
    createAndSelectProfile(trimmed);
    setNewName('');
    navigate('/', { replace: true });
  };

  const handleBack = () => {
    if (switching) {
      navigate(-1);
    }
  };

  return (
    <main className="profile-select page-content page-content--profile-entry">
      <div className="profile-select__backdrop" aria-hidden="true">
        <HeroArt visualKey="default" alt="" className="profile-select__backdrop-art" />
        <div className="profile-select__backdrop-scrim" />
      </div>

      <div className="profile-select__overlay">
        <article className="profile-select__card">
          <header className="profile-select__header">
            <p className="profile-select__brand eyebrow">{APP_NAME}</p>
            <h1 className="profile-select__title serif">
              {switching ? 'Switch profile' : 'Choose your path'}
            </h1>
          </header>

          <p className="profile-select__lead">
            {switching
              ? 'Each profile keeps its own assessment, training plan, journal, and prayers on this device.'
              : 'Select a profile to begin. Michael and Bailey are ready for independent testing — each with separate data.'}
          </p>

          <ul className="profile-select__list">
            {profiles.map((profile) => (
              <li key={profile.id}>
                <button
                  type="button"
                  className="profile-select__profile-btn"
                  onClick={() => handleSelect(profile.id)}
                >
                  <span className="profile-select__profile-name serif">{profile.name}</span>
                  <span className="profile-select__profile-action">
                    {switching ? 'Switch' : 'Continue'}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <form className="profile-select__create" onSubmit={handleCreate}>
            <p className="field-label">Create another profile</p>
            <div className="profile-select__create-row">
              <input
                className="text-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name"
                aria-label="New profile name"
              />
              <button type="submit" className="btn btn-secondary profile-select__create-btn">
                Add
              </button>
            </div>
            {error && <p className="field-hint profile-select__error">{error}</p>}
          </form>

          {switching && (
            <button type="button" className="btn btn-ghost profile-select__cancel" onClick={handleBack}>
              Cancel
            </button>
          )}
        </article>

        {switching && (
          <p className="profile-select__hint">
            <button
              type="button"
              className="section-link profile-select__hint-link"
              onClick={() => {
                signOutProfile();
                navigate('/', { replace: true });
              }}
            >
              Sign out of current profile
            </button>
            {' '}to return to this screen on next visit.
          </p>
        )}
      </div>
    </main>
  );
}
