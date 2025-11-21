export interface Evento {
  _id?: string;
  name: string;
  schedule: string | string[];
  categoria: 'Deporte' | 'Conciertos' | 'Arte ' | 'Fiestas' | 'Voluntariado' | 'Tech' | 'Otros';
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