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
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleBegin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter your name to continue.');
      return;
    }
    const existing = profiles.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      selectProfile(existing.id);
    } else {
      createAndSelectProfile(trimmed);
    }
    setName('');
    navigate('/', { replace: true });
  };

  const handleSelect = (profileId: string) => {
    selectProfile(profileId);
    navigate('/', { replace: true });
  };

  const handleBack = () => {
    if (switching) navigate('/', { replace: true });
  };

  const isFirstVisit = !switching && profiles.length === 0;

  return (
    <main
      className={`profile-select page-content page-content--profile-entry${
        switching ? ' profile-select--embedded' : ''
      }`}
    >
      <div className="profile-select__backdrop" aria-hidden="true">
        <HeroArt visualKey="default" alt="" className="profile-select__backdrop-art" />
        <div className="profile-select__backdrop-scrim" />
      </div>

      <div className="profile-select__overlay">
        <article className="profile-select__card">
          <header className="profile-select__header">
            <p className="profile-select__brand eyebrow">{APP_NAME}</p>
            <h1 className="profile-select__title serif">
              {switching ? 'Switch profile' : isFirstVisit ? 'Welcome' : 'Welcome back'}
            </h1>
          </header>

          <p className="profile-select__lead">
            {switching
              ? 'Each person on this device keeps a private trail — assessment, journal, and prayers stay separate.'
              : isFirstVisit
                ? 'A companion for walking with God and documenting formation over time. Your trail saves automatically on this device as you go.'
                : 'Continue your trail or start under another name on this device.'}
          </p>

          {isFirstVisit ? (
            <form className="profile-select__welcome-form" onSubmit={handleBegin}>
              <label className="field-label" htmlFor="profile-name">
                What&apos;s your name?
              </label>
              <input
                id="profile-name"
                className="text-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your first name"
                autoComplete="name"
                autoFocus
              />
              {error && <p className="field-hint profile-select__error">{error}</p>}
              <button type="submit" className="btn btn-primary profile-select__begin-btn">
                Begin
              </button>
            </form>
          ) : (
            <>
              {!switching && (
                <form className="profile-select__welcome-form" onSubmit={handleBegin}>
                  <label className="field-label" htmlFor="profile-name-return">
                    New here? What&apos;s your name?
                  </label>
                  <div className="profile-select__create-row">
                    <input
                      id="profile-name-return"
                      className="text-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="First name"
                      autoComplete="name"
                    />
                    <button type="submit" className="btn btn-secondary profile-select__create-btn">
                      Begin
                    </button>
                  </div>
                  {error && <p className="field-hint profile-select__error">{error}</p>}
                </form>
              )}

              {profiles.length > 0 && (
                <>
                  <p className="field-label profile-select__list-label">
                    {switching ? 'Choose a profile' : 'Or continue as'}
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
                          <span className="profile-select__profile-action">Continue</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}

          {switching && (
            <>
              <button type="button" className="btn btn-ghost profile-select__cancel" onClick={handleBack}>
                Cancel
              </button>
              <p className="profile-select__hint-in-card">
                <button
                  type="button"
                  className="section-link"
                  onClick={() => {
                    signOutProfile();
                    navigate('/', { replace: true });
                  }}
                >
                  Sign out
                </button>
                {' '}to show the welcome screen again.
              </p>
            </>
          )}
        </article>
      </div>
    </main>
  );
}
