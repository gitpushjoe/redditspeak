import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home/Home'
import ReactDOM from 'react-dom'

function App() {

    document.body.style = 'background: #1c1e21';
  return <>
    <link
  href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap"
  rel="stylesheet"
    />
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Home />} />
        </Routes>
    </BrowserRouter>
  </>
}

export default App

const root = document.getElementById('root')
ReactDOM.render(<App />, root)