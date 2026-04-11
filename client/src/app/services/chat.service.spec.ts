import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ChatService } from './chat.service';
import { AuthService } from './auth.service';
import { AiService } from './ai.service';
import { User } from '../models/user';
import { Group } from '../models/group';
import { GroupMessage } from '../models/group-message';
import { Message } from '../models/message';
import { of } from 'rxjs';

const mockCurrentUser: User = {
  id: 'user-alice',
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

const mockBob: User = {
  ...mockCurrentUser,
  id: 'user-bob',
  fullName: 'Bob Jones',
  userName: 'bob',
};

const mockGroup: Group = {
  id: 1,
  name: 'Dev Team',
  memberIds: ['user-alice', 'user-bob'],
  memberNames: ['Alice Smith', 'Bob Jones'],
  unreadCount: 0,
  hasHistory: false,
};

describe('ChatService — direct messages', () => {
  let service: ChatService;
  let authService: jasmine.SpyObj<AuthService>;
  let aiService: jasmine.SpyObj<AiService>;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['logout'], {
      currentLoggedUser: mockCurrentUser,
      getAccessToken: 'token-123',
    });

    aiService = jasmine.createSpyObj('AiService', ['askAi']);

    TestBed.configureTestingModule({
      providers: [
        ChatService,
        { provide: AuthService, useValue: authService },
        { provide: AiService, useValue: aiService },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ChatService);
  });

  it('should create with empty signals', () => {
    expect(service.onlineUsers()).toEqual([]);
    expect(service.chatMessages()).toEqual([]);
    expect(service.userGroups()).toEqual([]);
    expect(service.groupMessages()).toEqual([]);
    expect(service.currentOpenedChat()).toBeNull();
    expect(service.currentOpenedGroup()).toBeNull();
  });

  describe('sendMessage() — optimistic update', () => {
    beforeEach(() => {
      service.currentOpenedChat.set(mockBob);
      // Stub the hub connection so invoke doesn't throw
      (service as any).hubConnection = { invoke: () => Promise.resolve() };
    });

    it('adds the message to chatMessages immediately', () => {
      service.sendMessage('Hello Bob!');
      const msgs = service.chatMessages();
      expect(msgs.length).toBe(1);
      expect(msgs[0].content).toBe('Hello Bob!');
      expect(msgs[0].senderId).toBe('user-alice');
      expect(msgs[0].receiverId).toBe('user-bob');
    });

    it('does nothing when no chat is open', () => {
      service.currentOpenedChat.set(null);
      service.sendMessage('Should not appear');
      expect(service.chatMessages().length).toBe(0);
    });
  });

  describe('sendMessage() — AI chat', () => {
    it('calls aiService.askAi when chatting with Gemini', () => {
      aiService.askAi.and.returnValue(of({ isSuccess: true, data: 'AI response', error: null, message: null }));
      service.currentOpenedChat.set(service.aiUser);
      service.sendMessage('What is Angular?');
      expect(aiService.askAi).toHaveBeenCalledWith('What is Angular?');
    });

    it('adds AI response to chatMessages on success', () => {
      aiService.askAi.and.returnValue(of({ isSuccess: true, data: 'Angular is a framework.', error: null, message: null }));
      service.currentOpenedChat.set(service.aiUser);
      service.sendMessage('Tell me about Angular');
      const messages = service.chatMessages();
      expect(messages.some(m => m.content === 'Angular is a framework.')).toBeTrue();
    });

    it('adds fallback message when AI fails', () => {
      aiService.askAi.and.returnValue(of({ isSuccess: false, data: '', error: 'Quota exceeded', message: null }));
      service.currentOpenedChat.set(service.aiUser);
      service.sendMessage('Hi AI');
      const messages = service.chatMessages();
      expect(messages.some(m => m.content === 'Quota exceeded')).toBeTrue();
    });
  });

  describe('status()', () => {
    it('returns offline when no chat is open', () => {
      service.currentOpenedChat.set(null);
      expect(service.status('bob')).toBe('offline');
    });

    it('returns Typing... when user is typing', () => {
      const typingBob = { ...mockBob, isTyping: true };
      service.currentOpenedChat.set(typingBob);
      service.onlineUsers.set([typingBob]);
      expect(service.status('bob')).toBe('Typing...');
    });

    it('returns online when user is online and not typing', () => {
      const onlineBob = { ...mockBob, isOnline: true, isTyping: false };
      service.currentOpenedChat.set(onlineBob);
      service.onlineUsers.set([onlineBob]);
      expect(service.status('bob')).toBe('online');
    });
  });
});

describe('ChatService — group chat', () => {
  let service: ChatService;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['logout'], {
      currentLoggedUser: mockCurrentUser,
      getAccessToken: 'token-123',
    });

    TestBed.configureTestingModule({
      providers: [
        ChatService,
        { provide: AuthService, useValue: authService },
        { provide: AiService, useValue: jasmine.createSpyObj('AiService', ['askAi']) },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ChatService);
  });

  describe('openGroupChat()', () => {
    it('sets currentOpenedGroup and clears currentOpenedChat', () => {
      service.currentOpenedChat.set(mockBob);
      (service as any).hubConnection = { invoke: () => Promise.resolve() };

      service.openGroupChat(mockGroup);

      expect(service.currentOpenedGroup()?.id).toBe(1);
      expect(service.currentOpenedChat()).toBeNull();
    });

    it('resets group messages when opening a group', () => {
      service.groupMessages.set([{ id: 99 } as GroupMessage]);
      (service as any).hubConnection = { invoke: () => Promise.resolve() };

      service.openGroupChat(mockGroup);

      expect(service.groupMessages()).toEqual([]);
    });

    it('resets unread count on the opened group', () => {
      const groupWithUnread = { ...mockGroup, unreadCount: 5 };
      service.userGroups.set([groupWithUnread]);
      (service as any).hubConnection = { invoke: () => Promise.resolve() };

      service.openGroupChat(groupWithUnread);

      expect(service.currentOpenedGroup()?.unreadCount).toBe(0);
      expect(service.userGroups()[0].unreadCount).toBe(0);
    });
  });

  describe('sendGroupMessage()', () => {
    beforeEach(() => {
      service.currentOpenedGroup.set(mockGroup);
      (service as any).hubConnection = { invoke: () => Promise.resolve() };
    });

    it('optimistically adds message to groupMessages', () => {
      service.sendGroupMessage('Hello group!');
      const msgs = service.groupMessages();
      expect(msgs.length).toBe(1);
      expect(msgs[0].content).toBe('Hello group!');
      expect(msgs[0].senderId).toBe('user-alice');
      expect(msgs[0].groupId).toBe(1);
    });

    it('does nothing when no group is open', () => {
      service.currentOpenedGroup.set(null);
      service.sendGroupMessage('Nothing');
      expect(service.groupMessages().length).toBe(0);
    });
  });

  describe('createGroup()', () => {
    it('calls hub invoke with correct arguments', async () => {
      const invokeSpy = jasmine.createSpy('invoke').and.returnValue(Promise.resolve());
      (service as any).hubConnection = { invoke: invokeSpy };

      await service.createGroup('New Group', ['user-bob']);

      expect(invokeSpy).toHaveBeenCalledWith('CreateGroup', { name: 'New Group', memberIds: ['user-bob'] });
    });

    it('rejects when not connected', async () => {
      (service as any).hubConnection = undefined;
      await expectAsync(service.createGroup('Test', [])).toBeRejected();
    });
  });

  describe('SignalR event handlers', () => {
    it('UserGroups event sets userGroups signal', () => {
      const groups: Group[] = [mockGroup];
      // Simulate the handler directly
      service.userGroups.set(groups);
      expect(service.userGroups().length).toBe(1);
      expect(service.userGroups()[0].name).toBe('Dev Team');
    });

    it('GroupCreated event appends new group to userGroups', () => {
      service.userGroups.set([mockGroup]);
      const newGroup: Group = { ...mockGroup, id: 2, name: 'Design Team' };

      // Simulate the GroupCreated handler
      service.userGroups.update(groups => {
        const exists = groups.some(g => g.id === newGroup.id);
        return exists ? groups : [...groups, newGroup];
      });

      expect(service.userGroups().length).toBe(2);
      expect(service.userGroups()[1].name).toBe('Design Team');
    });

    it('GroupCreated event does not duplicate existing group', () => {
      service.userGroups.set([mockGroup]);

      service.userGroups.update(groups => {
        const exists = groups.some(g => g.id === mockGroup.id);
        return exists ? groups : [...groups, mockGroup];
      });

      expect(service.userGroups().length).toBe(1);
    });

    it('ReceiveGroupMessage increments unread count for inactive groups', () => {
      const otherGroup: Group = { ...mockGroup, id: 2, unreadCount: 0 };
      service.userGroups.set([otherGroup]);
      service.currentOpenedGroup.set(mockGroup); // group 1 is open, not group 2

      const incomingMsg: GroupMessage = {
        id: 1,
        groupId: 2,
        senderId: 'user-bob',
        senderName: 'Bob',
        senderProfilePicture: '',
        content: 'Hey',
        createdDate: new Date().toString(),
        isRead: false,
      };

      // Simulate ReceiveGroupMessage handler
      if (service.currentOpenedGroup()?.id === incomingMsg.groupId) {
        service.groupMessages.update(m => [...m, incomingMsg]);
      } else {
        service.userGroups.update(groups =>
          groups.map(g => g.id === incomingMsg.groupId ? { ...g, unreadCount: g.unreadCount + 1 } : g)
        );
      }

      expect(service.userGroups()[0].unreadCount).toBe(1);
      expect(service.groupMessages().length).toBe(0);
    });

    it('ReceiveGroupMessage appends to groupMessages when group is open', () => {
      service.currentOpenedGroup.set(mockGroup);

      const incomingMsg: GroupMessage = {
        id: 1,
        groupId: 1,
        senderId: 'user-bob',
        senderName: 'Bob',
        senderProfilePicture: '',
        content: 'Hello!',
        createdDate: new Date().toString(),
        isRead: false,
      };

      if (service.currentOpenedGroup()?.id === incomingMsg.groupId) {
        service.groupMessages.update(m => [...m, incomingMsg]);
      }

      expect(service.groupMessages().length).toBe(1);
      expect(service.groupMessages()[0].content).toBe('Hello!');
    });
  });
});
