import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Valoracion } from './valoracion';

describe('Valoracion', () => {
  let component: Valoracion;
  let fixture: ComponentFixture<Valoracion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Valoracion]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Valoracion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
