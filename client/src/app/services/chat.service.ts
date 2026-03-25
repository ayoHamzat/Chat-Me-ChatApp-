import { inject, Injectable, signal } from '@angular/core';
import { User } from '../models/user';
import { AuthService } from './auth.service';
import { AiService } from './ai.service';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
} from '@microsoft/signalr';
import { Message } from '../models/message';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  readonly aiUser: User = {
    id: 'gemini-ai',
    profileImage: 'assets/gemini ai.png',
    profilePicture: 'assets/gemini ai.png',
    photoUrl: 'assets/gemini ai.png',
    fullName: 'Gemini AI',
    isOnline: true,
    userName: 'gemini-ai',
    connectionId: '',
    lastMessage: '',
    unreadCount: 0,
    isTyping: false,
    hasHistory: true
  } as User;

  private authService = inject(AuthService);
  private aiService = inject(AiService);
  private hubUrl = `${environment.baseUrl}/hubs/chat`;

  readonly peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });

  onlineUsers = signal<User[]>([]);
  currentOpenedChat = signal<User | null>(null);
  chatMessages = signal<Message[]>([]);
  isLoading = signal<boolean>(true);
  autoScrollEnabled = signal<boolean>(true);

  private hubConnection?: HubConnection;

  startConnection(token: string, senderId?: string) {
    if (this.hubConnection?.state === HubConnectionState.Connected) return;

    if (this.hubConnection) {
      this.hubConnection.off('ReceiveNewMessage');
      this.hubConnection.off('ReceiveMessageList');
      this.hubConnection.off('OnlineUsers');
      this.hubConnection.off('NotifyTypingToUser');
      this.hubConnection.off('Notify');
    }

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${this.hubUrl}?senderId=${senderId || ''}`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start().catch(() => {});

    this.hubConnection!.on('Notify', (user: User) => {
      Notification.requestPermission().then((result) => {
        if (result === 'granted') {
          new Notification('NexChat', {
            body: `${user.fullName} is online now`,
            icon: user.profileImage,
          });
        }
      });
    });

    this.hubConnection!.on('OnlineUsers', (users: User[]) => {
      this.onlineUsers.update(() => [
        this.aiUser,
        ...users.filter(u => u.userName !== this.authService.currentLoggedUser!.userName)
      ]);
    });

    this.hubConnection!.on('NotifyTypingToUser', (senderUserName: string) => {
      this.onlineUsers.update((users) =>
        users.map((user) => ({ ...user, isTyping: user.userName === senderUserName ? true : user.isTyping }))
      );
      setTimeout(() => {
        this.onlineUsers.update((users) =>
          users.map((user) => ({ ...user, isTyping: user.userName === senderUserName ? false : user.isTyping }))
        );
      }, 2000);
    });

    this.hubConnection!.on('ReceiveMessageList', (message) => {
      this.isLoading.update(() => true);
      this.chatMessages.update((messages) => [...message, ...messages]);
      this.isLoading.update(() => false);
    });

    this.hubConnection!.on('ReceiveNewMessage', (message: Message) => {
      const audio = new Audio('assets/notification.mp3');
      audio.play().catch(() => {});
      document.title = 'NexChat — New Message';
      this.chatMessages.update((messages) => [...messages, message]);
    });
  }

  disConnectConnection() {
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      this.hubConnection.stop().catch(() => {});
    }
  }

  sendMessage(message: string) {
    const currentChat = this.currentOpenedChat();
    if (!currentChat) return;

    if (currentChat.id === 'gemini-ai') {
      this.sendAiMessage(message);
      return;
    }

    this.chatMessages.update((messages) => [
      ...messages,
      {
        content: message,
        senderId: this.authService.currentLoggedUser!.id,
        receiverId: currentChat.id,
        createdDate: new Date().toString(),
        isRead: false,
        id: 0,
      },
    ]);

    this.hubConnection
      ?.invoke('SendMessage', { receiverId: currentChat.id, content: message })
      .catch(() => {});
  }

  private sendAiMessage(message: string) {
    this.chatMessages.update(messages => [
      ...messages,
      {
        content: message,
        senderId: this.authService.currentLoggedUser!.id,
        receiverId: 'gemini-ai',
        createdDate: new Date().toString(),
        isRead: true,
        id: Date.now(),
      },
    ]);

    this.aiService.askAi(message).subscribe({
      next: (response) => {
        const content = response.isSuccess
          ? response.data
          : (response.error ?? 'Sorry, I could not respond right now.');
        this.chatMessages.update((messages) => [
          ...messages,
          {
            content,
            senderId: 'gemini-ai',
            receiverId: this.authService.currentLoggedUser!.id,
            createdDate: new Date().toString(),
            isRead: true,
            id: Date.now() + 1,
          },
        ]);
      },
      error: () => {
        this.chatMessages.update((messages) => [
          ...messages,
          {
            content: 'Sorry, I could not respond right now.',
            senderId: 'gemini-ai',
            receiverId: this.authService.currentLoggedUser!.id,
            createdDate: new Date().toString(),
            isRead: true,
            id: Date.now() + 1,
          },
        ]);
      },
    });
  }

  status(userName: string): string {
    const currentChatUser = this.currentOpenedChat();
    if (!currentChatUser) return 'offline';

    const onlineUser = this.onlineUsers().find(u => u.userName === userName);
    return onlineUser?.isTyping ? 'Typing...' : this.isUserOnline();
  }

  isUserOnline(): string {
    const onlineUser = this.onlineUsers().find(
      u => u.userName === this.currentOpenedChat()?.userName
    );
    return onlineUser?.isOnline ? 'online' : this.currentOpenedChat()!.userName;
  }

  loadMessages(pageNumber: number) {
    this.isLoading.update(() => true);
    this.hubConnection
      ?.invoke('LoadMessages', this.currentOpenedChat()?.id, pageNumber)
      .catch(() => {})
      .finally(() => {
        this.isLoading.update(() => false);
      });
  }

  notifyTyping() {
    this.hubConnection!.invoke('NotifyTyping', this.currentOpenedChat()?.userName)
      .catch(() => {});
  }
}
