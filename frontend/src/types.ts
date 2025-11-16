export interface DigestQuestion {
  question: string;
  answer: string;
  follow_up_question?: string | null;
  follow_up_answer?: string | null;
}

export interface DigestItem {
  title: string;
  headline: string;
  happened: string[];
  impact: string[];
  actions: string[];
  core_insights: string[];
  info_checks: string[];
  more_thoughts: string[];
  key_questions: DigestQuestion[];
  text_summary: string;
  audio_base64?: string | null;
  audio_url?: string | null;
  transcript_url: string;
  source_url: string;
  published_at?: string | null;
}

export interface DailyDigest {
  date: string;
  intro: string;
  items: DigestItem[];
  one_minute_brief: string;
}
