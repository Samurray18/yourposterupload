import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { CartProvider } from './store/CartProvider';
import { StorefrontProvider } from './store/StorefrontProvider';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root element is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <StorefrontProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </StorefrontProvider>
    </BrowserRouter>
  </StrictMode>,
);
