export interface Evento {
  _id?: string;
  name: string;
  schedule: string | string[];
  address?: string;
  lat?: number;
  lng?: number;
  participantes?: string[];
  creador?: {        
    _id: string;
    username: string;
    gmail: string;
  } | string;
  avgRating?: number;
  ratingsCount?: number;
}