import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ProgressState } from '../models/progressState';

@Injectable({
  providedIn: 'root',
})
export class ProgressService {
  private progressStatesSubject = new BehaviorSubject<ProgressState[]>([]);
  progressStates$ = this.progressStatesSubject.asObservable();

  private progressStatesMap = new Map<string, ProgressState>();

  setProgressState(key: string, state: Partial<ProgressState>): void {
    const currentState = this.progressStatesMap.get(key) || {
      key,
      isVisible: false,
      totalItems: 0,
      completedItems: 0,
      isWaitingForRetry: false,
      statusText: '',
    };
    const updatedState = { ...currentState, ...state };
    this.progressStatesMap.set(key, updatedState);
    this.emitProgressStates();
  }

  removeProgressState(key: string): void {
    this.progressStatesMap.delete(key);
    this.emitProgressStates();
  }

  private emitProgressStates(): void {
    this.progressStatesSubject.next(
      Array.from(this.progressStatesMap.values())
    );
  }
}
