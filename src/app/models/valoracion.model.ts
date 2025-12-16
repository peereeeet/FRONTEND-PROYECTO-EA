export interface Valoracion {
  _id: string;
  evento: string;
  usuario: {
    _id: string;
    username: string;
    gmail?: string;
  };
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