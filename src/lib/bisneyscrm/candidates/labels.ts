import type {
  BisneysCandidateProfileStatus, BisneysEducationLevel, BisneysAvailabilityStatus,
  BisneysRelocationPreference, BisneysExperienceLevel, BisneysLanguageLevel, BisneysCandidateSource,
  BisneysApplicationStatus, BisneysInterviewStatus, BisneysInterviewType, BisneysContactChannel, BisneysContactOutcome,
  BisneysAssessmentKind, BisneysAssessmentRecommendation,
} from "@/generated/prisma/client";

export const ASSESSMENT_KIND_LABELS: Record<BisneysAssessmentKind, string> = { QUESTIONNAIRE: "Upitnik", INTERVIEW: "Intervju" };
export const ASSESSMENT_RECOMMENDATION_LABELS: Record<BisneysAssessmentRecommendation, string> = {
  STRONG_YES: "Snažna preporuka", YES: "Preporuka", MAYBE: "Uvjetna preporuka", NO: "Ne preporučuje se", STRONG_NO: "Izrazito se ne preporučuje",
};

export const APPLICATION_STATUS_LABELS: Record<BisneysApplicationStatus, string> = {
  APPLIED: "Prijavljen", NEW: "Novo", UNDER_REVIEW: "U pregledu", CONTACT_ATTEMPTED: "Pokušan kontakt",
  CONTACTED: "Kontaktiran", SCREENING_SCHEDULED: "Screening zakazan", SCREENING_CONFIRMED: "Screening potvrđen",
  SCREENING_COMPLETED: "Screening obavljen", QUALIFIED: "Kvalificiran", NOT_QUALIFIED: "Nije kvalificiran",
  SENT_TO_CLIENT: "Poslan klijentu", CLIENT_REVIEW: "Klijent pregledava", CLIENT_INTERVIEW: "Intervju kod klijenta",
  OFFER_PENDING: "Ponuda u pripremi", OFFERED: "Ponuda poslana", HIRED: "Zaposlen", REJECTED: "Odbijen",
  WITHDRAWN: "Odustao", ON_HOLD: "Na čekanju", NO_RESPONSE: "Bez odgovora", NO_SHOW: "Nije došao", CLOSED: "Zatvoreno",
};
export const APPLICATION_STATUS_VALUES = Object.keys(APPLICATION_STATUS_LABELS) as BisneysApplicationStatus[];

export const INTERVIEW_STATUS_LABELS: Record<BisneysInterviewStatus, string> = {
  SCHEDULED: "Zakazan", CONFIRMED: "Potvrđen", COMPLETED: "Održan", NO_SHOW: "Nije došao", CANCELLED: "Otkazan", RESCHEDULED: "Pomaknut",
};
export const INTERVIEW_TYPE_LABELS: Record<BisneysInterviewType, string> = {
  PHONE_SCREEN: "Telefonski screening", VIDEO_INTERVIEW: "Video intervju", IN_PERSON_INTERVIEW: "Intervju uživo",
  TECHNICAL_INTERVIEW: "Tehnički intervju", CLIENT_INTERVIEW: "Intervju kod klijenta", FOLLOW_UP_INTERVIEW: "Follow-up intervju", OTHER: "Ostalo",
};
export const INTERVIEW_TYPE_VALUES = Object.keys(INTERVIEW_TYPE_LABELS) as BisneysInterviewType[];

export const CONTACT_CHANNEL_LABELS: Record<BisneysContactChannel, string> = {
  CALL: "Poziv", SMS: "SMS", WHATSAPP: "WhatsApp", EMAIL: "Email", LINKEDIN: "LinkedIn", IN_PERSON: "Uživo", OTHER: "Ostalo",
};
export const CONTACT_CHANNEL_VALUES = Object.keys(CONTACT_CHANNEL_LABELS) as BisneysContactChannel[];

export const CONTACT_OUTCOME_LABELS: Record<BisneysContactOutcome, string> = {
  ANSWERED: "Javio se", NO_ANSWER: "Nije se javio", BUSY: "Zauzeto", CALL_BACK: "Nazvati ponovno", WRONG_NUMBER: "Krivi broj",
  UNREACHABLE: "Nedostupan", INTERESTED: "Zainteresiran", NOT_INTERESTED: "Nije zainteresiran", SCHEDULED_INTERVIEW: "Dogovoren razgovor", LEFT_MESSAGE: "Ostavljena poruka",
};
export const CONTACT_OUTCOME_VALUES = Object.keys(CONTACT_OUTCOME_LABELS) as BisneysContactOutcome[];

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
