// src\app\components\tree-node\tree-node.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreeNode } from '../../models/treeNode';

@Component({
  selector: 'app-tree-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tree-node.component.html',
  styleUrls: ['./tree-node.component.scss'],
})
export class TreeNodeComponent {
  @Input() node!: TreeNode;
  @Output() fileSelected = new EventEmitter<string>();

  toggle(): void {
    this.node.expanded = !this.node.expanded;
  }

  selectFile(): void {
    if (this.node.path) {
      this.fileSelected.emit(this.node.path);
    }
  }

  onFileSelected(path: string): void {
    this.fileSelected.emit(path);
  }
}
