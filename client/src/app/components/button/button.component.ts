import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.css',
})
export class ButtonComponent {
  isDisabled = input<boolean>();
  isLoading = input<boolean>();
  action = output<void>();
  text = input.required<string>();

  clickHandler() {
this.action.emit();
  }
}
