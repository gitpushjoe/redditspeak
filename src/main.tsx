import './main.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home/Home';
import About from './pages/About/About';
import ReactDOM from 'react-dom';
import { Helmet } from 'react-helmet';
import { useState } from 'react';

function App() {
    const bgVideo = localStorage.getItem('config-backgroundVideoUrl') || 'https://www.youtube.com/embed/n_Dv4JMiwK8?enablejsapi=1&t=9s&mute=true&rel=0';
    const [backgroundVideo, setBackgroundVideo] = useState<string>(bgVideo);

    const NecessaryScripts = () => <>
        <script src="https://code.jquery.com/jquery-3.3.1.slim.min.js" integrity="sha384-q8i/X+965DzO0rT7abK41JStQIAqVgRVzpbzo5smXKp4YfRvH+8abtTE1Pi6jizo"></script>
        <script src="https://cdn.jsdelivr.net/npm/popper.js@1.14.7/dist/umd/popper.min.js" integrity="sha384-UO2eT0CpHqdSJQ6hJty5KVphtPhzWj9WO1clHTMGa3JDZwrnQq4sF86dIHNDz0W1"></script>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.3.1/dist/js/bootstrap.min.js" integrity="sha384-JjSmVgyd0p3pXB1rRibZUAYoIIy6OrQ6VrjIEaFf/nJGzIxFDsf4x0xIM+B07jRM"></script>
        <Helmet>
            <script src="/script.js" type="text/javascript" defer/>
        </Helmet>
    </>

  return <>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.3.1/dist/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossOrigin="anonymous"></link>
            <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet"/>
            {/* <Helmet>
        <script src="script.js" type="text/javascript" defer/>
    </Helmet> */}
    <BrowserRouter>
        <Routes>
            <Route path="/about" element={<About />} />
            <Route path="/r/:subreddit" element={
                <>
                <NecessaryScripts/>
                <div className="iframe-container">
                    <iframe id="youtube-iframe" src={backgroundVideo} width="1920" height="1080" className="iframe" style={{border: 'none', display: 'block'}} allow='autoplay; encrypted-media'></iframe>
                </div>
                <Home setBackgroundVideo={setBackgroundVideo}/>
                </>
            } />
            <Route path="/r/:subreddit/comments/:id" element={
                <>
                <NecessaryScripts/>
                <div className="iframe-container">
                    <iframe id="youtube-iframe" src={backgroundVideo} width="1920" height="1080" className="iframe" style={{border: 'none', display: 'block'}} allow='autoplay; encrypted-media'></iframe>
                </div>
                <Home setBackgroundVideo={setBackgroundVideo}/>
                </>
            } />
            <Route path="/r/:subreddit/comments/:id/:garbage?" element={
                <>
                <NecessaryScripts/>
                <div className="iframe-container">
                    <iframe id="youtube-iframe" src={backgroundVideo} width="1920" height="1080" className="iframe" style={{border: 'none', display: 'block'}} allow='autoplay; encrypted-media'></iframe>
                </div>
                <Home setBackgroundVideo={setBackgroundVideo}/>
                </>
            } />
            <Route path="/" element={
                <>
                <NecessaryScripts />
                <div className="iframe-container">
                    <iframe id="youtube-iframe" src={backgroundVideo} width="1920" height="1080" className="iframe" style={{border: 'none', display: 'block'}} allow='autoplay; encrypted-media'></iframe>
                </div>
                <Home setBackgroundVideo={setBackgroundVideo}/>
                </>
            } />
        </Routes>
    </BrowserRouter>
  </>;
}

export default App;

const root = document.getElementById('root');
ReactDOM.render(<App />, root);