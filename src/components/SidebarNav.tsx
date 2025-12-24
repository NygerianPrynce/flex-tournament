import { Link, useLocation } from 'react-router-dom';
import { useSport } from '../hooks/useSport';

interface NavItem {
  path: string;
  label: string;
  icon?: string;
  getLabel?: (venueTerm: string) => string;
}

const navItems: NavItem[] = [
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
  
  return (
    <div className="w-64 bg-light-off-white shadow-lg min-h-screen p-6 border-r-2 border-light-warm-gray">
      <div className="mb-8">
        <h1 className="text-2xl font-heading uppercase tracking-wide-heading text-accent-orange" style={{ fontStyle: 'oblique' }}>
          bracketooski
        </h1>
        <div className="divider-orange mt-2"></div>
      </div>
      
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path === '/tournament/courts' && location.pathname === '/tournament');
          
          const displayLabel = item.getLabel ? item.getLabel(venueTermPlural) : item.label;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 transition-all duration-200 ${
                isActive
                  ? 'bg-accent-orange text-dark-near-black font-heading uppercase tracking-wide-heading'
                  : 'text-dark-charcoal hover:text-accent-orange hover:bg-light-warm-gray font-body'
              }`}
              style={isActive ? { transform: 'skewX(-3deg)' } : {}}
            >
              <span style={isActive ? { transform: 'skewX(3deg)' } : {}} className="font-medium">{displayLabel.toUpperCase()}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="mt-8 pt-8 border-t-2 border-light-warm-gray">
        <Link
          to="/"
          className="flex items-center space-x-3 px-4 py-3 text-dark-charcoal hover:text-accent-orange transition-colors font-body"
        >
          <span className="font-medium">EXIT TOURNAMENT</span>
        </Link>
      </div>
    </div>
  );
}

