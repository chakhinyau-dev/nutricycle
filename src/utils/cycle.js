import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameDay,
  parseISO,
  startOfDay,
} from 'date-fns';

export const DEFAULT_CYCLE_PROFILE = {
  currentPhase: 'follicular',
  cycleLength: 28,
  periodLength: 5,
  lastPeriodStart: format(new Date(), 'yyyy-MM-dd'),
  isPremium: false,
};

export const PHASE_LABELS = {
  menstrual: 'Menstrual',
  follicular: 'Folicular',
  ovulation: 'Ovulación',
  luteal: 'Lútea',
};

const clampInteger = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
};

export const normalizeCycleProfile = (profile = {}) => ({
  currentPhase: profile.currentPhase || profile.current_phase || DEFAULT_CYCLE_PROFILE.currentPhase,
  cycleLength: clampInteger(
    profile.cycleLength || profile.cycle_length,
    DEFAULT_CYCLE_PROFILE.cycleLength,
    21,
    40
  ),
  periodLength: clampInteger(
    profile.periodLength || profile.period_length,
    DEFAULT_CYCLE_PROFILE.periodLength,
    2,
    10
  ),
  lastPeriodStart:
    profile.lastPeriodStart || profile.last_period_start || DEFAULT_CYCLE_PROFILE.lastPeriodStart,
  isPremium: Boolean(profile.isPremium || profile.is_premium || false),
});

export const isValidCycleDate = (value) => {
  if (!value || typeof value !== 'string') {
    return false;
  }

  const parsed = parseISO(value);
  return !Number.isNaN(parsed.getTime());
};

const getSafeDate = (dateLike) => {
  if (dateLike instanceof Date) {
    return startOfDay(dateLike);
  }

  if (typeof dateLike === 'string' && isValidCycleDate(dateLike)) {
    return startOfDay(parseISO(dateLike));
  }

  return startOfDay(new Date(DEFAULT_CYCLE_PROFILE.lastPeriodStart));
};

export const getCyclePhaseKey = (dayInCycle, cycleLength, periodLength) => {
  const ovulationDay = Math.max(periodLength + 6, cycleLength - 14);
  const fertileStart = Math.max(periodLength + 1, ovulationDay - 2);
  const fertileEnd = Math.min(cycleLength, ovulationDay + 1);

  if (dayInCycle <= periodLength) {
    return 'menstrual';
  }

  if (dayInCycle >= fertileStart && dayInCycle <= fertileEnd) {
    return 'ovulation';
  }

  if (dayInCycle < fertileStart) {
    return 'follicular';
  }

  return 'luteal';
};

export const getCycleInsights = (inputProfile = {}, now = new Date()) => {
  const profile = normalizeCycleProfile(inputProfile);
  const today = startOfDay(now);
  const lastPeriodStart = getSafeDate(profile.lastPeriodStart);
  const cycleLength = profile.cycleLength;
  const periodLength = Math.min(profile.periodLength, cycleLength - 1);
  const diff = differenceInCalendarDays(today, lastPeriodStart);
  const normalizedDiff = diff >= 0 ? diff : 0;
  const cycleDay = (normalizedDiff % cycleLength) + 1;
  const phaseKey = getCyclePhaseKey(cycleDay, cycleLength, periodLength);
  const completedCycles = Math.floor(normalizedDiff / cycleLength);
  const currentCycleStart = addDays(lastPeriodStart, completedCycles * cycleLength);
  const nextPeriodStart = addDays(currentCycleStart, cycleLength);
  const daysUntilNextPeriod = differenceInCalendarDays(nextPeriodStart, today);
  const ovulationDay = Math.max(periodLength + 6, cycleLength - 14);
  const fertileStartDay = Math.max(periodLength + 1, ovulationDay - 2);
  const fertileEndDay = Math.min(cycleLength, ovulationDay + 1);
  const ovulationDate = addDays(currentCycleStart, ovulationDay - 1);

  return {
    ...profile,
    cycleDay,
    currentPhaseKey: phaseKey,
    currentPhaseLabel: PHASE_LABELS[phaseKey],
    currentCycleStart,
    nextPeriodStart,
    daysUntilNextPeriod,
    ovulationDay,
    ovulationDate,
    fertileStartDay,
    fertileEndDay,
    fertileWindowLabel: `${fertileStartDay}-${fertileEndDay}`,
  };
};

export const getCycleDayForDate = (inputProfile = {}, targetDate = new Date()) => {
  const profile = normalizeCycleProfile(inputProfile);
  const date = startOfDay(targetDate);
  const lastPeriodStart = getSafeDate(profile.lastPeriodStart);
  const diff = differenceInCalendarDays(date, lastPeriodStart);

  if (diff < 0) {
    return null;
  }

  return (diff % profile.cycleLength) + 1;
};

export const getPhaseForDate = (inputProfile = {}, targetDate = new Date()) => {
  const profile = normalizeCycleProfile(inputProfile);
  const day = getCycleDayForDate(profile, targetDate);

  if (!day) {
    return null;
  }

  return getCyclePhaseKey(day, profile.cycleLength, profile.periodLength);
};

export const isPeriodDate = (inputProfile = {}, targetDate = new Date()) => {
  const profile = normalizeCycleProfile(inputProfile);
  const day = getCycleDayForDate(profile, targetDate);
  return Boolean(day && day <= profile.periodLength);
};

export const isFertileDate = (inputProfile = {}, targetDate = new Date()) => {
  const info = getCycleInsights(inputProfile, targetDate);
  return info.cycleDay >= info.fertileStartDay && info.cycleDay <= info.fertileEndDay;
};

export const isTodayDate = (targetDate) => isSameDay(startOfDay(targetDate), startOfDay(new Date()));
