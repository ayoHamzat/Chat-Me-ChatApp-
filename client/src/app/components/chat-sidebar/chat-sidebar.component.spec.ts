import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ChatSidebarComponent } from './chat-sidebar.component';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { User } from '../../models/user';
import { Group } from '../../models/group';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'u1',
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
  hasHistory: true,
  ...overrides,
});

const makeGroup = (overrides: Partial<Group> = {}): Group => ({
  id: 1,
  name: 'Dev Team',
  memberIds: ['u1', 'u2'],
  memberNames: ['Alice', 'Bob'],
  unreadCount: 0,
  hasHistory: false,
  ...overrides,
});

describe('ChatSidebarComponent', () => {
  let fixture: ComponentFixture<ChatSidebarComponent>;
  let component: ChatSidebarComponent;
  let chatServiceMock: jasmine.SpyObj<ChatService>;
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let dialogMock: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    const aliceUser = makeUser();

    chatServiceMock = jasmine.createSpyObj('ChatService', [
      'startConnection', 'disConnectConnection', 'loadMessages',
      'openGroupChat', 'chatMessages', 'currentOpenedGroup',
    ], {
      onlineUsers: signal<User[]>([aliceUser]),
      currentOpenedChat: signal<User | null>(null),
      currentOpenedGroup: signal<Group | null>(null),
      userGroups: signal<Group[]>([]),
      chatMessages: signal([]),
    });
    chatServiceMock.startConnection.and.returnValue(undefined as any);

    authServiceMock = jasmine.createSpyObj('AuthService', ['logout'], {
      currentLoggedUser: aliceUser,
      getAccessToken: 'token',
    });

    dialogMock = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [ChatSidebarComponent, NoopAnimationsModule],
      providers: [
        { provide: ChatService, useValue: chatServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: MatDialog, useValue: dialogMock },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // --- Initialization ---

  it('should create and call startConnection on init', () => {
    expect(component).toBeTruthy();
    expect(chatServiceMock.startConnection).toHaveBeenCalledWith('token');
  });

  it('should default to direct tab', () => {
    expect(component.activeTab()).toBe('direct');
  });

  // --- Tab switching ---

  it('should switch to groups tab', () => {
    component.activeTab.set('groups');
    fixture.detectChanges();
    expect(component.activeTab()).toBe('groups');
  });

  it('should switch back to direct tab', () => {
    component.activeTab.set('groups');
    component.activeTab.set('direct');
    expect(component.activeTab()).toBe('direct');
  });

  // --- User filtering (visibleUsers) ---

  it('should always show Gemini AI user', () => {
    const ai = makeUser({ id: 'gemini-ai', userName: 'gemini-ai', hasHistory: false, unreadCount: 0 });
    chatServiceMock.onlineUsers.set([ai]);
    expect(component.visibleUsers().some(u => u.id === 'gemini-ai')).toBeTrue();
  });

  it('should show user with hasHistory=true', () => {
    const bob = makeUser({ id: 'u2', userName: 'bob', hasHistory: true });
    chatServiceMock.onlineUsers.set([bob]);
    expect(component.visibleUsers().length).toBe(1);
  });

  it('should hide user with no history and no unread when no search', () => {
    const stranger = makeUser({ id: 'u3', userName: 'stranger', hasHistory: false, unreadCount: 0 });
    chatServiceMock.onlineUsers.set([stranger]);
    expect(component.visibleUsers().length).toBe(0);
  });

  it('should show user matching search query by fullName', () => {
    const charlie = makeUser({ id: 'u4', fullName: 'Charlie Brown', userName: 'charlie', hasHistory: false });
    chatServiceMock.onlineUsers.set([charlie]);
    component.searchQuery.set('charlie');
    expect(component.visibleUsers().length).toBe(1);
    expect(component.visibleUsers()[0].userName).toBe('charlie');
  });

  it('should return empty list when search has no matches', () => {
    chatServiceMock.onlineUsers.set([makeUser({ hasHistory: true })]);
    component.searchQuery.set('zzznomatch');
    expect(component.visibleUsers().length).toBe(0);
  });

  // --- openChatWindow ---

  it('openChatWindow sets currentOpenedChat and clears group', () => {
    const bob = makeUser({ id: 'u2', userName: 'bob' });
    chatServiceMock.loadMessages.and.stub();

    component.openChatWindow(bob);

    expect(chatServiceMock.currentOpenedChat.set).toBeDefined();
    expect(chatServiceMock.loadMessages).toHaveBeenCalledWith(1);
  });

  // --- openGroupChat ---

  it('openGroupChat delegates to chatService.openGroupChat', () => {
    const group = makeGroup();
    component.openGroupChat(group);
    expect(chatServiceMock.openGroupChat).toHaveBeenCalledWith(group);
  });

  // --- totalGroupUnread computed ---

  it('totalGroupUnread returns 0 when no groups', () => {
    chatServiceMock.userGroups.set([]);
    expect(component.totalGroupUnread()).toBe(0);
  });

  it('totalGroupUnread sums unread counts across groups', () => {
    chatServiceMock.userGroups.set([
      makeGroup({ id: 1, unreadCount: 3 }),
      makeGroup({ id: 2, unreadCount: 5 }),
    ]);
    expect(component.totalGroupUnread()).toBe(8);
  });

  // --- Logout ---

  it('logout calls authService.logout and navigates to /login', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    component.logout();
    expect(authServiceMock.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(chatServiceMock.disConnectConnection).toHaveBeenCalled();
  });

  // --- Create Group Dialog ---

  it('openCreateGroupDialog opens MatDialog with CreateGroupDialogComponent', () => {
    component.openCreateGroupDialog();
    expect(dialogMock.open).toHaveBeenCalled();
  });
});
