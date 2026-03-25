import {
  AfterViewChecked,
  Component,
  ElementRef,
  inject,
  ViewChild,
  viewChild,
} from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
@Component({
  selector: 'app-chat-box',
  imports: [MatProgressSpinner, DatePipe, MatIconModule],
  templateUrl: './chat-box.component.html',
  styles: [
    `
      .chat-box {
        scroll-behavior: smooth;
        padding: 16px;
        background-color: #111118;
        height: 100%;
        overflow-y: scroll;
      }

      .chat-box::-webkit-scrollbar { width: 4px; }
      .chat-box::-webkit-scrollbar-track { background: transparent; }
      .chat-box::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
      .chat-box::-webkit-scrollbar-thumb:hover { background: #f59e0b; }

      .chat-icon { font-size: 52px; width: 52px; height: 52px; }
    `,
  ],
})
export class ChatBoxComponent implements AfterViewChecked {
  @ViewChild('chatBox', { read: ElementRef }) public chatBox?: ElementRef;

  chatService = inject(ChatService);
  authService = inject(AuthService);
  private pageNumber = 2;

  loadMoreMessage() {
    this.pageNumber++;
    this.chatService.loadMessages(this.pageNumber);
    this.scrollTop();
  }

  ngAfterViewChecked(): void {
    if (this.chatService.autoScrollEnabled()) {
      this.scrollToBottom();
    }
  }

  scrollToBottom() {
    this.chatService.autoScrollEnabled.set(true);
    this.chatBox!.nativeElement.scrollTo({
      top: this.chatBox!.nativeElement.scrollHeight,
      behavior: 'smooth',
    });
  }

  scrollTop() {
    this.chatService.autoScrollEnabled.set(false);
    this.chatBox!.nativeElement.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }
}
