import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class OpenaiService {
  private apiUrl =
    'https://openai-av-prod-weu.openai.azure.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-08-01-preview';

  private apiKey = 'fce0ac2350c447ec9f4c5222bce88fb6';

  constructor(private http: HttpClient) {}

  generateDocumentation(sourceCode: string, template: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'api-key': this.apiKey,
    });

    const messages = [
      {
        role: 'system',
        content: `Strictly using the following template:
      ${template}

      Don't give any additional explanation, don't include anything like "html-template" with the whole component code. Generate detailed documentation in markdown format for the following Angular code:
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
}
