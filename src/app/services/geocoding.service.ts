import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, debounceTime, switchMap, catchError, map } from 'rxjs';

export interface AddressComponent {
  road?: string;
  house_number?: string;
  postcode?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  country?: string;
  country_code?: string;
}

export interface GeocodingResult {
  display_name: string;
  lat: string;
  lon: string;
  address: AddressComponent;
  type?: string;
  importance?: number;
}

export interface AddressValidation {
  isValid: boolean;
  hasStreet: boolean;
  hasNumber: boolean;
  hasPostalCode: boolean;
  hasCity: boolean;
  hasCountry: boolean;
  completeness: number;
  missingComponents: string[];
  warnings: string[];
  formattedAddress?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private readonly NOMINATIM_API = 'https://nominatim.openstreetmap.org';
  private readonly USER_AGENT = 'Eventer-App/1.0';

  constructor(private http: HttpClient) {}

  /**
   * @param query
   * @param countryCode
   */
  searchAddress(query: string, countryCode?: string): Observable<GeocodingResult[]> {
    if (!query || query.trim().length < 3) {
      return of([]);
    }

    const params: any = {
      q: query.trim(),
      format: 'json',
      addressdetails: '1',
      limit: '10',
      'accept-language': 'es,en'
    };

    if (countryCode) {
      params.countrycodes = countryCode.toLowerCase();
    }

    return this.http.get<GeocodingResult[]>(
      `${this.NOMINATIM_API}/search`,
      {
        params,
        headers: { 'User-Agent': this.USER_AGENT }
      }
    ).pipe(
      map(results => this.filterAndSortResults(results)),
      catchError(error => {
        console.error('Error en búsqueda de direcciones:', error);
        return of([]);
      })
    );
  }

  geocodeAddress(address: string): Observable<{ lat: number; lng: number } | null> {
    if (!address || address.trim().length < 5) {
      return of(null);
    }

    return this.http.get<GeocodingResult[]>(
      `${this.NOMINATIM_API}/search`,
      {
        params: {
          q: address.trim(),
          format: 'json',
          limit: '1'
        },
        headers: { 'User-Agent': this.USER_AGENT }
      }
    ).pipe(
      map(results => {
        if (!results || results.length === 0) {
          return null;
        }
        const first = results[0];
        return {
          lat: parseFloat(first.lat),
          lng: parseFloat(first.lon)
        };
      }),
      catchError(error => {
        console.error('Error geocodificando dirección:', error);
        return of(null);
      })
    );
  }

  reverseGeocode(lat: number, lng: number): Observable<GeocodingResult | null> {
    return this.http.get<GeocodingResult>(
      `${this.NOMINATIM_API}/reverse`,
      {
        params: {
          lat: lat.toString(),
          lon: lng.toString(),
          format: 'json',
          addressdetails: '1'
        },
        headers: { 'User-Agent': this.USER_AGENT }
      }
    ).pipe(
      catchError(error => {
        console.error('Error en geocodificación inversa:', error);
        return of(null);
      })
    );
  }

  validateAddress(address: string): Observable<AddressValidation> {
    if (!address || address.trim().length < 5) {
      return of(this.createInvalidValidation('La dirección es demasiado corta'));
    }

    return this.http.get<GeocodingResult[]>(
      `${this.NOMINATIM_API}/search`,
      {
        params: {
          q: address.trim(),
          format: 'json',
          addressdetails: '1',
          limit: '1'
        },
        headers: { 'User-Agent': this.USER_AGENT }
      }
    ).pipe(
      map(results => {
        if (!results || results.length === 0) {
          return this.createInvalidValidation('No se encontró la dirección');
        }
        return this.analyzeAddressCompleteness(results[0]);
      }),
      catchError(error => {
        console.error('Error validando dirección:', error);
        return of(this.createInvalidValidation('Error al validar la dirección'));
      })
    );
  }

  private analyzeAddressCompleteness(result: GeocodingResult): AddressValidation {
    const addr = result.address;
    const missingComponents: string[] = [];
    const warnings: string[] = [];

    const hasStreet = !!(addr.road);
    const hasNumber = !!(addr.house_number);
    const hasPostalCode = !!(addr.postcode);
    const hasCity = !!(addr.city || addr.town || addr.village || addr.municipality);
    const hasCountry = !!(addr.country);

    if (!hasStreet) missingComponents.push('Calle/Avenida');
    if (!hasNumber) missingComponents.push('Número');
    if (!hasPostalCode) missingComponents.push('Código postal');
    if (!hasCity) missingComponents.push('Ciudad/Localidad');
    if (!hasCountry) missingComponents.push('País');

    let completeness = 0;
    if (hasStreet) completeness += 20;
    if (hasNumber) completeness += 20;
    if (hasPostalCode) completeness += 20;
    if (hasCity) completeness += 20;
    if (hasCountry) completeness += 20;

    if (result.type === 'road' && !hasNumber) {
      warnings.push('Se detectó una calle pero falta el número específico');
    }

    if (result.importance && result.importance < 0.3) {
      warnings.push('La dirección encontrada podría ser imprecisa');
    }

    const isValid = completeness >= 80;

    return {
      isValid,
      hasStreet,
      hasNumber,
      hasPostalCode,
      hasCity,
      hasCountry,
      completeness,
      missingComponents,
      warnings,
      formattedAddress: result.display_name
    };
  }

  private createInvalidValidation(error: string): AddressValidation {
    return {
      isValid: false,
      hasStreet: false,
      hasNumber: false,
      hasPostalCode: false,
      hasCity: false,
      hasCountry: false,
      completeness: 0,
      missingComponents: ['Todos los componentes'],
      warnings: [error]
    };
  }

  private filterAndSortResults(results: GeocodingResult[]): GeocodingResult[] {
    return results
      .filter(r => {
        const addr = r.address;
        return addr && (addr.road || addr.house_number || addr.postcode);
      })
      .sort((a, b) => {
        const impA = a.importance || 0;
        const impB = b.importance || 0;
        return impB - impA;
      })
      .slice(0, 10);
  }

  formatAddress(result: GeocodingResult): string {
    const addr = result.address;
    const parts: string[] = [];

    if (addr.road && addr.house_number) {
      parts.push(`${addr.road}, ${addr.house_number}`);
    } else if (addr.road) {
      parts.push(addr.road);
    }

    if (addr.postcode) {
      parts.push(addr.postcode);
    }

    const locality = addr.city || addr.town || addr.village || addr.municipality;
    if (locality) {
      parts.push(locality);
    }

    if (addr.country) {
      parts.push(addr.country);
    }

    return parts.join(', ');
  }

  extractAddressInfo(result: GeocodingResult): {
    street: string;
    number: string;
    postalCode: string;
    city: string;
    country: string;
  } {
    const addr = result.address;
    return {
      street: addr.road || '',
      number: addr.house_number || '',
      postalCode: addr.postcode || '',
      city: addr.city || addr.town || addr.village || addr.municipality || '',
      country: addr.country || ''
    };
  }
}