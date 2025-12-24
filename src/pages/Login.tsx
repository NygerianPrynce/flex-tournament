import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { DesktopOnly } from '../components/DesktopOnly';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        // After signup, check if email confirmation is required
        const { data: { user } } = await supabase.auth.getUser();
        if (user && !user.email_confirmed_at) {
          alert('Account created! Please check your email to verify your account, or sign in if email confirmation is disabled.');
        } else {
          // Email confirmation disabled or already confirmed, redirect to tournaments
          navigate('/tournaments');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        navigate('/tournaments');
      }
    } catch (err: any) {
      // Provide more helpful error messages
      if (err.message?.includes('email')) {
        setError('Email confirmation is required. Please check your email or disable email confirmation in Supabase settings.');
      } else {
        setError(err.message || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DesktopOnly>
      <div className="min-h-screen bg-light-off-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-heading uppercase tracking-wide-heading text-accent-orange mb-6 text-center" style={{ fontStyle: 'oblique' }}>
            bracketooski
          </h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-dark-charcoal mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border-2 border-dark-charcoal rounded focus:outline-none focus:ring-2 focus:ring-accent-orange"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-dark-charcoal mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 border-2 border-dark-charcoal rounded focus:outline-none focus:ring-2 focus:ring-accent-orange"
              />
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-500 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 disabled:opacity-50"
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-accent-orange hover:underline"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
            <div>
              <Link
                to="/"
                className="text-dark-charcoal hover:text-accent-orange hover:underline text-sm"
              >
                ← Take me back
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DesktopOnly>
  );
}

