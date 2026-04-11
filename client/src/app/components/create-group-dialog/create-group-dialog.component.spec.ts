import { TestBed, ComponentFixture } from '@angular/core/testing';
import { CreateGroupDialogComponent } from './create-group-dialog.component';
import { MatDialogRef } from '@angular/material/dialog';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { User } from '../../models/user';
import { Group } from '../../models/group';

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
  hasHistory: false,
  ...overrides,
});

describe('CreateGroupDialogComponent', () => {
  let fixture: ComponentFixture<CreateGroupDialogComponent>;
  let component: CreateGroupDialogComponent;
  let chatServiceMock: jasmine.SpyObj<ChatService>;
  let dialogRefMock: jasmine.SpyObj<MatDialogRef<CreateGroupDialogComponent>>;

  const alice = makeUser({ id: 'user-alice', userName: 'alice' });
  const bob = makeUser({ id: 'user-bob', fullName: 'Bob Jones', userName: 'bob' });
  const charlie = makeUser({ id: 'user-charlie', fullName: 'Charlie Brown', userName: 'charlie' });

  beforeEach(async () => {
    chatServiceMock = jasmine.createSpyObj('ChatService', ['createGroup'], {
      onlineUsers: signal<User[]>([alice, bob, charlie]),
      userGroups: signal<Group[]>([]),
    });
    chatServiceMock.createGroup.and.returnValue(Promise.resolve());

    const authServiceMock = jasmine.createSpyObj('AuthService', [], {
      currentLoggedUser: alice,
    });

    dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [CreateGroupDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: ChatService, useValue: chatServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateGroupDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // --- Initial state ---

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with no group name', () => {
    expect(component.groupName()).toBe('');
  });

  it('should start with no selected members', () => {
    expect(component.selectedMemberIds().size).toBe(0);
  });

  // --- selectableUsers ---

  it('should exclude current user (alice) from selectable users', () => {
    const selectable = component.selectableUsers();
    expect(selectable.some(u => u.id === 'user-alice')).toBeFalse();
  });

  it('should exclude gemini-ai from selectable users', () => {
    const ai = makeUser({ id: 'gemini-ai', userName: 'gemini-ai' });
    chatServiceMock.onlineUsers.set([alice, ai, bob]);
    expect(component.selectableUsers().some(u => u.id === 'gemini-ai')).toBeFalse();
  });

  it('should include other users as selectable', () => {
    const selectable = component.selectableUsers();
    expect(selectable.length).toBe(2); // bob and charlie
    expect(selectable.some(u => u.id === 'user-bob')).toBeTrue();
    expect(selectable.some(u => u.id === 'user-charlie')).toBeTrue();
  });

  // --- toggleMember ---

  it('should select a member when toggled', () => {
    component.toggleMember('user-bob');
    expect(component.isSelected('user-bob')).toBeTrue();
  });

  it('should deselect a member when toggled twice', () => {
    component.toggleMember('user-bob');
    component.toggleMember('user-bob');
    expect(component.isSelected('user-bob')).toBeFalse();
  });

  it('should allow selecting multiple members', () => {
    component.toggleMember('user-bob');
    component.toggleMember('user-charlie');
    expect(component.selectedMemberIds().size).toBe(2);
  });

  // --- create() ---

  it('should call chatService.createGroup with name and selected members', async () => {
    component.groupName.set('My Group');
    component.toggleMember('user-bob');

    await component.create();

    expect(chatServiceMock.createGroup).toHaveBeenCalledWith('My Group', ['user-bob']);
  });

  it('should close the dialog after successful creation', async () => {
    component.groupName.set('My Group');
    component.toggleMember('user-bob');

    await component.create();

    expect(dialogRefMock.close).toHaveBeenCalled();
  });

  it('should not call createGroup when name is empty', async () => {
    component.groupName.set('');
    component.toggleMember('user-bob');

    await component.create();

    expect(chatServiceMock.createGroup).not.toHaveBeenCalled();
  });

  it('should not call createGroup when no members selected', async () => {
    component.groupName.set('My Group');

    await component.create();

    expect(chatServiceMock.createGroup).not.toHaveBeenCalled();
  });

  it('should set isCreating to true during creation and false after', async () => {
    let creatingDuring = false;
    chatServiceMock.createGroup.and.callFake(() => {
      creatingDuring = component.isCreating();
      return Promise.resolve();
    });

    component.groupName.set('Team');
    component.toggleMember('user-bob');

    await component.create();

    expect(creatingDuring).toBeTrue();
    expect(component.isCreating()).toBeFalse();
  });

  it('should set isCreating to false even when createGroup throws', async () => {
    chatServiceMock.createGroup.and.returnValue(Promise.reject('error'));

    component.groupName.set('Team');
    component.toggleMember('user-bob');

    await component.create();

    expect(component.isCreating()).toBeFalse();
  });

  // --- close() ---

  it('should close the dialog when close() is called', () => {
    component.close();
    expect(dialogRefMock.close).toHaveBeenCalled();
  });
});
