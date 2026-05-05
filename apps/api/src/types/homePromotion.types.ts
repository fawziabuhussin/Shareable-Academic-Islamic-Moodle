export interface HomePromotionDTO {
  id: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  linkUrlMale: string | null;
  linkLabelMale: string | null;
  linkUrlFemale: string | null;
  linkLabelFemale: string | null;
  zoomUrl: string | null;
  youtubeUrl: string | null;
  active: boolean;
  sortOrder: number;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHomePromotionDTO {
  title: string;
  body?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
  linkUrlMale?: string | null;
  linkLabelMale?: string | null;
  linkUrlFemale?: string | null;
  linkLabelFemale?: string | null;
  zoomUrl?: string | null;
  youtubeUrl?: string | null;
  active?: boolean;
  sortOrder?: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
}

export interface UpdateHomePromotionDTO {
  title?: string;
  body?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
  linkUrlMale?: string | null;
  linkLabelMale?: string | null;
  linkUrlFemale?: string | null;
  linkLabelFemale?: string | null;
  zoomUrl?: string | null;
  youtubeUrl?: string | null;
  active?: boolean;
  sortOrder?: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
}
