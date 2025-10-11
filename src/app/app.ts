import { Component } from '@angular/core';
import { NavigationComponent } from './shared/navigation/navigation.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NavigationComponent],
  template: '<app-navigation></app-navigation>',
  styleUrls: ['./app.scss']
})
export class App {
  title = 'Weather Dashboard';
}