import { useTournamentStore } from '../store/tournamentStore';
import { getSportConfig, type Sport } from '../lib/sports';

export function useSport() {
  const { tournament } = useTournamentStore();
  const sport: Sport = tournament?.settings?.sport || 'basketball';
  const config = getSportConfig(sport);
  
  return {
    sport,
    config,
    venueTerm: config.venueTerm,
    venueTermPlural: config.venueTermPlural,
  };
}

