import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { Comentario } from '../../models/comentario.model';
import { ComentarioService } from '../../services/comentario.service';
import { UserService } from '../../services/user.service';
import { EventoService } from '../../services/evento.service';
import { User } from '../../models/user.model';
import { Evento } from '../../models/evento.model';

@Component({
  selector: 'app-comentarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './comentarios.component.html',
  styleUrls: ['./comentarios.component.css']
})
export class ComentariosComponent implements OnInit {
  comentarios: Comentario[] = [];
  usuarios: User[] = [];
  eventos: Evento[] = [];
  
  nuevoComentario: Comentario = {
    contenido: '',
    fechaCreacion: new Date(),
    usuario: '',
    evento: '',
    likes: 0
  };

  // Variables de paginación
  page = 1;
  limit = 5;
  totalPages = 1;
  total = 0;

  // Variables de búsqueda
  searchQuery = '';
  isSearching = false;

  // Variables de edición
  editingComentario: Comentario | null = null;
  editIndex: number | null = null;

  // Variables de modal
  showDeleteModal = false;
  pendingDeleteId: string | null = null;

  // Variables de filtro
  selectedEventoFilter = '';

  errorMessage = '';

  constructor(
    private comentarioService: ComentarioService,
    private userService: UserService,
    private eventoService: EventoService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.loadComentarios();
    this.loadUsers();
    this.loadEventos();
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.usuarios = users;
      },
      error: (err) => console.error('Error cargando usuarios:', err)
    });
  }

  loadEventos(): void {
    this.eventoService.getEventos().subscribe({
      next: (eventos) => {
        this.eventos = eventos;
      },
      error: (err) => console.error('Error cargando eventos:', err)
    });
  }

  loadComentarios(): void {
    this.comentarioService.getAllComentarios(this.page, this.limit).subscribe({
      next: (result) => {
        this.comentarios = result.comentarios;
        this.total = result.total;
        this.totalPages = result.totalPages;
      },
      error: (err) => {
        console.error('Error cargando comentarios:', err);
        this.errorMessage = 'Error al cargar los comentarios';
      }
    });
  }

  filterByEvento(): void {
    if (!this.selectedEventoFilter) {
      this.isSearching = false;
      this.page = 1;
      this.loadComentarios();
      return;
    }

    this.isSearching = true;
    this.comentarioService.getComentariosByEvento(this.selectedEventoFilter, this.page, this.limit).subscribe({
      next: (result) => {
        this.comentarios = result.comentarios;
        this.total = result.total;
        this.totalPages = result.totalPages;
      },
      error: (err) => {
        console.error('Error filtrando por evento:', err);
        this.errorMessage = 'Error al filtrar comentarios';
      }
    });
  }

  searchComentarios(): void {
    if (!this.searchQuery.trim()) {
      this.isSearching = false;
      this.selectedEventoFilter = '';
      this.page = 1;
      this.loadComentarios();
      return;
    }

    this.isSearching = true;
    this.selectedEventoFilter = '';
    this.comentarioService.searchComentarios(this.searchQuery, this.page, this.limit).subscribe({
      next: (result) => {
        this.comentarios = result.comentarios;
        this.total = result.total;
        this.totalPages = result.totalPages;
      },
      error: (err) => {
        console.error('Error buscando comentarios:', err);
        this.errorMessage = 'Error en la búsqueda';
      }
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.selectedEventoFilter = '';
    this.isSearching = false;
    this.page = 1;
    this.loadComentarios();
  }

  onSubmit(): void {
    this.errorMessage = '';

    if (!this.nuevoComentario.contenido.trim()) {
      this.errorMessage = 'El contenido del comentario es obligatorio';
      return;
    }

    if (!this.nuevoComentario.usuario) {
      this.errorMessage = 'Debes seleccionar un usuario';
      return;
    }

    if (!this.nuevoComentario.evento) {
      this.errorMessage = 'Debes seleccionar un evento';
      return;
    }

    if (this.editingComentario && this.editIndex !== null) {
      this.updateComentario();
    } else {
      this.createComentario();
    }
  }

  createComentario(): void {
    const comentarioData = {
      ...this.nuevoComentario,
      fechaCreacion: new Date()
    };

    this.comentarioService.createComentario(comentarioData).subscribe({
      next: (response) => {
        this.resetForm();
        this.loadComentarios();
        this.errorMessage = '';
      },
      error: (err) => {
        console.error('Error creando comentario:', err);
        this.errorMessage = 'Error al crear el comentario';
      }
    });
  }

  updateComentario(): void {
    if (!this.editingComentario?._id) return;

    const dataToUpdate = {
      contenido: this.nuevoComentario.contenido,
      likes: this.nuevoComentario.likes
    };

    this.comentarioService.updateComentario(this.editingComentario._id, dataToUpdate).subscribe({
      next: (response) => {
        this.resetForm();
        this.loadComentarios();
        this.errorMessage = '';
      },
      error: (err) => {
        console.error('Error actualizando comentario:', err);
        this.errorMessage = 'Error al actualizar el comentario';
      }
    });
  }

  prepareEdit(comentario: Comentario, index: number): void {
    this.editingComentario = { ...comentario };
    this.editIndex = index;
    
    this.nuevoComentario = {
      contenido: comentario.contenido,
      fechaCreacion: comentario.fechaCreacion,
      usuario: typeof comentario.usuario === 'string' ? comentario.usuario : comentario.usuario._id,
      evento: typeof comentario.evento === 'string' ? comentario.evento : comentario.evento._id,
      likes: comentario.likes
    };

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.resetForm();
  }

  openDeleteModal(id: string): void {
    this.pendingDeleteId = id;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.pendingDeleteId = null;
    this.showDeleteModal = false;
  }

  confirmDelete(): void {
    if (!this.pendingDeleteId) return;

    this.comentarioService.deleteComentario(this.pendingDeleteId).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.loadComentarios();
      },
      error: (err) => {
        console.error('Error eliminando comentario:', err);
        this.errorMessage = 'Error al eliminar el comentario';
        this.closeDeleteModal();
      }
    });
  }

  likeComentario(id: string): void {
    if (!id) return;

    this.comentarioService.likeComentario(id).subscribe({
      next: () => {
        this.loadComentarios();
      },
      error: (err) => {
        console.error('Error dando like:', err);
        this.errorMessage = 'Error al dar like';
      }
    });
  }

  resetForm(): void {
    this.nuevoComentario = {
      contenido: '',
      fechaCreacion: new Date(),
      usuario: '',
      evento: '',
      likes: 0
    };
    this.editingComentario = null;
    this.editIndex = null;
    this.errorMessage = '';
  }

  // Paginación
  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      if (this.isSearching) {
        if (this.searchQuery) {
          this.searchComentarios();
        } else if (this.selectedEventoFilter) {
          this.filterByEvento();
        }
      } else {
        this.loadComentarios();
      }
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      if (this.isSearching) {
        if (this.searchQuery) {
          this.searchComentarios();
        } else if (this.selectedEventoFilter) {
          this.filterByEvento();
        }
      } else {
        this.loadComentarios();
      }
    }
  }

  changePageSize(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.limit = parseInt(select.value);
    this.page = 1;
    
    if (this.isSearching) {
      if (this.searchQuery) {
        this.searchComentarios();
      } else if (this.selectedEventoFilter) {
        this.filterByEvento();
      }
    } else {
      this.loadComentarios();
    }
  }

  // Utilidades
  getUserName(usuario: any): string {
    if (typeof usuario === 'string') {
      const user = this.usuarios.find(u => u._id === usuario);
      return user ? user.username : 'Usuario desconocido';
    }
    return usuario.username || 'Usuario desconocido';
  }

  getEventoName(evento: any): string {
    if (typeof evento === 'string') {
      const ev = this.eventos.find(e => e._id === evento);
      return ev ? ev.name : 'Evento desconocido';
    }
    return evento.name || 'Evento desconocido';
  }

  goHome(): void {
    this.location.back();
  }
}