import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { JobProvider } from './context/JobContext'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><HashRouter><JobProvider><App /></JobProvider></HashRouter></React.StrictMode>)
