import React from 'react'
import ReactDOM from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'
import App from './App.jsx'
import './index.css'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import theme from './theme.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <ModalsProvider>
        <Notifications position="top-right" zIndex={1000} />
        <App />
      </ModalsProvider>
    </MantineProvider>
  </React.StrictMode>,
)

