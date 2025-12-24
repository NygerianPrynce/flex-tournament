export type Sport = 'basketball' | 'football' | 'soccer' | 'volleyball' | 'tennis' | 'baseball' | 'hockey' | 'custom';

export interface SportConfig {
  name: string;
  venueTerm: string; // "court", "field", "pitch", etc.
  venueTermPlural: string;
  primaryColor: string;
  secondaryColor: string;
}

export const SPORT_CONFIGS: Record<Sport, SportConfig> = {
  basketball: {
    name: 'Basketball',
    venueTerm: 'Court',
    venueTermPlural: 'Courts',
    primaryColor: 'orange',
    secondaryColor: 'orange',
  },
  football: {
    name: 'Football',
    venueTerm: 'Field',
    venueTermPlural: 'Fields',
    primaryColor: 'green',
    secondaryColor: 'green',
  },
  soccer: {
    name: 'Soccer',
    venueTerm: 'Field',
    venueTermPlural: 'Fields',
    primaryColor: 'green',
    secondaryColor: 'green',
  },
  volleyball: {
    name: 'Volleyball',
    venueTerm: 'Court',
    venueTermPlural: 'Courts',
    primaryColor: 'orange',
    secondaryColor: 'orange',
  },
  tennis: {
    name: 'Tennis',
    venueTerm: 'Court',
    venueTermPlural: 'Courts',
    primaryColor: 'green',
    secondaryColor: 'green',
  },
  baseball: {
    name: 'Baseball',
    venueTerm: 'Field',
    venueTermPlural: 'Fields',
    primaryColor: 'green',
    secondaryColor: 'green',
  },
  hockey: {
    name: 'Hockey',
    venueTerm: 'Rink',
    venueTermPlural: 'Rinks',
    primaryColor: 'blue',
    secondaryColor: 'blue',
  },
  custom: {
    name: 'Custom',
    venueTerm: 'Venue',
    venueTermPlural: 'Venues',
    primaryColor: 'orange',
    secondaryColor: 'orange',
  },
};

export function getSportConfig(sport: Sport): SportConfig {
  return SPORT_CONFIGS[sport] || SPORT_CONFIGS.custom;
}

