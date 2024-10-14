import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'keys',
  standalone: true,
  pure: false, // Set the pipe to be impure
})
export class KeysPipe implements PipeTransform {
  transform(value: any): string[] {
    if (value) {
      return Object.keys(value);
    }
    return [];
  }
}
