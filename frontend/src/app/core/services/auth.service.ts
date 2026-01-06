import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  address?: string;
  nip?: string;
  bankName?: string;
  bankIban?: string;
  bankSwift?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'token';
  private readonly USER_KEY = 'user';

  private userSignal = signal<User | null>(this.loadUser());

  user = this.userSignal.asReadonly();
  isAuthenticated = computed(() => !!this.userSignal());
  isAdmin = computed(() => {
    const user = this.userSignal();
    return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  });
  isSuperAdmin = computed(() => this.userSignal()?.role === 'SUPER_ADMIN');

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  private loadUser(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  register(email: string, password: string, name: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, { email, password, name }).pipe(
      tap(response => this.handleAuth(response)),
      catchError(error => throwError(() => error.error?.error || 'Registration failed'))
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(response => this.handleAuth(response)),
      catchError(error => throwError(() => error.error?.error || 'Login failed'))
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.userSignal.set(null);
    this.router.navigate(['/login']);
  }

  checkAuth(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`).pipe(
      tap(user => {
        this.userSignal.set(user);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }),
      catchError(error => {
        this.logout();
        return throwError(() => error);
      })
    );
  }

  private handleAuth(response: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
    this.userSignal.set(response.user);
  }

  updateProfile(data: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/profile`, data).pipe(
      tap(user => {
        this.userSignal.set(user);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }),
      catchError(error => throwError(() => error.error?.error || 'Profile update failed'))
    );
  }
}
