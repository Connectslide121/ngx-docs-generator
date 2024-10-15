import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { ProgressService } from '../../services/progress.service';
import { ProgressIndicatorComponent } from '../progress-indicator/progress-indicator.component';
import { ProgressState } from '../../models/progressState';

@Component({
  selector: 'app-progress-container',
  standalone: true,
  imports: [CommonModule, ProgressIndicatorComponent],
  templateUrl: './progress-container.component.html',
  styleUrls: ['./progress-container.component.scss'],
})
export class ProgressContainerComponent {
  progressStates$: Observable<ProgressState[]>;

  constructor(private progressService: ProgressService) {
    this.progressStates$ = this.progressService.progressStates$;
  }
}
