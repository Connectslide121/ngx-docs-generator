import { Component } from '@angular/core';
import {
  FileProcessingService,
  ComponentInfo,
} from '../../services/file-processing.service';
import { OpenaiService } from '../../services/openai.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { MarkdownComponent, provideMarkdown } from 'ngx-markdown';
import { KeysPipe } from '../../pipes/keys.pipe';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, KeysPipe, MarkdownComponent],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss'],
  providers: [provideMarkdown()],
})
export class UploadComponent {
  selectedFiles: { file: File; relativePath: string }[] = [];
  generatedDocumentation: { [key: string]: string } | null = null;
  generatedInstructions: { [key: string]: string } | null = null;
  isDocumentationProcessing: boolean = false;
  isInstructionsProcessing: boolean = false;
  errorMessage: string = '';

  selectedDocumentKey: string | null = null;
  currentProcess: 'documentation' | 'instructions' | null = null;
  selectedOutputType: 'documentation' | 'instructions' = 'documentation';

  constructor(
    private fileProcessingService: FileProcessingService,
    private openaiService: OpenaiService,
    private http: HttpClient
  ) {}

  onFileSelected(event: any): void {
    const files = event.target.files;
    this.selectedFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath =
        file.webkitRelativePath || file.relativePath || file.name; // Fallback to file name

      this.selectedFiles.push({
        file: file,
        relativePath: relativePath,
      });
    }
  }

  async generateDocumentation(): Promise<void> {
    if (this.selectedFiles.length === 0) {
      alert('Please select files first.');
      return;
    }

    this.isDocumentationProcessing = true;
    this.generatedDocumentation = {};

    try {
      // Pass the files to processFiles
      const componentInfos = await this.fileProcessingService.processFiles(
        this.selectedFiles.map((item) => item.file)
      );

      for (const componentInfo of componentInfos) {
        const template = await this.loadTemplate(componentInfo.templateName);

        if (!template) {
          console.error(`Template not found for ${componentInfo.templateName}`);
          continue;
        }

        try {
          const response = await this.retryWithBackoff(
            () =>
              firstValueFrom(
                this.openaiService.generateDocumentation(
                  componentInfo.sourceCode,
                  template
                )
              ),
            5, // Number of retries
            60000, // Initial delay in milliseconds (1 minute)
            2 // Backoff factor (delay doubles each time)
          );

          const documentation = response.choices[0]?.message?.content;
          const key = componentInfo.relativePath;

          // Only add to generatedDocumentation if documentation is generated
          if (documentation && key) {
            this.generatedDocumentation[key] = documentation;
          }
        } catch (error) {
          console.error('Error generating documentation:', error);
        }
      }
    } catch (error) {
      console.error('An error occurred:', error);
      this.errorMessage = 'An error occurred while processing the files.';
    } finally {
      this.isDocumentationProcessing = false;
    }
  }

  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries: number,
    delayMs: number,
    backoffFactor: number
  ): Promise<T> {
    let attempt = 0;
    let currentDelay = delayMs;

    while (attempt <= retries) {
      try {
        return await fn();
      } catch (error: any) {
        if (error.status === 429) {
          if (attempt < retries) {
            console.warn(
              `Attempt ${
                attempt + 1
              }: Received 429 Too Many Requests. Waiting for ${currentDelay}ms before retrying...`
            );
            // Wait for the current delay before retrying
            await new Promise((resolve) => setTimeout(resolve, currentDelay));
            // Increase the delay for the next retry
            currentDelay *= backoffFactor;
            attempt++;
          } else {
            // Max retries reached, throw the error
            throw new Error(
              `Max retries reached. Unable to complete the request.`
            );
          }
        } else {
          // If it's not a 429 error, rethrow it
          throw error;
        }
      }
    }
    // This point should not be reached
    throw new Error('An unexpected error occurred during retries.');
  }

  async loadTemplate(templateName: string): Promise<string> {
    const templatePath = `assets/templates/${templateName}.md`;
    try {
      const response = await firstValueFrom(
        this.http.get(templatePath, { responseType: 'text' })
      );
      return response;
    } catch (error) {
      throw new Error(`Template not found: ${templatePath}`);
    }
  }

  async downloadDocumentation(): Promise<void> {
    const zip = new JSZip();

    for (const relativePath in this.generatedDocumentation) {
      const documentation = this.generatedDocumentation[relativePath];

      // Remove the last directory from the path
      const markdownPath = this.removeLastDirectory(relativePath).replace(
        /\.[^/.]+$/,
        '.md'
      );

      zip.file(markdownPath, documentation);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'documentation.zip');
  }

  removeLastDirectory(path: string): string {
    const pathParts = path.split('/');
    if (pathParts.length > 1) {
      // Remove the second-to-last part if the last part is a file name
      pathParts.splice(pathParts.length - 2, 1);
    }
    return pathParts.join('/');
  }

  onDocumentSelect(key: string): void {
    this.selectedDocumentKey = key;
  }

  async generateUserInstructions(): Promise<void> {
    if (this.selectedFiles.length === 0) {
      alert('Please select files first.');
      return;
    }

    this.isInstructionsProcessing = true;
    this.currentProcess = 'instructions';
    this.generatedInstructions = {};

    try {
      // Pass the files to processFiles
      const componentInfos = await this.fileProcessingService.processFiles(
        this.selectedFiles.map((item) => item.file)
      );

      // Filter to include only components
      const componentOnlyInfos = componentInfos.filter(
        (info) => info.templateName === 'component'
      );

      for (const componentInfo of componentOnlyInfos) {
        // Load the component's HTML template
        const htmlTemplate = await this.loadHtmlTemplate(componentInfo);

        // Combine TypeScript and HTML code
        const combinedCode = `${componentInfo.sourceCode}\n\nTemplate HTML:\n${htmlTemplate}`;
        console.log('Html Template:', htmlTemplate);

        try {
          const response = await this.retryWithBackoff(
            () =>
              firstValueFrom(
                this.openaiService.generateUserInstructions(combinedCode)
              ),
            5, // Number of retries
            60000, // Initial delay in milliseconds (1 minute)
            2 // Backoff factor (delay doubles each time)
          );

          const instructions = response.choices[0]?.message?.content;
          const key = componentInfo.relativePath;

          // Only add to generatedInstructions if instructions are generated
          if (instructions && key) {
            this.generatedInstructions[key] = instructions;
          }
        } catch (error) {
          console.error('Error generating user instructions:', error);
        }
      }
    } catch (error) {
      console.error('An error occurred:', error);
      this.errorMessage = 'An error occurred while processing the files.';
    } finally {
      this.isInstructionsProcessing = false;
      this.currentProcess = null;
    }
  }

  // New method to load HTML template
  async loadHtmlTemplate(componentInfo: ComponentInfo): Promise<string> {
    if (!componentInfo.templateUrl) {
      return '';
    }

    // Get the directory of the component TypeScript file
    const componentDir = componentInfo.relativePath?.substring(
      0,
      componentInfo.relativePath.lastIndexOf('/')
    );

    // Resolve the template path relative to the component directory
    const templateRelativePath = componentInfo.templateUrl.replace('./', '');
    const templatePath = `${componentDir}/${templateRelativePath}`;

    try {
      const matchingFile = this.selectedFiles.find((item) =>
        item.relativePath.endsWith(templatePath)
      );

      if (matchingFile) {
        return await matchingFile.file.text();
      } else {
        console.warn(`Template file not found for ${templatePath}`);
        return '';
      }
    } catch (error) {
      console.error(`Error loading template ${templatePath}:`, error);
      return '';
    }
  }

  async downloadInstructions(): Promise<void> {
    const zip = new JSZip();

    for (const relativePath in this.generatedInstructions) {
      const instructions = this.generatedInstructions[relativePath];

      // Remove the last directory from the path and change extension to .md
      const markdownPath = this.removeLastDirectory(relativePath).replace(
        /\.[^/.]+$/,
        '.md'
      );

      zip.file(markdownPath, instructions);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'instructions.zip');
  }
}
