export interface Comentario {
  _id?: string;
  contenido: string;
  fechaCreacion: Date;
  usuario: string | {
    _id: string;
    username: string;
    gmail: string;
  };
  evento: string | {
    _id: string;
    name: string;
    schedule: string[];
  };
  likes: number;
}

export interface ComentarioPaginado {
  comentarios: Comentario[];
  total: number;
  page: number;
  totalPages: number;
}