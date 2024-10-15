import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressState } from '../../models/progressState';

@Component({
  selector: 'app-progress-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-indicator.component.html',
  styleUrls: ['./progress-indicator.component.scss'],
})
export class ProgressIndicatorComponent {
  @Input() progressState!: ProgressState;

  get progressPercentage(): number {
    return (
      (this.progressState.completedItems / this.progressState.totalItems) * 100
    );
  }
}
