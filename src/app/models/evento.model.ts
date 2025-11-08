export interface Evento {
  _id?: string;
  name: string;
  schedule: string | string[];
  address?: string;
  participantes?: string[];
  creador?: {        
    _id: string;
    username: string;
    gmail: string;
  } | string;
  avgRating?: number;
  ratingsCount?: number;
}