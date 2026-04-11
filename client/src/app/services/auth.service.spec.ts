import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { ApiResponse } from '../models/api-response';
import { User } from '../models/user';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockUser: User = {
    id: 'user-1',
    fullName: 'Alice Smith',
    userName: 'alice',
    profileImage: 'avatar.png',
    profilePicture: 'avatar.png',
    photoUrl: 'avatar.png',
    isOnline: true,
    connectionId: '',
    lastMessage: '',
    unreadCount: 0,
    isTyping: false,
    hasHistory: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // --- Token management ---

  it('should store token in localStorage after login', () => {
    const response: ApiResponse<string> = {
      isSuccess: true,
      data: 'jwt-token-123',
      error: '',
      message: '',
    };

    service.login('alice@test.com', 'Password123!').subscribe();

    const req = httpMock.expectOne(r => r.url.includes('/login'));
    req.flush(response);

    expect(localStorage.getItem('token')).toBe('jwt-token-123');
  });

  it('should not store token when login fails', () => {
    const response: ApiResponse<string> = {
      isSuccess: false,
      data: '',
      error: 'Invalid credentials',
      message: '',
    };

    service.login('alice@test.com', 'wrong').subscribe();

    const req = httpMock.expectOne(r => r.url.includes('/login'));
    req.flush(response);

    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should store token after register', () => {
    const response: ApiResponse<string> = {
      isSuccess: true,
      data: 'register-token',
      error: '',
      message: '',
    };

    service.register(new FormData()).subscribe();

    const req = httpMock.expectOne(r => r.url.includes('/register'));
    req.flush(response);

    expect(localStorage.getItem('token')).toBe('register-token');
  });

  // --- isLoggedIn ---

  it('should return true when token exists', () => {
    localStorage.setItem('token', 'some-token');
    expect(service.isLoggedIn()).toBeTrue();
  });

  it('should return false when no token', () => {
    expect(service.isLoggedIn()).toBeFalse();
  });

  // --- logout ---

  it('should remove token and user from localStorage on logout', () => {
    localStorage.setItem('token', 'some-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    service.logout();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  // --- currentLoggedUser ---

  it('should return the stored user', () => {
    localStorage.setItem('user', JSON.stringify(mockUser));
    const user = service.currentLoggedUser;
    expect(user?.fullName).toBe('Alice Smith');
    expect(user?.userName).toBe('alice');
  });

  it('should return empty object when no user stored', () => {
    const user = service.currentLoggedUser;
    expect(user).toBeDefined();
  });

  // --- getAccessToken ---

  it('should return token from localStorage', () => {
    localStorage.setItem('token', 'my-jwt');
    expect(service.getAccessToken).toBe('my-jwt');
  });

  it('should return empty string when no token', () => {
    expect(service.getAccessToken).toBe('');
  });

  // --- me() ---

  it('should send Authorization header with Bearer token', () => {
    localStorage.setItem('token', 'bearer-token');
    service.me().subscribe();

    const req = httpMock.expectOne(r => r.url.includes('/me'));
    expect(req.request.headers.get('Authorization')).toBe('Bearer bearer-token');
    req.flush({ isSuccess: true, data: mockUser, error: '', message: '' });
  });

  it('should store user in localStorage after me() succeeds', () => {
    service.me().subscribe();

    const req = httpMock.expectOne(r => r.url.includes('/me'));
    req.flush({ isSuccess: true, data: mockUser, error: '', message: '' });

    const stored = JSON.parse(localStorage.getItem('user')!);
    expect(stored.fullName).toBe('Alice Smith');
  });
});
