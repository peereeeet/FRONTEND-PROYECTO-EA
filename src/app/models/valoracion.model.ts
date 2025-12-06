export interface Valoracion {
  _id: string;
  evento: string;
  userId?: string;
  username?: string;
  puntuacion: number;
  comentario?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValoracionesPage {
  data: Valoracion[];
  page: number;
  totalPages: number;
  totalItems: number;
}
