import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class OpenaiService {
  private apiUrl = '';

  private apiKey = '';

  constructor(private http: HttpClient) {}

  generateDocumentation(
    relativePath: string,
    sourceCode: string,
    template: string
  ): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'api-key': this.apiKey,
    });

    const messages = [
      {
        role: 'system',
        content: `Strictly using the following template:
      ${template}

      Don't give any additional explanation, don't include anything like "html-template" with the whole component code. Generate detailed documentation in markdown format for the Angular code provided by the user. Always include the path to the component in the description of the component. Whenever you write a typescript codeblock, mark it with the language "javascript".
      `,
      },
      {
        role: 'user',
        content: `Here is the Angular code found in this relativePath(${relativePath}) that I want to generate documentation for:
      ${sourceCode}
      `,
      },
    ];

    const body = {
      messages: messages,
      // Optionally, you can add other parameters like max_tokens, temperature, etc.
    };

    return this.http.post(this.apiUrl, body, { headers });
  }

  generateUserInstructions(sourceCode: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'api-key': this.apiKey,
    });

    const messages = [
      {
        role: 'system',
        content: `You are a helpful assistant and you are instructed to, based on  the code provided by the user, generate instructions for the final user of the application, explaining how to use the component.
        You should generate a markdown file with the instructions for the final user. Give as many details as possible, and make sure that the instructions are clear and easy to understand for a non-technical user. Don't worry about the length, the longer the instructions are, the better. Make sure that every step is explained and any question the user might have is answered.
      Don't give any additional explanation, don't include any code in the instructions and don't wrap it all in a code block. Keep in mind that the user is not a developer.
      `,
      },
      {
        role: 'user',
        content: `Here is the Angular code that I want to generate instructions for:
      ${sourceCode}
      `,
      },
    ];

    const body = {
      messages: messages,
      // Optionally, you can add other parameters like max_tokens, temperature, etc.
    };

    return this.http.post(this.apiUrl, body, { headers });
  }

  generateFAQs(instructions: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'api-key': this.apiKey,
    });

    const messages = [
      {
        role: 'system',
        content: `You are a helpful assistant. Based on the user instructions provided, generate a list of frequently asked questions (FAQs) that users might have about the application. Provide concise and clear answers to each question.`,
      },
      {
        role: 'user',
        content: `Here are the user instructions that I want to generate FAQs for:
      ${instructions}
      `,
      },
    ];

    const body = {
      messages: messages,
    };

    return this.http.post(this.apiUrl, body, { headers });
  }
}
