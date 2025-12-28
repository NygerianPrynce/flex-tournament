import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function Landing() {
  const navigate = useNavigate();
  const [shareCode, setShareCode] = useState('');
  const [shareCodeError, setShareCodeError] = useState('');

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/tournaments');
      }
    });
  }, [navigate]);
  
  const handleViewTournament = (e: React.FormEvent) => {
    e.preventDefault();
    const code = shareCode.trim().toUpperCase();
    
    if (!code) {
      setShareCodeError('Please enter a share code');
      return;
    }
    
    if (code.length !== 6) {
      setShareCodeError('Share code must be 6 characters');
      return;
    }
    
    // Navigate to viewer mode
    navigate(`/view/${code}`);
  };
  
  return (
    <div className="min-h-screen bg-light-off-white flex items-center justify-center p-4 sm:p-6 relative">
      <div className="max-w-4xl w-full text-center relative z-10">
        <div className="micro-label mb-3 sm:mb-4 md:mb-6 text-xs sm:text-sm">TOURNAMENT MANAGEMENT</div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading uppercase tracking-wide-heading text-accent-orange mb-4 sm:mb-5 md:mb-6 leading-tight" style={{ fontStyle: 'oblique' }}>
          bracketooski
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-light-warm-gray mb-8 sm:mb-10 md:mb-12 font-body max-w-2xl mx-auto leading-relaxed px-2">
          Run tournaments for any sport with ease. Manage brackets, schedules, and games all in one place.
        </p>
        
        {/* Share Code Input Section */}
        <div className="mb-8 sm:mb-10 md:mb-12 max-w-md mx-auto px-2">
          <div className="card bg-dark-charcoal border-2 border-accent-orange/30 p-4 sm:p-6">
            <h3 className="font-heading uppercase tracking-wide-heading text-accent-orange mb-3 sm:mb-4 text-base sm:text-lg" style={{ fontStyle: 'oblique' }}>
              VIEW TOURNAMENT
            </h3>
            <p className="text-xs sm:text-sm text-light-warm-gray mb-3 sm:mb-4">
              Enter a share code to view a tournament
            </p>
            <form onSubmit={handleViewTournament} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={shareCode}
                  onChange={(e) => {
                    setShareCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
                    setShareCodeError('');
                  }}
                  placeholder="ENTER 6-CHARACTER CODE"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 border-accent-orange rounded-lg text-center text-base sm:text-lg md:text-xl font-mono font-bold tracking-wider text-dark-near-black uppercase"
                  maxLength={6}
                />
                {shareCodeError && (
                  <p className="text-red-500 text-xs sm:text-sm mt-2">{shareCodeError}</p>
                )}
              </div>
              <button
                type="submit"
                className="btn-primary w-full text-sm sm:text-base py-2.5 sm:py-3"
                disabled={!shareCode.trim()}
              >
                VIEW TOURNAMENT
              </button>
            </form>
          </div>
        </div>
        
        <div className="space-y-4 mb-12 sm:mb-14 md:mb-16 px-2">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className="px-4 bg-light-off-white text-gray-500 uppercase tracking-wide">OR</span>
            </div>
          </div>
          <Link to="/login" className="block">
            <button className="btn-primary text-base sm:text-lg px-8 sm:px-12 py-3 sm:py-4 w-full md:w-auto">
              <span>SIGN IN / SIGN UP</span>
            </button>
          </Link>
        </div>
        
        <div className="mt-12 sm:mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 px-2">
          <div className="card bg-dark-charcoal text-light-warm-gray border-2 border-accent-orange/20 p-4 sm:p-6">
            <h3 className="font-heading uppercase tracking-wide-heading text-accent-orange mb-2 sm:mb-3 text-sm sm:text-base md:text-lg" style={{ fontStyle: 'oblique' }}>BRACKET MANAGEMENT</h3>
            <p className="text-xs sm:text-sm text-light-warm-gray font-body">Single or double elimination brackets</p>
          </div>
          <div className="card bg-dark-charcoal text-light-warm-gray border-2 border-accent-orange/20 p-4 sm:p-6">
            <h3 className="font-heading uppercase tracking-wide-heading text-accent-orange mb-2 sm:mb-3 text-sm sm:text-base md:text-lg" style={{ fontStyle: 'oblique' }}>LIVE TIMERS</h3>
            <p className="text-xs sm:text-sm text-light-warm-gray font-body">Track warmup, game, and flex time</p>
          </div>
          <div className="card bg-dark-charcoal text-light-warm-gray border-2 border-accent-orange/20 p-4 sm:p-6">
            <h3 className="font-heading uppercase tracking-wide-heading text-accent-orange mb-2 sm:mb-3 text-sm sm:text-base md:text-lg" style={{ fontStyle: 'oblique' }}>REFEREE ASSIGNMENT</h3>
            <p className="text-xs sm:text-sm text-light-warm-gray font-body">Auto-assign or manual ref management</p>
          </div>
        </div>
      </div>
    </div>
  );
}

