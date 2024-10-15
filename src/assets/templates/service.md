# OpenaiService

## Description

The `OpenaiService` is an Angular service located at `app/services/openai.service.ts`. It provides methods to interact with the OpenAI API for generating documentation and user instructions based on provided source code.

## Methods

- **generateDocumentation**: This method takes in a relative path, source code, and a template to generate documentation. It returns an `Observable` with the API response.
  
  ```javascript
  generateDocumentation(relativePath: string, sourceCode: string, template: string): Observable<any>
  ```

- **generateUserInstructions**: This method accepts source code as input and generates user instructions for the final user of the application. It returns an `Observable` with the API response.
  
  ```javascript
  generateUserInstructions(sourceCode: string): Observable<any>
  ```

## Properties

- **apiUrl**: A private property that holds the URL for the OpenAI API where the requests will be sent.
  
  ```javascript
  private apiUrl = 'https://openai-av-prod-weu.openai.azure.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-08-01-preview';
  ```

- **apiKey**: A private property that stores the API key required for authentication when making requests to the OpenAI service.
  
  ```javascript
  private apiKey = 'fce0ac2350c447ec9f4c5222bce88fb6';
  ```

## Dependencies

- `@angular/core`: For creating the Angular service.
- `@angular/common/http`: For making HTTP requests.
- `rxjs`: For handling asynchronous data streams with `Observable`.

## Usage Example

```javascript
import { OpenaiService } from './services/openai.service';

constructor(private openaiService: OpenaiService) {}

// Generating documentation
this.openaiService.generateDocumentation('some/relative/path', 'const example = "Hello World";', 'Your template here')
  .subscribe(response => {
    console.log(response);
  });

// Generating user instructions
this.openaiService.generateUserInstructions('const example = "Hello World";')
  .subscribe(response => {
    console.log(response);
  });
```