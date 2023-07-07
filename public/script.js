// Youtube API
var scriptUrl = 'https:\/\/www.youtube.com\/s\/player\/1dda5629\/www-widgetapi.vflset\/www-widgetapi.js';window['yt_embedsEnableHouseBrandAndYtCoexistence'] =  true ;try{var ttPolicy=window.trustedTypes.createPolicy("youtube-widget-api",{createScriptURL:function(x){return x;}});scriptUrl=ttPolicy.createScriptURL(scriptUrl);}catch(e){}var YT;if(!window["YT"])YT={loading:0,loaded:0};var YTConfig;if(!window["YTConfig"])YTConfig={"host":"https://www.youtube.com"};
if(!YT.loading){YT.loading=1;(function(){var l=[];YT.ready=function(f){if(YT.loaded)f();else l.push(f);};window.onYTReady=function(){YT.loaded=1;var i=0;for(;i<l.length;i++)try{l[i]();}catch(e$m864811347$0){}};YT.setConfig=function(c){var k;for(k in c)if(c.hasOwnProperty(k))YTConfig[k]=c[k];};var a=document.createElement("script");a.type="text/javascript";a.id="www-widgetapi-script";a.src=scriptUrl;a.async=true;var c=document.currentScript;if(c){var n=c.nonce||c.getAttribute("nonce");if(n)a.setAttribute("nonce",
n);}var b=document.getElementsByTagName("script")[0];b.parentNode.insertBefore(a,b);})();}

var youtubePlayer;
let videoPlaying = false;
let timeout = null;

// Function called by the YouTube API when it's ready
function onYouTubePlayerAPIReady() {
  // Create a new instance of the YouTube player
  youtubePlayer = new YT.Player('youtube-iframe');
  setTimeout(() => {youtubePlayer.playVideo();}, 1000);
}

document.addEventListener('pauseVideo', () => {
    youtubePlayer.pauseVideo();
    videoPlaying = false;
}); 

document.addEventListener('playVideo', () => {
    youtubePlayer.playVideo();
    videoPlaying = true;
    timeout = setTimeout(() => {document.dispatchEvent(new Event('hide-container'));}, 4000);
});

document.addEventListener('mousemove', () => {
    document.dispatchEvent(new Event('show-container'));
    clearTimeout(timeout);
    timeout = setTimeout(() => {document.dispatchEvent(new Event('hide-container'));}, 10000);
});