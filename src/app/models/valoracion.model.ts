export interface Valoracion {
  _id: string;
  evento: string;
  puntuacion: number;    // 1..5
  comentario?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ValoracionesPage {
  data: Valoracion[];
  page: number;
  totalPages: number;
  totalItems: number;
}
