export function getFolderName(type: string): string {
  const typeToFolderMap: { [key: string]: string } = {
    component: 'Components',
    service: 'Services',
    interceptor: 'Interceptors',
    guard: 'Guards',
    resolver: 'Resolvers',
    directive: 'Directives',
    pipe: 'Pipes',
    module: 'Modules',
    interface: 'Interfaces',
    enum: 'Enums',
    type: 'Types',
    constant: 'Constants',
    // Add more mappings as needed
  };

  return typeToFolderMap[type] || 'Others';
}
