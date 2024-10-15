import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { KeysPipe } from '../../pipes/keys.pipe';
import { TreeNode } from '../../models/treeNode';
import { TreeNodeComponent } from '../tree-node/tree-node.component';
import { getFolderName } from '../../utils/getFolderName';

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
    if (
      this.generatedInstructions &&
      Object.keys(this.generatedInstructions).length > 0 &&
      (!this.generatedDocumentation ||
        Object.keys(this.generatedDocumentation).length === 0)
    ) {
      this.selectedOutputType = 'instructions';
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

    for (const relativePath in data) {
      const { type } = data[relativePath];
      const folderName = getFolderName(type);
      const markdownFileName = this.toMarkdownFileName(relativePath);

      // Build a path similar to the one used in the zip
      const normalizedPath = `${folderName}/${markdownFileName}`;
      const parts = normalizedPath.split('/');

      let currentLevel = tree;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        let existingNode = currentLevel.find((node) => node.name === part);

        if (!existingNode) {
          const nodePath = parts.slice(0, i + 1).join('/');
          const isFolder = i < parts.length - 1;

          existingNode = {
            name: part,
            isFolder: isFolder,
            expanded: this.expandedNodes.get(nodePath) || false,
            children: isFolder ? [] : undefined,
            path: isFolder ? undefined : relativePath,
          };

          currentLevel.push(existingNode);
        }

        if (existingNode.isFolder && existingNode.children) {
          currentLevel = existingNode.children;
        } else {
          break;
        }
      }
    }

    return tree;
  }

  private toMarkdownFileName(relativePath: string): string {
    const baseName =
      relativePath
        .split('/')
        .pop()
        ?.replace(/\.[^/.]+$/, '') || 'untitled';
    return `${baseName}.md`;
  }

  toggleNode(node: TreeNode): void {
    if (node.isFolder) {
      node.expanded = !node.expanded;
      this.expandedNodes.set(node.path!, node.expanded);
    }
  }
}
