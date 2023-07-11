import 'bootstrap/dist/js/bootstrap.bundle.min.js';

function About() {
    document.body.style.backgroundColor = '#101520';
    document.body.style.overflowY = 'scroll';
  return (
    <div className="container col-10 bg-black">
  <nav className="navbar rounded navbar-expand-lg my-4 col-12">
    <a className="navbar-brand d-flex align-items-center" href="https://www.redditspeak.com/">
      <img src="redditspeak.svg" width="40" height="40" alt="Logo" className="mr-2"/>
      <h1 className="h1 text-lg text-danger font-weight-bold" style={{textShadow: '3px 3px 2px #550000'}}>redditSpeak</h1>
    </a>
  </nav>

  <div className="row mt-5 d-flex justify-content-center">
    <div className="col-10 text-center py-3 ">
      <h1 className="py-4 text-lg-center font-weight-bold text-info" style={{font: 'Roboto, sans serif;'}}>A text-to-speech reader for your favorite subreddits.</h1>
      <p className="h3">Default background video from <a href="https://www.youtube.com/@bbswitzer">bbswitzer.</a></p>
      <p className="h3">Website created by <a href="https://github.com/gitpushjoe">gitpushjoe.</a></p>
      <p className="h3">Source code available <a href="https://github.com/gitpushjoe/redditspeak">here.</a></p>
      <br/><br/><br/><br/><br/><br/>
      <p className="h3 py-5 text-success"><a href="https://www.redditspeak.com/">← Back to site</a></p>
      <br/>
    </div>
  </div>
</div>

  );
}

export default About;
