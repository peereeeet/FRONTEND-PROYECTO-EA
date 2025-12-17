export interface Usuario {
  _id: string;
  username: string;
  gmail: string;
}

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
  categoria?: string;
  avgRating?: number;
  ratingsCount?: number;
  isPrivate?: boolean;
  invitados?: Usuario[] | string[];
  invitacionesPendientes?: Usuario[] | string[];
}

export type EventoCategoria = 
  | 'Fútbol'
  | 'Baloncesto'
  | 'Tenis'
  | 'Pádel'
  | 'Running'
  | 'Ciclismo'
  | 'Natación'
  | 'Yoga'
  | 'Gimnasio'
  | 'Senderismo'
  | 'Escalada'
  | 'Artes Marciales'
  | 'Concierto Rock'
  | 'Concierto Pop'
  | 'Concierto Clásica'
  | 'Jazz'
  | 'Electrónica'
  | 'Hip Hop'
  | 'Karaoke'
  | 'Discoteca'
  | 'Festival Musical'
  | 'Exposición Arte'
  | 'Teatro'
  | 'Cine'
  | 'Museo'
  | 'Literatura'
  | 'Fotografía'
  | 'Pintura'
  | 'Escultura'
  | 'Danza'
  | 'Ópera'
  | 'Restaurante'
  | 'Tapas'
  | 'Cocina Internacional'
  | 'Vinos'
  | 'Cerveza Artesanal'
  | 'Repostería'
  | 'Brunch'
  | 'Food Truck'
  | 'Fiesta Privada'
  | 'Fiesta Temática'
  | 'Cumpleaños'
  | 'Boda'
  | 'Despedida'
  | 'After Work'
  | 'Networking'
  | 'Speed Dating'
  | 'Taller'
  | 'Curso'
  | 'Conferencia'
  | 'Seminario'
  | 'Workshop'
  | 'Idiomas'
  | 'Masterclass'
  | 'Hackathon'
  | 'Meetup Tech'
  | 'Gaming'
  | 'eSports'
  | 'Programación'
  | 'Inteligencia Artificial'
  | 'Blockchain'
  | 'Startups'
  | 'Meditación'
  | 'Spa'
  | 'Wellness'
  | 'Mindfulness'
  | 'Salud Mental'
  | 'Voluntariado Ambiental'
  | 'Voluntariado Social'
  | 'Donación de Sangre'
  | 'Rescate Animal'
  | 'Limpieza Playas'
  | 'Banco de Alimentos'
  | 'Camping'
  | 'Montañismo'
  | 'Playa'
  | 'Barbacoa'
  | 'Picnic'
  | 'Observación Aves'
  | 'Safari'
  | 'Juegos de Mesa'
  | 'Ajedrez'
  | 'Poker'
  | 'Escape Room'
  | 'Paintball'
  | 'Laser Tag'
  | 'Bolos'
  | 'Evento Familiar'
  | 'Parque Infantil'
  | 'Teatro Infantil'
  | 'Animación Infantil'
  | 'Taller Niños'
  | 'Mercadillo'
  | 'Feria'
  | 'Turismo'
  | 'Excursión'
  | 'Compras'
  | 'Otros';

export const CATEGORIAS_EVENTO: EventoCategoria[] = [
  'Fútbol',
  'Baloncesto',
  'Tenis',
  'Pádel',
  'Running',
  'Ciclismo',
  'Natación',
  'Yoga',
  'Gimnasio',
  'Senderismo',
  'Escalada',
  'Artes Marciales',
  'Concierto Rock',
  'Concierto Pop',
  'Concierto Clásica',
  'Jazz',
  'Electrónica',
  'Hip Hop',
  'Karaoke',
  'Discoteca',
  'Festival Musical',
  'Exposición Arte',
  'Teatro',
  'Cine',
  'Museo',
  'Literatura',
  'Fotografía',
  'Pintura',
  'Escultura',
  'Danza',
  'Ópera',
  'Restaurante',
  'Tapas',
  'Cocina Internacional',
  'Vinos',
  'Cerveza Artesanal',
  'Repostería',
  'Brunch',
  'Food Truck',
  'Fiesta Privada',
  'Fiesta Temática',
  'Cumpleaños',
  'Boda',
  'Despedida',
  'After Work',
  'Networking',
  'Speed Dating',
  'Taller',
  'Curso',
  'Conferencia',
  'Seminario',
  'Workshop',
  'Idiomas',
  'Masterclass',
  'Hackathon',
  'Meetup Tech',
  'Gaming',
  'eSports',
  'Programación',
  'Inteligencia Artificial',
  'Blockchain',
  'Startups',
  'Meditación',
  'Spa',
  'Wellness',
  'Mindfulness',
  'Salud Mental',
  'Voluntariado Ambiental',
  'Voluntariado Social',
  'Donación de Sangre',
  'Rescate Animal',
  'Limpieza Playas',
  'Banco de Alimentos',
  'Camping',
  'Montañismo',
  'Playa',
  'Barbacoa',
  'Picnic',
  'Observación Aves',
  'Safari',
  'Juegos de Mesa',
  'Ajedrez',
  'Poker',
  'Escape Room',
  'Paintball',
  'Laser Tag',
  'Bolos',
  'Evento Familiar',
  'Parque Infantil',
  'Teatro Infantil',
  'Animación Infantil',
  'Taller Niños',
  'Mercadillo',
  'Feria',
  'Turismo',
  'Excursión',
  'Compras',
  'Otros'
];