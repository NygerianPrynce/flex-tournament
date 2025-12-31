import { Link, useLocation } from 'react-router-dom';
import { useSport } from '../hooks/useSport';
import { useTournamentStore } from '../store/tournamentStore';

interface NavItem {
  path: string;
  label: string;
  icon?: string;
  getLabel?: (venueTerm: string) => string;
}

const allNavItems: NavItem[] = [
  { path: '/tournament/bracket', label: 'Bracket' },
  { path: '/tournament/courts', label: 'Courts', getLabel: (venueTermPlural) => venueTermPlural },
  { path: '/tournament/teams', label: 'Teams' },
  { path: '/tournament/refs', label: 'Referees' },
  { path: '/tournament/results', label: 'Results' },
  { path: '/tournament/settings', label: 'Settings' },
  { path: '/tournament/info', label: 'Tournament Info' },
];

export function SidebarNav() {
  const location = useLocation();
  const { venueTermPlural } = useSport();
  const tournament = useTournamentStore(state => state.tournament);
  
  // Filter out referees tab if no referees were assigned
  const navItems = allNavItems.filter(item => {
    if (item.path === '/tournament/refs') {
      return tournament && tournament.refs && tournament.refs.length > 0;
    }
    return true;
  });
  
  return (
    <div style={{
      width: '256px',
      background: '#f9fafb',
      minHeight: '100vh',
      padding: '24px',
      borderRight: '1px solid #e5e7eb',
      fontFamily: 'Poppins, sans-serif',
    }}>
      {/* Branding Section */}
      <div style={{ marginBottom: '32px', marginLeft: '-8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <img 
            src="/favicon.png" 
            alt="Bracketooski Logo" 
            style={{ width: '32px', height: '32px' }}
          />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0' }}>
            <span style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#f97316',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              BRACKET
            </span>
            <span style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#fb923c',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              OOSKI
            </span>
          </div>
        </div>
        <div style={{
          height: '2px',
          background: '#f97316',
          width: 'calc(100% + 8px)',
        }} />
      </div>
      
      {/* Navigation Items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path === '/tournament/courts' && location.pathname === '/tournament');
          
          const displayLabel = item.getLabel ? item.getLabel(venueTermPlural) : item.label;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                borderRadius: '0',
                backgroundColor: isActive ? '#f97316' : 'transparent',
                color: isActive ? '#fff' : '#1f2937',
                fontWeight: isActive ? 600 : 500,
                fontSize: '14px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.color = '#f97316';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#1f2937';
                }
              }}
            >
              {displayLabel.toUpperCase()}
            </Link>
          );
        })}
      </nav>
      
      {/* Exit Tournament Section */}
      <div style={{
        marginTop: '32px',
        paddingTop: '24px',
        borderTop: '1px solid #e5e7eb',
      }}>
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            borderRadius: '0',
            color: '#1f2937',
            fontWeight: 500,
            fontSize: '14px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.color = '#f97316';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#1f2937';
          }}
        >
          EXIT TOURNAMENT
        </Link>
      </div>
    </div>
  );
}
