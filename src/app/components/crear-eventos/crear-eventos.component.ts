import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-crear-evento',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './crear-eventos.component.html',
  styleUrls: ['./crear-eventos.component.css']
})
export class CrearEventoComponent implements OnInit {
  eventoForm!: FormGroup;
  isSubmitting = false;

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    this.eventoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]],
      fecha: ['', Validators.required],
      lugar: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.eventoForm.invalid) {
      this.eventoForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    console.log('Evento creado:', this.eventoForm.value);

    setTimeout(() => {
      this.isSubmitting = false;
      alert('✅ Evento creado con éxito');
      this.router.navigate(['/mis-eventos']);
    }, 800);
  }

  goBack(): void {
    this.router.navigate(['/menu']);
  }
}
