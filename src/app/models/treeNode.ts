export interface TreeNode {
  name: string;
  children?: TreeNode[];
  isFolder: boolean;
  path?: string; // Full path for files
  expanded?: boolean; // To track the expanded state
}
