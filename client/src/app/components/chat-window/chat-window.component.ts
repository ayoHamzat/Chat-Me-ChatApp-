import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { TitleCasePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ChatBoxComponent } from '../chat-box/chat-box.component';
import { VideoChatService } from '../../services/video-chat.service';
import { MatDialog } from '@angular/material/dialog';
import { VideoChatComponent } from '../../video-chat/video-chat.component';
import { AiService } from '../../services/ai.service';

@Component({
  selector: 'app-chat-window',
  imports: [TitleCasePipe, MatIconModule, FormsModule, ChatBoxComponent],
  templateUrl: './chat-window.component.html',
  styles: ``,
})
export class ChatWindowComponent {
  @ViewChild('chatBox') chatContainer?: ElementRef;
  dialog = inject(MatDialog);

  chatService = inject(ChatService);
  signalRService = inject(VideoChatService);
  aiService = inject(AiService);
  message: string = '';
  showEmojiPicker = signal(false);

  readonly emojis = [
    '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇',
    '🙂','😉','😍','🥰','😘','😋','😛','😜','😎','🤩',
    '🥳','😏','😒','😔','😟','😢','😭','😤','😠','🤬',
    '😈','💀','🤡','👻','💩','🔥','👋','✌️','🤞','👍',
    '👎','👏','🙌','🙏','❤️','🧡','💛','💚','💙','💜',
    '💔','💕','💖','💘','⭐','✨','🎉','🎊','🎈','🏆',
    '💯','🚀','🌙','☀️','🌈','🍕','🍔','🎵','🎮','📱',
  ];

  toggleEmojiPicker() {
    this.showEmojiPicker.update(v => !v);
  }

  insertEmoji(emoji: string) {
    this.message += emoji;
    this.showEmojiPicker.set(false);
  }

  sendMessage() {
    const userMessage = this.message.trim();
    if (!userMessage) return;

    if (this.chatService.currentOpenedGroup()) {
      this.chatService.sendGroupMessage(userMessage);
      this.message = '';
      this.showEmojiPicker.set(false);
      return;
    }

    this.chatService.sendMessage(userMessage);
    this.message = '';
    this.showEmojiPicker.set(false);
    this.scrollToBottom();

    if (!userMessage.startsWith('@ai')) return;

    const aiPrompt = userMessage.replace('@ai', '').trim();
    if (!aiPrompt) return;

    this.aiService.askAi(aiPrompt).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          this.chatService.sendMessage(`[Gemini AI]: ${response.data}`);
          this.scrollToBottom();
        }
      },
      error: () => {
        this.chatService.sendMessage('[Gemini AI]: Sorry, I could not respond right now.');
        this.scrollToBottom();
      }
    });
  }

  displayDialog(receiverId: string) {
    this.signalRService.remoteUserId = receiverId;
    this.dialog.open(VideoChatComponent, {
      width: '400px',
      height: '600px',
      disableClose: true,
      autoFocus: false,
    });
  }

  private scrollToBottom() {
    if (this.chatContainer) {
      this.chatContainer.nativeElement.scrollTop =
        this.chatContainer.nativeElement.scrollHeight;
    }
  }
}
