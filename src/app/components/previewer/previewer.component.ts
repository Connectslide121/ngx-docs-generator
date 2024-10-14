import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { KeysPipe } from '../../pipes/keys.pipe';
import { TreeNode } from '../../models/treeNode';
import { TreeNodeComponent } from '../tree-node/tree-node.component';

@Component({
  selector: 'app-previewer',
  standalone: true,
  imports: [CommonModule, MarkdownModule, KeysPipe, TreeNodeComponent],
  templateUrl: './previewer.component.html',
  styleUrls: ['./previewer.component.scss'],
})
export class PreviewerComponent implements OnChanges {
  @Input() generatedDocumentation: {
    [key: string]: { type: string; content: string };
  } | null = null;
  @Input() generatedInstructions: {
    [key: string]: { type: string; content: string };
  } | null = null;

  selectedOutputType: 'documentation' | 'instructions' = 'documentation';
  selectedDocumentKey: string | null = null;

  documentationTree: TreeNode[] = [];
  instructionsTree: TreeNode[] = [];

  private expandedNodes: Map<string, boolean> = new Map();

  objectKeys(obj: object | null): string[] {
    return obj ? Object.keys(obj) : [];
  }

  private oldDocumentationTree: TreeNode[] = [];
  private oldInstructionsTree: TreeNode[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['generatedDocumentation']) {
      const newTree = this.buildTree(this.generatedDocumentation);
      this.documentationTree = this.mergeTreeState(
        this.oldDocumentationTree,
        newTree
      );
      this.oldDocumentationTree = this.documentationTree;
    }
    if (changes['generatedInstructions']) {
      const newTree = this.buildTree(this.generatedInstructions);
      this.instructionsTree = this.mergeTreeState(
        this.oldInstructionsTree,
        newTree
      );
      this.oldInstructionsTree = this.instructionsTree;
    }
  }

  private mergeTreeState(oldTree: TreeNode[], newTree: TreeNode[]): TreeNode[] {
    return newTree.map((newNode) => {
      const oldNode = oldTree.find(
        (on) => on.name === newNode.name && on.isFolder === newNode.isFolder
      );
      if (oldNode && newNode.isFolder) {
        newNode.expanded = oldNode.expanded;
        newNode.children = this.mergeTreeState(
          oldNode.children || [],
          newNode.children || []
        );
      }
      return newNode;
    });
  }

  onDocumentSelect(path: string): void {
    this.selectedDocumentKey = path;
  }

  get currentData(): {
    [key: string]: { type: string; content: string };
  } | null {
    return this.selectedOutputType === 'documentation'
      ? this.generatedDocumentation
      : this.generatedInstructions;
  }

  get currentTree(): TreeNode[] {
    return this.selectedOutputType === 'documentation'
      ? this.documentationTree
      : this.instructionsTree;
  }

  get currentTitle(): string {
    return this.selectedOutputType === 'documentation'
      ? 'Generated Documentation'
      : 'Generated Instructions';
  }

  private buildTree(
    data: { [key: string]: { type: string; content: string } } | null
  ): TreeNode[] {
    if (!data) return [];

    const tree: TreeNode[] = [];

    Object.keys(data).forEach((path) => {
      const normalizedPath = path.replace(/\\/g, '/');
      const parts = normalizedPath.split('/');
      const isComponent = data[path].type === 'component';

      if (parts.length <= 1) {
        return;
      }

      let currentLevel = tree;
      const depth = isComponent ? parts.length - 2 : parts.length - 1;

      for (let i = 1; i < depth; i++) {
        const part = parts[i];
        let existingNode = currentLevel.find((node) => node.name === part);

        if (!existingNode) {
          const nodePath = parts.slice(1, i + 1).join('/');
          existingNode = {
            name: part,
            isFolder: true,
            expanded: this.expandedNodes.get(nodePath) || false,
            children: [],
          };
          currentLevel.push(existingNode);
        }

        this.expandedNodes.set(
          parts.slice(1, i + 1).join('/'),
          existingNode.expanded!
        );
        currentLevel = existingNode.children!;
      }

      currentLevel.push({
        name: parts[parts.length - 1],
        isFolder: false,
        path: normalizedPath,
      });
    });

    return tree;
  }

  toggleNode(node: TreeNode): void {
    if (node.isFolder) {
      node.expanded = !node.expanded;
      this.expandedNodes.set(node.path!, node.expanded);
    }
  }
}
