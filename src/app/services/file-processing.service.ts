import { Injectable } from '@angular/core';
import ts from 'typescript';

@Injectable({
  providedIn: 'root',
})
export class FileProcessingService {
  constructor() {}

  async processFiles(files: File[]): Promise<ComponentInfo[]> {
    const componentInfos: ComponentInfo[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Read file content
      const sourceCode = await file.text();

      // Create a TypeScript SourceFile
      const sourceFile = ts.createSourceFile(
        file.name,
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      // Analyze the source file to extract component information
      const analyzedComponents = this.analyzeSourceFile(sourceFile);

      // For each component found, associate its relativePath and sourceCode
      for (const componentInfo of analyzedComponents) {
        componentInfo.relativePath =
          (file as any).webkitRelativePath || file.name;
        componentInfo.sourceCode = sourceCode; // You might want to extract only the relevant portion
        componentInfos.push(componentInfo);
      }
    }

    return componentInfos;
  }

  analyzeSourceFile(sourceFile: ts.SourceFile): ComponentInfo[] {
    const componentInfos: ComponentInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        const className = node.name.text;

        const decorators = ts.getDecorators(node);

        let templateName = '';
        let templateUrl = '';

        if (decorators) {
          decorators.forEach((decorator) => {
            const expression = decorator.expression;
            if (ts.isCallExpression(expression)) {
              const decoratorName = expression.expression.getText();

              // Match decorator to template
              if (decoratorName === 'Component') {
                templateName = 'component';

                // Get the @Component decorator argument
                const args = expression.arguments;
                if (args.length > 0) {
                  const arg = args[0];
                  if (ts.isObjectLiteralExpression(arg)) {
                    arg.properties.forEach((prop) => {
                      if (
                        ts.isPropertyAssignment(prop) &&
                        ts.isIdentifier(prop.name)
                      ) {
                        const propName = prop.name.text;
                        if (propName === 'templateUrl') {
                          if (ts.isStringLiteral(prop.initializer)) {
                            templateUrl = prop.initializer.text;
                          }
                        }
                      }
                    });
                  }
                }
              } else if (decoratorName === 'Directive') {
                templateName = 'directive';
              } else if (decoratorName === 'Injectable') {
                // Determine if it's a service, guard, interceptor, resolver
                const heritageClauses = node.heritageClauses || [];
                let implementsTexts: string[] = [];
                heritageClauses.forEach((clause) => {
                  if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
                    implementsTexts = clause.types.map((type) =>
                      type.getText()
                    );
                  }
                });

                if (implementsTexts.includes('HttpInterceptor')) {
                  templateName = 'interceptor';
                } else if (
                  implementsTexts.includes('CanActivate') ||
                  implementsTexts.includes('CanActivateChild') ||
                  implementsTexts.includes('CanDeactivate') ||
                  implementsTexts.includes('CanLoad')
                ) {
                  templateName = 'guard';
                } else if (
                  implementsTexts.find((text) => text.startsWith('Resolve<'))
                ) {
                  templateName = 'resolver';
                } else {
                  templateName = 'service'; // Default to service for @Injectable()
                }
              } else if (decoratorName === 'Pipe') {
                templateName = 'pipe';
              } else if (decoratorName === 'NgModule') {
                templateName = 'module';
              }
            }
          });
        }

        if (templateName) {
          const sourceCode = node.getText(sourceFile);
          componentInfos.push({
            className,
            templateName,
            sourceCode,
            templateUrl,
          });
        }
      } else if (ts.isInterfaceDeclaration(node)) {
        const interfaceName = node.name.text;
        const sourceCode = node.getText(sourceFile);
        componentInfos.push({
          name: interfaceName,
          templateName: 'interface',
          sourceCode,
        });
      } else if (ts.isEnumDeclaration(node)) {
        const enumName = node.name.text;
        const sourceCode = node.getText(sourceFile);
        componentInfos.push({
          name: enumName,
          templateName: 'enum',
          sourceCode,
        });
      } else if (ts.isTypeAliasDeclaration(node)) {
        const typeName = node.name.text;
        const sourceCode = node.getText(sourceFile);
        componentInfos.push({
          name: typeName,
          templateName: 'type',
          sourceCode,
        });
      } else if (ts.isVariableStatement(node)) {
        if (
          node.modifiers?.some(
            (mod) => mod.kind === ts.SyntaxKind.ExportKeyword
          )
        ) {
          const declarationList = node.declarationList;
          if (declarationList.flags & ts.NodeFlags.Const) {
            const declarations = declarationList.declarations;
            declarations.forEach((decl) => {
              const name = decl.name.getText(sourceFile);
              const sourceCode = decl.getText(sourceFile);
              componentInfos.push({
                name,
                templateName: 'constant',
                sourceCode,
              });
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    return componentInfos;
  }
}

export interface ComponentInfo {
  name?: string;
  className?: string;
  templateName: string;
  sourceCode: string;
  relativePath?: string;
  templateUrl?: string;
}
