import { Component } from '@angular/core';
import { FileProcessingService } from '../../services/file-processing.service';
import { OpenaiService } from '../../services/openai.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { PreviewerComponent } from '../previewer/previewer.component';
import { ComponentInfo } from '../../models/componentInfo';
import { getFolderName } from '../../utils/getFolderName';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, PreviewerComponent],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss'],
})
export class UploadComponent {
  selectedFiles: { file: File; relativePath: string }[] = [];
  generatedDocumentation: {
    [key: string]: { type: string; content: string };
  } = {};
  generatedInstructions: {
    [key: string]: { type: string; content: string };
  } = {};
  isDocumentationProcessing: boolean = false;
  isInstructionsProcessing: boolean = false;
  errorMessage: string = '';

  selectedDocumentKey: string | null = null;
  currentProcess: 'documentation' | 'instructions' | null = null;

  constructor(
    private fileProcessingService: FileProcessingService,
    private openaiService: OpenaiService,
    private http: HttpClient
  ) {}

  onFileSelected(event: any): void {
    const files = event.target.files;
    const selected: { file: File; relativePath: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath =
        file.webkitRelativePath || file.relativePath || file.name; // Fallback to file name

      selected.push({
        file: file,
        relativePath: relativePath.replace(/\\/g, '/'), // Normalize path separators
      });
    }

    this.selectedFiles = selected;
  }

  async generateDocumentation(): Promise<void> {
    if (this.selectedFiles.length === 0) {
      alert('Please select files first.');
      return;
    }

    this.isDocumentationProcessing = true;

    try {
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
                  componentInfo.relativePath!,
                  componentInfo.sourceCode,
                  template
                )
              ),
            5,
            60000,
            2
          );

          const documentation = response.choices[0]?.message?.content;
          const key = componentInfo.relativePath!.replace(/\\/g, '/');

          if (documentation && key) {
            this.generatedDocumentation[key] = {
              type: componentInfo.templateName,
              content: documentation,
            };

            // Trigger change detection
            this.generatedDocumentation = { ...this.generatedDocumentation };
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
            await new Promise((resolve) => setTimeout(resolve, currentDelay));
            currentDelay *= backoffFactor;
            attempt++;
          } else {
            throw new Error(
              `Max retries reached. Unable to complete the request.`
            );
          }
        } else {
          throw error;
        }
      }
    }
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
    if (!this.generatedDocumentation) {
      console.error('No documentation available to download.');
      return;
    }

    await this.downloadZip(this.generatedDocumentation, 'documentation.zip');
  }

  async downloadInstructions(): Promise<void> {
    if (!this.generatedInstructions) {
      console.error('No instructions available to download.');
      return;
    }

    await this.downloadZip(this.generatedInstructions, 'instructions.zip');
  }

  private async downloadZip(
    data: { [key: string]: { type: string; content: string } },
    zipFileName: string
  ): Promise<void> {
    const zip = new JSZip();

    for (const relativePath in data) {
      const { type, content } = data[relativePath];
      const folderName = getFolderName(type);
      const markdownFileName = this.toMarkdownFileName(relativePath);
      const markdownPath = `${folderName}/${markdownFileName}`;
      zip.file(markdownPath, content);
    }

    const contentBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(contentBlob, zipFileName);
  }

  private toMarkdownFileName(relativePath: string): string {
    const baseName =
      relativePath
        .split('/')
        .pop()
        ?.replace(/\.[^/.]+$/, '') || 'untitled';
    return `${baseName}.md`;
  }

  async loadHtmlTemplate(componentInfo: ComponentInfo): Promise<string> {
    if (!componentInfo.templateUrl) {
      return '';
    }

    const componentDir = componentInfo.relativePath?.substring(
      0,
      componentInfo.relativePath.lastIndexOf('/')
    );

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

  async generateUserInstructions(): Promise<void> {
    if (this.selectedFiles.length === 0) {
      alert('Please select files first.');
      return;
    }

    this.isInstructionsProcessing = true;
    this.currentProcess = 'instructions';

    try {
      const componentInfos = await this.fileProcessingService.processFiles(
        this.selectedFiles.map((item) => item.file)
      );

      const componentOnlyInfos = componentInfos.filter(
        (info) => info.templateName === 'component'
      );

      for (const componentInfo of componentOnlyInfos) {
        const htmlTemplate = await this.loadHtmlTemplate(componentInfo);
        const combinedCode = `${componentInfo.sourceCode}\n\nTemplate HTML:\n${htmlTemplate}`;

        try {
          const response = await this.retryWithBackoff(
            () =>
              firstValueFrom(
                this.openaiService.generateUserInstructions(combinedCode)
              ),
            5,
            60000,
            2
          );

          const instructions = response.choices[0]?.message?.content;
          const key = componentInfo.relativePath!.replace(/\\/g, '/');

          if (instructions && key) {
            this.generatedInstructions[key] = {
              type: componentInfo.templateName,
              content: instructions,
            };

            // Trigger change detection
            this.generatedInstructions = { ...this.generatedInstructions };
          }
        } catch (error) {
          console.error('Error generating user instructions:', error);
        }
      }

      console.log('Final Generated Instructions:', this.generatedInstructions);
    } catch (error) {
      console.error('An error occurred:', error);
      this.errorMessage = 'An error occurred while processing the files.';
    } finally {
      this.isInstructionsProcessing = false;
      this.currentProcess = null;
    }
  }

  removeLastDirectory(path: string): string {
    const pathParts = path.split('/');
    if (pathParts.length > 1) {
      pathParts.splice(pathParts.length - 2, 1);
    }
    return pathParts.join('/');
  }

  onDocumentSelect(key: string): void {
    this.selectedDocumentKey = key;
  }

  isGeneratedDocumentationEmpty(): boolean {
    return Object.keys(this.generatedDocumentation).length === 0;
  }

  isGeneratedInstructionsEmpty(): boolean {
    return Object.keys(this.generatedInstructions).length === 0;
  }
}
