import { Component, inject } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { TitleCasePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-chat-right-sidebar',
  imports: [TitleCasePipe, MatIconModule],
  templateUrl: './chat-right-sidebar.component.html',
  styles: ``,
})
export class ChatRightSidebarComponent {
  chatService = inject(ChatService);
}
