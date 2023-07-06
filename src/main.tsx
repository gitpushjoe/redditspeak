import './main.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home/Home'
import ReactDOM from 'react-dom'
import { Helmet } from 'react-helmet'

function App() {
  return <>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet"/>
    <iframe id="youtube-iframe" src="https://www.youtube.com/embed/n_Dv4JMiwK8?enablejsapi=1&t=9s&mute=true" width="1920" height="1080" className="iframe"></iframe>
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Home />} />
        </Routes>
    </BrowserRouter>
    <Helmet>
        <script src="https://www.youtube.com/iframe_api" type="text/javascript" defer/>
        <script src="script.js" type="text/javascript" defer/>
    </Helmet>
  </>
}

export default App

const root = document.getElementById('root')
ReactDOM.render(<App />, root)