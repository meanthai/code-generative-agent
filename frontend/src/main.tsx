import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRoutes from './AppRoutes'
import { BrowserRouter as Router} from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Auth0ProviderWithNav from './Auth/Auth0ProviderWithNav';
import { Toaster } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
}); 

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <QueryClientProvider client={queryClient}>
        <Auth0ProviderWithNav>
          <AppRoutes />

          <Toaster position='top-right' visibleToasts={1} richColors/>
        </Auth0ProviderWithNav>
      </QueryClientProvider>
    </Router>
  </StrictMode>,
)
