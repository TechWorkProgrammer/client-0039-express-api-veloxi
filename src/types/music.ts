export interface MusicApiData {
  id: string;
  title: string;
  tags: string;
  lyrics: string;
  audio_url: string;
  image_url: string;
  video_url: string;
  state: string;
  task_id: string;
  user_id?: string | null;
  telegram_user_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerateMusicPayload {
  custom_mode: boolean;
  prompt: string;
  mv: string;
  title?: string;
  tags?: string;
  negative_tags?: string;
  make_instrumental?: boolean;
  gpt_description_prompt?: string;
}

export interface MusicApiResponse {
  task_id: string;
  message: string;
}

export interface MusicResultResponse {
  code: number;
  data: MusicApiData[];
  message: string;
}
