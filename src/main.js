import './style.css';
import { App } from './app/App.js';

const root = document.querySelector('#app');

if (root) {
  const app = new App(root);
  app.mount();
}
