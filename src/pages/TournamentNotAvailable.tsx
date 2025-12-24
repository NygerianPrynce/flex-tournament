import { Link } from 'react-router-dom';

export function TournamentNotAvailable() {
  return (
    <div className="min-h-screen bg-light-off-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <h1 className="text-3xl font-heading uppercase tracking-wide-heading text-accent-orange mb-4" style={{ fontStyle: 'oblique' }}>
            bracketooski
          </h1>
          <div className="divider-orange mx-auto"></div>
        </div>
        
        <div className="mb-6">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-heading uppercase tracking-wide-heading text-dark-charcoal mb-3" style={{ fontStyle: 'oblique' }}>
            Tournament Not Available
          </h2>
          <p className="text-dark-charcoal text-lg">
            Sorry, this tournament is no longer available.
          </p>
          <p className="text-gray-600 text-sm mt-2">
            It may have been deleted or the share code is incorrect.
          </p>
        </div>

        <div className="space-y-3">
          <Link to="/" className="block">
            <button className="btn-primary w-full">
              Go to Home Page
            </button>
          </Link>
          <Link to="/login" className="block">
            <button className="btn-secondary w-full">
              Sign In / Sign Up
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

