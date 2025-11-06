import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ValoracionService } from '../../services/valoracion.service';
import { Valoracion, ValoracionesPage } from '../../models/valoracion.model';
import { EventoService } from '../../services/evento.service';

@Component({
  selector: 'app-valoracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './valoracion.html',
  styleUrls: ['./valoracion.css']
})
export class ValoracionComponent implements OnInit {
  eventoId!: string;

  eventoName = '';
  avgRating?: number;
  ratingsCount?: number;

  q = '';
  page = 1;
  limit = 10;
  totalPages = 1;
  totalItems = 0;
  list: Valoracion[] = [];
  loadingList = false;

  myScore = 0;
  myComment = '';
  saving = false;

  showDeleteModal = false;
  ratingToDelete: Valoracion | null = null;

  errorMsg = '';
  infoMsg = '';

  hover = 0;
  stars = [1, 2, 3, 4, 5];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ratings: ValoracionService,
    private eventoSrv: EventoService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/evento']);
      return;
    }
    this.eventoId = id;

    const nav = this.router.getCurrentNavigation();
    const st: any = nav?.extras?.state;
    if (st?.eventoName) this.eventoName = st.eventoName;
    if (typeof st?.avgRating === 'number') this.avgRating = st.avgRating;
    if (typeof st?.ratingsCount === 'number') this.ratingsCount = st.ratingsCount;

    this.refreshAggregates();

    if (!this.eventoName) {
      this.eventoSrv.getEventoById(this.eventoId).subscribe({
        next: (ev: any) => { this.eventoName = ev?.name || ev?.title || ''; },
        error: () => { /* opcional: ignorar */ }
      });
    }

    try { window.scrollTo({ top: 0, behavior: 'instant' as any }); } catch { window.scrollTo(0,0); }
    this.loadList();
  }

  loadList() {
    this.loadingList = true;
    this.errorMsg = '';
    this.ratings.listByEvent(this.eventoId, this.page, 6, this.q).subscribe({
      next: (res: ValoracionesPage) => {
        this.list = res.data;
        this.page = res.page;
        this.totalPages = res.totalPages;
        this.totalItems = res.totalItems;
        this.loadingList = false;
      },
      error: (err: HttpErrorResponse) => {
        this.errorMsg = err?.error?.message || 'Error cargando valoraciones';
        this.loadingList = false;
      }
    });
  }

  changePage(delta: number) {
    const p = this.page + delta;
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.loadList();
  }

  search() {
    this.page = 1;
    this.loadList();
  }

  setScore(v: number) {
    this.myScore = v;
  }

  upsert() {
    this.errorMsg = '';
    this.infoMsg = '';

    if (this.myScore < 1 || this.myScore > 5) {
      this.errorMsg = 'Selecciona una puntuación entre 1 y 5.';
      return;
    }

    this.saving = true;
    this.ratings.create(this.eventoId, { puntuacion: this.myScore, comentario: this.myComment }).subscribe({
      next: () => {
        this.infoMsg = '¡Valoración guardada!';
        this.saving = false;
        this.loadList();
        this.refreshAggregates();
      },
      error: (err: HttpErrorResponse) => {
        this.errorMsg = err?.error?.message || 'No se pudo guardar la valoración';
        this.saving = false;
      }
    });
  }

  remove(r: Valoracion) {
    if (!confirm('¿Eliminar esta valoración?')) return;
    this.ratings.delete(r._id).subscribe({
      next: () => this.loadList(),
      error: (err: HttpErrorResponse) => {
        this.errorMsg = err?.error?.message || 'No se pudo eliminar';
      }
    });
  }

  openDeleteModal(r: Valoracion) {
    this.errorMsg = '';
    this.ratingToDelete = r;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.ratingToDelete = null;
  }

  confirmDelete() {
    if (!this.ratingToDelete) return;
    this.ratings.delete(this.ratingToDelete._id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.loadList();
        this.refreshAggregates();
      },
      error: () => {
        this.errorMsg = 'No se pudo eliminar';
        this.closeDeleteModal();
      }
    });
  }

  private refreshAggregates() {
    this.eventoSrv.getEventoById(this.eventoId).subscribe({
      next: (ev: any) => {
        if (!this.eventoName) this.eventoName = ev?.name || ev?.title || '';
        this.avgRating = typeof ev?.avgRating === 'number' ? ev.avgRating : 0;
        this.ratingsCount = typeof ev?.ratingsCount === 'number' ? ev.ratingsCount : 0;
      },
      error: () => {
        if (this.avgRating == null) this.avgRating = 0;
        if (this.ratingsCount == null) this.ratingsCount = 0;
      }
    });
  }

  goBack() {
    this.router.navigate(['/evento']);
  }
}
