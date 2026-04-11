import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TitleCasePipe } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-create-group-dialog',
  imports: [FormsModule, MatIconModule, TitleCasePipe],
  templateUrl: './create-group-dialog.component.html',
})
export class CreateGroupDialogComponent {
  private dialogRef = inject(MatDialogRef<CreateGroupDialogComponent>);
  chatService = inject(ChatService);
  authService = inject(AuthService);

  groupName = signal('');
  selectedMemberIds = signal<Set<string>>(new Set());
  isCreating = signal(false);

  selectableUsers = computed(() =>
    this.chatService.onlineUsers().filter(
      u => u.id !== 'gemini-ai' && u.id !== this.authService.currentLoggedUser?.id
    )
  );

  toggleMember(userId: string) {
    this.selectedMemberIds.update(ids => {
      const updated = new Set(ids);
      if (updated.has(userId)) {
        updated.delete(userId);
      } else {
        updated.add(userId);
      }
      return updated;
    });
  }

  isSelected(userId: string): boolean {
    return this.selectedMemberIds().has(userId);
  }

  async create() {
    const name = this.groupName().trim();
    if (!name || this.selectedMemberIds().size === 0) return;

    this.isCreating.set(true);
    try {
      await this.chatService.createGroup(name, [...this.selectedMemberIds()]);
      this.dialogRef.close();
    } catch {
      // silently fail
    } finally {
      this.isCreating.set(false);
    }
  }

  close() {
    this.dialogRef.close();
  }
}
