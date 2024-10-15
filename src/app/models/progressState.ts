export interface ProgressState {
  key: string;
  isVisible: boolean;
  totalItems: number;
  completedItems: number;
  isWaitingForRetry: boolean;
  statusText: string;
}
