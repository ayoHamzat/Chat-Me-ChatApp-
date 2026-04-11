import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { User } from '../../models/user';
import { Group } from '../../models/group';
import { TypingIndicatorComponent } from '../typing-indicator/typing-indicator.component';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { CreateGroupDialogComponent } from '../create-group-dialog/create-group-dialog.component';

@Component({
  selector: 'app-chat-sidebar',
  imports: [
    MatIconModule,
    MatMenuModule,
    TypingIndicatorComponent,
    TitleCasePipe,
    FormsModule,
  ],
  templateUrl: './chat-sidebar.component.html',
  styles: ``,
})
export class ChatSidebarComponent implements OnInit {
  authService = inject(AuthService);
  chatService = inject(ChatService);
  router = inject(Router);
  dialog = inject(MatDialog);

  activeTab = signal<'direct' | 'groups'>('direct');
  searchQuery = signal('');
  chattedUserIds = signal<Set<string>>(new Set());

  totalGroupUnread = computed(() =>
    this.chatService.userGroups().reduce((acc, g) => acc + g.unreadCount, 0)
  );

  visibleUsers = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const chatted = this.chattedUserIds();
    return this.chatService.onlineUsers().filter(user => {
      if (user.id === 'gemini-ai') return true;
      if (query) return user.fullName?.toLowerCase()?.includes(query) || user.userName?.toLowerCase()?.includes(query);
      return user.hasHistory || user.unreadCount > 0 || chatted.has(user.id);
    });
  });

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
    this.chatService.disConnectConnection();
  }

  ngOnInit(): void {
    this.chatService.startConnection(this.authService.getAccessToken!);
  }

  openChatWindow(user: User) {
    this.chattedUserIds.update(set => new Set([...set, user.id]));
    this.chatService.chatMessages.set([]);
    this.chatService.currentOpenedChat.set(user);
    this.chatService.currentOpenedGroup.set(null);
    this.chatService.loadMessages(1);
  }

  openGroupChat(group: Group) {
    this.chatService.openGroupChat(group);
  }

  openCreateGroupDialog() {
    this.dialog.open(CreateGroupDialogComponent, {
      panelClass: 'custom-dialog',
      backdropClass: 'dark-backdrop',
    });
  }
}
