import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { MousePickerOverlay } from './components/config/MousePickerOverlay'
import './index.css'

const searchParams = new URLSearchParams(window.location.search)
const RootComponent = searchParams.get('mode') === 'mouse-picker' ? MousePickerOverlay : App

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
)
