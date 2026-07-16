import type {
  BisneysCandidateProfileStatus, BisneysEducationLevel, BisneysAvailabilityStatus,
  BisneysRelocationPreference, BisneysExperienceLevel, BisneysLanguageLevel, BisneysCandidateSource,
} from "@/generated/prisma/client";

/** Croatian labels for the candidate-database enums (brief §5–15). */

export const PROFILE_STATUS_LABELS: Record<BisneysCandidateProfileStatus, string> = {
  ACTIVE: "Aktivan", PASSIVE: "Pasivan", TEMPORARILY_UNAVAILABLE: "Privremeno nedostupan",
  UNAVAILABLE: "Nedostupan", DO_NOT_CONTACT: "Ne kontaktirati", ARCHIVED: "Arhiviran",
  DUPLICATE: "Duplikat", DELETED: "Obrisan",
};
export const PROFILE_STATUS_VALUES = Object.keys(PROFILE_STATUS_LABELS) as BisneysCandidateProfileStatus[];

export const EDUCATION_LEVEL_LABELS: Record<BisneysEducationLevel, string> = {
  NO_FORMAL_EDUCATION: "Bez formalnog obrazovanja", PRIMARY_SCHOOL: "Osnovna škola",
  LOWER_VOCATIONAL: "Niža stručna sprema", VOCATIONAL_QUALIFICATION: "KV", SECONDARY_SCHOOL: "SSS",
  SKILLED_WORKER: "KV radnik", HIGHLY_SKILLED_WORKER: "VKV", COLLEGE: "Viša stručna sprema",
  BACHELOR: "Prvostupnik", MASTER: "Magistar", POSTGRADUATE: "Poslijediplomski studij",
  DOCTORATE: "Doktorat", OTHER: "Ostalo",
};
export const EDUCATION_LEVEL_VALUES = Object.keys(EDUCATION_LEVEL_LABELS) as BisneysEducationLevel[];

export const AVAILABILITY_LABELS: Record<BisneysAvailabilityStatus, string> = {
  EMPLOYED_NOT_LOOKING: "Zaposlen — ne traži", EMPLOYED_OPEN: "Zaposlen — otvoren za ponude",
  AVAILABLE_IMMEDIATELY: "Dostupan odmah", AVAILABLE_FROM: "Dostupan od datuma", UNKNOWN: "Nepoznato",
};
export const AVAILABILITY_VALUES = Object.keys(AVAILABILITY_LABELS) as BisneysAvailabilityStatus[];

export const RELOCATION_LABELS: Record<BisneysRelocationPreference, string> = {
  NO: "Ne", LOCAL_ONLY: "Lokalno", CROATIA: "Unutar Hrvatske", EU: "Unutar EU", ANYWHERE: "Bilo gdje", CONDITIONAL: "Ovisno o ponudi",
};
export const RELOCATION_VALUES = Object.keys(RELOCATION_LABELS) as BisneysRelocationPreference[];

export const EXPERIENCE_LEVEL_LABELS: Record<BisneysExperienceLevel, string> = {
  BEGINNER: "Početnik", JUNIOR: "Junior", INTERMEDIATE: "Srednja razina", INDEPENDENT: "Samostalan",
  SENIOR: "Senior", LEAD: "Voditelj", EXPERT: "Ekspert",
};
export const EXPERIENCE_LEVEL_VALUES = Object.keys(EXPERIENCE_LEVEL_LABELS) as BisneysExperienceLevel[];

export const LANGUAGE_LEVEL_LABELS: Record<BisneysLanguageLevel, string> = {
  A1: "A1", A2: "A2", B1: "B1", B2: "B2", C1: "C1", C2: "C2", NATIVE: "Materinski", UNKNOWN: "Nepoznato",
};

export const CANDIDATE_SOURCE_LABELS: Record<BisneysCandidateSource, string> = {
  TRELLO: "Trello", WEBSITE: "Web stranica", META: "Meta", FACEBOOK: "Facebook", INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn", MOJ_POSAO: "MojPosao", EMAIL: "Email", PHONE: "Telefon", WHATSAPP: "WhatsApp",
  REFERRAL: "Preporuka", DIRECT_SOURCING: "Direktni sourcing", IMPORT: "Uvoz", OTHER: "Ostalo",
};
export const CANDIDATE_SOURCE_VALUES = Object.keys(CANDIDATE_SOURCE_LABELS) as BisneysCandidateSource[];
