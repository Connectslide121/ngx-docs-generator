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
import { ProgressService } from '../../services/progress.service';
import { ProgressContainerComponent } from '../progress-container/progress-container.component';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, PreviewerComponent, ProgressContainerComponent],
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
  isFAQsProcessing: boolean = false;
  errorMessage: string = '';

  selectedDocumentKey: string | null = null;
  currentProcess: 'documentation' | 'instructions' | null = null;

  constructor(
    private fileProcessingService: FileProcessingService,
    private openaiService: OpenaiService,
    private http: HttpClient,
    private progressService: ProgressService
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

    const progressKey = 'documentation';

    this.isDocumentationProcessing = true;
    this.progressService.setProgressState(progressKey, {
      isVisible: true,
      totalItems: 0,
      completedItems: 0,
      isWaitingForRetry: false,
      statusText: '',
    });
    try {
      const componentInfos = await this.fileProcessingService.processFiles(
        this.selectedFiles.map((item) => item.file)
      );

      const totalItems = componentInfos.length;
      this.progressService.setProgressState(progressKey, { totalItems });

      let completedItems = 0;

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
            2,
            progressKey
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

        completedItems++;
        this.progressService.setProgressState(progressKey, { completedItems });
      }
    } catch (error) {
      console.error('An error occurred:', error);
      this.errorMessage = 'An error occurred while processing the files.';
    } finally {
      this.isDocumentationProcessing = false;
      this.progressService.removeProgressState(progressKey);
    }
  }

  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries: number,
    delayMs: number,
    backoffFactor: number,
    progressKey?: string
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

            this.progressService.setProgressState(progressKey!, {
              isWaitingForRetry: true,
              retryCountdown: currentDelay / 1000, // Set initial countdown
            });

            // Countdown logic
            for (let i = currentDelay / 1000; i > 0; i--) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              this.progressService.setProgressState(progressKey!, {
                retryCountdown: i - 1,
              });
            }

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
      } finally {
        if (progressKey) {
          this.progressService.setProgressState(progressKey, {
            isWaitingForRetry: false,
            retryCountdown: undefined, // Reset countdown
          });
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

  private async downloadZip(
    data: { [key: string]: { type: string; content: string } },
    zipFileName: string
  ): Promise<void> {
    const zip = new JSZip();

    for (const relativePath in data) {
      const { type, content } = data[relativePath];
      const markdownFileName = this.toMarkdownFileName(relativePath);

      // If the type is 'faqs', place it directly at the root level
      const markdownPath =
        type === 'faqs'
          ? markdownFileName
          : `${getFolderName(type)}/${markdownFileName}`;

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

    const progressKey = 'instructions';

    this.isInstructionsProcessing = true;
    this.currentProcess = 'instructions';
    this.progressService.setProgressState(progressKey, {
      isVisible: true,
      totalItems: 0,
      completedItems: 0,
      isWaitingForRetry: false,
      statusText: '',
    });

    try {
      const componentInfos = await this.fileProcessingService.processFiles(
        this.selectedFiles.map((item) => item.file)
      );

      const componentOnlyInfos = componentInfos.filter(
        (info) => info.templateName === 'component'
      );

      const totalItems = componentOnlyInfos.length;
      this.progressService.setProgressState(progressKey, { totalItems });

      let completedItems = 0;

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
            2,
            progressKey
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

        completedItems++;
        this.progressService.setProgressState(progressKey, { completedItems });
      }
    } catch (error) {
      console.error('An error occurred:', error);
      this.errorMessage = 'An error occurred while processing the files.';
    } finally {
      this.isInstructionsProcessing = false;
      this.currentProcess = null;
      this.progressService.removeProgressState(progressKey);
    }
  }

  async downloadInstructions(): Promise<void> {
    if (!this.generatedInstructions) {
      console.error('No instructions available to download.');
      return;
    }

    await this.downloadZip(this.generatedInstructions, 'instructions.zip');
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

  async generateFAQs(): Promise<void> {
    if (this.isGeneratedInstructionsEmpty()) {
      alert('Please generate instructions first.');
      return;
    }

    this.isFAQsProcessing = true;

    const progressKey = 'faqs';

    this.progressService.setProgressState(progressKey, {
      isVisible: true,
      totalItems: 1,
      completedItems: 0,
      isWaitingForRetry: false,
      statusText: '',
    });

    try {
      const allInstructions = Object.values(this.generatedInstructions)
        .map((instruction) => instruction.content)
        .join('\n\n');

      const response = await firstValueFrom(
        this.openaiService.generateFAQs(allInstructions)
      );

      const faqs = response.choices[0]?.message?.content;
      const faqKey = 'faqs';

      if (faqs) {
        this.generatedInstructions[faqKey] = {
          type: 'faqs',
          content: faqs,
        };

        // Trigger change detection
        this.generatedInstructions = { ...this.generatedInstructions };
      }
    } catch (error) {
      console.error('Error generating FAQs:', error);
    } finally {
      this.progressService.removeProgressState(progressKey);
      this.isFAQsProcessing = false;
    }
  }

  async downloadFAQs(): Promise<void> {
    if (!this.generatedInstructions['faqs']) {
      console.error('No FAQs available to download.');
      return;
    }

    const faqsData = {
      faqs: this.generatedInstructions['faqs'],
    };

    await this.downloadZip(faqsData, 'faqs.zip');
  }
}
