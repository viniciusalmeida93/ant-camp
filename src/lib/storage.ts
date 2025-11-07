import { Championship, Category, WOD, Athlete, Team, Registration } from './types';

const STORAGE_KEYS = {
  CHAMPIONSHIP: 'crossfit-championship',
  CATEGORIES: 'crossfit-categories',
  WODS: 'crossfit-wods',
  ATHLETES: 'crossfit-athletes',
  TEAMS: 'crossfit-teams',
  REGISTRATIONS: 'crossfit-registrations',
};

// Championship
export const getChampionship = (): Championship | null => {
  const data = localStorage.getItem(STORAGE_KEYS.CHAMPIONSHIP);
  return data ? JSON.parse(data) : null;
};

export const saveChampionship = (championship: Championship): void => {
  localStorage.setItem(STORAGE_KEYS.CHAMPIONSHIP, JSON.stringify(championship));
};

// Categories
export const getCategories = (): Category[] => {
  const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
  return data ? JSON.parse(data) : [];
};

export const saveCategories = (categories: Category[]): void => {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
};

// WODs
export const getWODs = (): WOD[] => {
  const data = localStorage.getItem(STORAGE_KEYS.WODS);
  return data ? JSON.parse(data) : [];
};

export const saveWODs = (wods: WOD[]): void => {
  localStorage.setItem(STORAGE_KEYS.WODS, JSON.stringify(wods));
};

// Athletes
export const getAthletes = (): Athlete[] => {
  const data = localStorage.getItem(STORAGE_KEYS.ATHLETES);
  return data ? JSON.parse(data) : [];
};

export const saveAthletes = (athletes: Athlete[]): void => {
  localStorage.setItem(STORAGE_KEYS.ATHLETES, JSON.stringify(athletes));
};

// Teams
export const getTeams = (): Team[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TEAMS);
  return data ? JSON.parse(data) : [];
};

export const saveTeams = (teams: Team[]): void => {
  localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
};

// Registrations
export const getRegistrations = (): Registration[] => {
  const data = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
  return data ? JSON.parse(data) : [];
};

export const saveRegistrations = (registrations: Registration[]): void => {
  localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations));
};

// Scoring Configs
const SCORING_CONFIGS_KEY = 'crossfit-scoring-configs';

export const getScoringConfigs = (): any[] => {
  const data = localStorage.getItem(SCORING_CONFIGS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveScoringConfigs = (configs: any[]): void => {
  localStorage.setItem(SCORING_CONFIGS_KEY, JSON.stringify(configs));
};

// WOD Results
const WOD_RESULTS_KEY = 'crossfit-wod-results';

export const getWODResults = (): any[] => {
  const data = localStorage.getItem(WOD_RESULTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveWODResults = (results: any[]): void => {
  localStorage.setItem(WOD_RESULTS_KEY, JSON.stringify(results));
};

// Heat Configs
const HEAT_CONFIGS_KEY = 'crossfit-heat-configs';

export const getHeatConfigs = (): any[] => {
  const data = localStorage.getItem(HEAT_CONFIGS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveHeatConfigs = (configs: any[]): void => {
  localStorage.setItem(HEAT_CONFIGS_KEY, JSON.stringify(configs));
};

// Heats
const HEATS_KEY = 'crossfit-heats';

export const getHeats = (): any[] => {
  const data = localStorage.getItem(HEATS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveHeats = (heats: any[]): void => {
  localStorage.setItem(HEATS_KEY, JSON.stringify(heats));
};
