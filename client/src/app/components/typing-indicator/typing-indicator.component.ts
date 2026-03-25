import { Component } from '@angular/core';

@Component({
  selector: 'app-typing-indicator',
  imports: [],
  template: `
    <div class="flex items-center gap-1 py-0.5">
      <div class="w-[6px] h-[6px] bg-amber-400 rounded-full bounce-1"></div>
      <div class="w-[6px] h-[6px] bg-amber-400 rounded-full bounce-2"></div>
      <div class="w-[6px] h-[6px] bg-amber-400 rounded-full bounce-3"></div>
    </div>
  `,
  styles: ``,
})
export class TypingIndicatorComponent {}
