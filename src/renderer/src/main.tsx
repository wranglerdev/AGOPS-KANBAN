import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from '@renderer/lib/queryClient'
import { router } from '@renderer/router'
import { ThemeProvider } from '@renderer/theme/ThemeProvider'
import { SelectedProjectProvider } from '@renderer/state/SelectedProject'
import { ToastProvider } from '@renderer/components/Toast'
import { ConfirmProvider } from '@renderer/components/ConfirmDialog'
import { registerSW } from 'virtual:pwa-register'
import '@renderer/theme/theme.css'

registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <QueryClientProvider client={queryClient}>
            <SelectedProjectProvider>
              <RouterProvider router={router} />
            </SelectedProjectProvider>
          </QueryClientProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
)
