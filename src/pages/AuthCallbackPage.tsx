import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Finishing sign-in…');

  useEffect(() => {
    if (!supabase) {
      setMessage('Cloud sign-in is not configured.');
      return;
    }

    void (async () => {
      const { error } = await supabase.auth.getSession();
      if (error) {
        setMessage(error.message);
        return;
      }
      navigate('/', { replace: true });
    })();
  }, [navigate]);

  return (
    <main className="page-content" style={{ textAlign: 'center', paddingTop: 48 }}>
      <p className="eyebrow">Path</p>
      <p className="serif" style={{ fontSize: '1.25rem', marginTop: 12 }}>
        {message}
      </p>
    </main>
  );
}
