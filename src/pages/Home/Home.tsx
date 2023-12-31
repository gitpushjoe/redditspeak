import './Home.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import Author from './AuthorComponent/Author';
import { useEffect, useRef, useState } from 'react';
import { BsFillArrowRightSquareFill, BsPauseFill, BsPlayFill } from 'react-icons/bs';
import { BiSolidHome, BiSolidInfoCircle } from 'react-icons/bi';
import { Dropdown, DropdownOption } from './utils/DropdownComponent/Dropdown';
import { fetchPosts } from './utils/Fetch';
import { castPost, Post, fetchPost, CurrentPost, castCurrentPost, castRepliesToCurrentPost, acronymOffset, expandAcronyms } from './utils/Reddit';
import speak from './utils/SpeechSynth';
import { splitIntoSentences, spliceSentence, abbrvNumber, replaceLinks } from './utils/String';
import PlaybackControls from './PlaybackComponent/PlaybackControls';
import { RiSettings4Fill } from 'react-icons/ri';
import { useLocation } from 'react-router-dom';

export default function Home(props: { setBackgroundVideo: Function }) {

    enum State {
        MAIN,
        LOADING,
        ACTIVE
    }

    const [mainText, setMainText] = useState<string>("r/");
    const [authorText, setAuthorText] = useState<string>("");
    const [state, setState] = useState<State>(State.MAIN);
    const [posts, setPosts] = useState<Post[]>([]);
    const [postIndex, setPostIndex] = useState<number>(0);
    const [currentPost, setCurrentPost] = useState<CurrentPost | null>(null);
    const [prevText, setPrevText] = useState<string>("");
    const [postText, setPostText] = useState<string>("");
    const [authorVisible, setAuthorVisible] = useState<boolean>(false);
    const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);
    const [playing, setPlaying] = useState<boolean>(true);
    const [indices, setIndices] = useState<number[]>([-1, 0, 0]); // [commentIndex, sentenceIndex, spliceIndex]
    const [authorColor, setAuthorColor] = useState<'gold' | 'aqua'>('gold');
    const [controlsContainerVisible, setControlsContainerVisible] = useState<boolean>(true);
    const [placeholderSubreddit, setPlaceholderSubreddit] = useState<string>('' as string);
    const [placeholderInterval, setPlaceholderInterval] = useState<number>(0); // used to prevent duplicate intervals
    const [currentPermalink, setCurrentPermalink] = useState<string>('' as string);

    const [searchSort, setSearchSort] = useState<string>(localStorage.getItem('config-searchSort') || 'hot-null');
    const [readerSetting, setReaderSetting] = useState<string>(localStorage.getItem('config-readerSetting') || 'Discussion');
    const [searchBy, setSearchBy] = useState<'subreddit' | 'post'>(localStorage.getItem('config-searchBy') as 'subreddit' | 'post' || 'subreddit');
    const [commentsPerPost, setCommentsPerPost] = useState<number>(parseInt(localStorage.getItem('config-commentsPerPost') || '0'));
    const [readReplies, setReadReplies] = useState<string>(localStorage.getItem('config-readReplies') || 'disabled');
    const [voice, setVoice] = useState<string>(localStorage.getItem('config-voice') || '0');
    const [readingSpeed, setReadingSpeed] = useState<string>(localStorage.getItem('config-readingSpeed') || '1.0');
    const [volume, setVolume] = useState<string>(localStorage.getItem('config-volume') || '100');
    const [backgroundVideo, setBackgroundVideo] = useState<string>(localStorage.getItem('config-backgroundVideo') || 'enabled');
    const [pausingAudioPausesVideo, setPausingAudioPausesVideo] = useState<boolean>(localStorage.getItem('config-pausingAudioPausesVideo') === 'true' ? true : false);
    const [androidBugFix, setAndroidBugFix] = useState<string>('disabled'); // used to fix a bug on android where the text gets "stuck" (caused by lack of support for onboundary event)

    // Modal Settings
    const [m_searchSort, m_setSearchSort] = useState<string>(searchSort);
    const [m_searchBy, m_setSearchBy] = useState<'subreddit' | 'post'>(searchBy);
    const [m_commentsPerPost, m_setCommentsPerPost] = useState<number>(commentsPerPost);
    const [m_readReplies, m_setReadReplies] = useState<string>(readReplies);
    const [m_voice, m_setVoice] = useState<string>(voice);
    const [m_readingSpeed, m_setReadingSpeed] = useState<string>(readingSpeed);
    const [m_volume, m_setVolume] = useState<string>(volume);
    const [m_backgroundVideo, m_setBackgroundVideo] = useState<string>('enabled');
    const [m_pausingAudioPausesVideo, m_setPausingAudioPausesVideo] = useState<boolean>(pausingAudioPausesVideo);
    const [m_androidBugFix, m_setAndroidBugFix] = useState<string>('disabled');

    useEffect(() => {
        if (placeholderInterval !== 0) clearInterval(placeholderInterval);
        const interval = setInterval(() => {
            const subreddits = ['writingprompts', 'trueoffmychest', 'explainlikeimfive', 'outoftheloop', 'todayilearned', 'showerthoughts', 'unpopularopinion', 'confession', 'askhistorians', 'NoStupidQuestions', 'AmItheAsshole', 'TwoXChromosomes', 'IAmA', 'changemyview', 'legaladvice', 'CasualConversation', 'AskReddit', 'AskWomen', 'offmychest', 'tooafraidtoask', 'relationship_advice', 'LifeProTips', 'AskMen', 'TIFU'];
            if (state === State.MAIN)
                setPlaceholderSubreddit(subreddits[Date.now() / (9000) % subreddits.length | 0]);
        }, 1000);
        setPlaceholderInterval(interval);
    }, []);

    function setModalSettingsToDefault() {
        m_setSearchSort(searchSort);
        m_setSearchBy(searchBy);
        m_setCommentsPerPost(commentsPerPost);
        m_setReadReplies(readReplies);
        m_setVoice(voice);
        m_setReadingSpeed(readingSpeed);
        m_setVolume(volume);
        m_setBackgroundVideo(backgroundVideo);
        m_setPausingAudioPausesVideo(pausingAudioPausesVideo);
        m_setAndroidBugFix(androidBugFix);
    }

    function openModal() {
        setShowModal(() => true);
        setModalSettingsToDefault();
    }

    useEffect(() => {
        localStorage.setItem('config-searchSort', searchSort);
        localStorage.setItem('config-readerSetting', readerSetting);
    }, [searchSort, readerSetting]);

    function saveModal() {
        setSearchSort(m_searchSort);
        setSearchBy(m_searchBy);
        setCommentsPerPost(m_commentsPerPost);
        setReadReplies(m_readReplies);
        setVoice(m_voice);
        setReadingSpeed(m_readingSpeed);
        setVolume(m_volume);
        setShowModal(false);
        setBackgroundVideo(m_backgroundVideo);
        setPausingAudioPausesVideo(m_pausingAudioPausesVideo);
        setAndroidBugFix(m_androidBugFix);

        if (m_commentsPerPost === 0)
            setReaderSetting('Post');
        else if (m_commentsPerPost === 1)
            setReaderSetting('Answer');
        else if (m_commentsPerPost === 3)
            setReaderSetting('Story');
        else if (m_commentsPerPost === 300 && m_readReplies === 'disabled')
            setReaderSetting('Discussion');
        else if (m_commentsPerPost === 300 && m_readReplies === 'enabled')
            setReaderSetting('Discourse');
        else
            setReaderSetting('Custom');

        localStorage.setItem('config-searchSort', m_searchSort);
        localStorage.setItem('config-searchBy', m_searchBy);
        localStorage.setItem('config-commentsPerPost', m_commentsPerPost.toString());
        localStorage.setItem('config-readReplies', m_readReplies);
        localStorage.setItem('config-voice', m_voice);
        localStorage.setItem('config-readingSpeed', m_readingSpeed);
        localStorage.setItem('config-volume', m_volume);
        localStorage.setItem('config-backgroundVideo', m_backgroundVideo);
        localStorage.setItem('config-pausingAudioPausesVideo', m_pausingAudioPausesVideo.toString());
        localStorage.setItem('config-androidBugFix', m_androidBugFix);

        if (m_backgroundVideo === 'disabled') {
            document.getElementById('youtube-iframe')!.style.display = 'none';
        } else {
            document.getElementById('youtube-iframe')!.style.display = 'block';
            const videoUrl = m_backgroundVideoUrl.current! as string;
            if (!videoUrl) return;
            let videoId = videoUrl.split('=') as string[] | string;
            if (videoId.length < 2 || videoUrl.includes('youtu.be')) {
                videoId = videoUrl.replace('watch?v=', '').split('/') as string[] | string;
                videoId = videoId[videoId.length - 1].slice(0, 11);
            } else {
                videoId = videoId[1].slice(0, 11);
            }
            if (/^[a-zA-Z0-9-_]{11}$/.test(videoId)) {
                document.getElementById('youtube-iframe')!.style.display = 'block';
                localStorage.setItem('config-backgroundVideoUrl', `https://www.youtube.com/embed/${videoId}?enablejsapi=1&mute=true&rel=0&modestbranding=0&autoplay=1&loop=1&controls=0`);
                props.setBackgroundVideo(`https://www.youtube.com/embed/${videoId}?enablejsapi=1&mute=true&rel=0&modestbranding=0&autoplay=1&loop=1&controls=0`);
            }
        }
    }

    const params = useLocation();

    useEffect(() => {
        const path = params.pathname.split('/');
        if (path.length < 3) return;
        if (path[1] !== 'r') return;
        if (path.length === 3) {
            inputRef.current!.value = path[2];
            subredditChosen(null, 'subreddit');
            return;
        }
        if (path.length >= 5 && path[3] === 'comments') {
            inputRef.current!.value = `https://www.reddit.com/r/${path[2]}/comments/${path[4]}`;
            subredditChosen(null, 'post');
        }
    }, [params]);

    document.addEventListener('show-container', () => {
        setControlsContainerVisible(() => true);
    });

    document.addEventListener('hide-container', () => {
        setControlsContainerVisible(() => false);
    });

    const [showModal, setShowModal] = useState<boolean>(false);
    const m_backgroundVideoUrl = useRef<string>('');

    useEffect(() => {
        switch (readerSetting) {
            case 'Post': {
                setCommentsPerPost(0);
            }
                break;
            case 'Answer': {
                setCommentsPerPost(1);
            }
                break;
            case 'Story': {
                setCommentsPerPost(3);
            }
                break;
            case 'Discussion': {
                setCommentsPerPost(300);
                setReadReplies('disabled');
            }
                break;
            case 'Discourse': {
                setCommentsPerPost(300);
                setReadReplies('enabled');
            }
                break;
            case 'Custom': {
                setShowModal(true);
            }
        }
    }, [readerSetting]);

    let commentIndex = -2; // -2 = uninitialized, -1 = post, 0+ = comment
    let sentenceIndex = 0;
    let spliceIndex = 0;
    let wordsSpoken = 0;

    const inputRef = useRef<HTMLInputElement>(null);

    const searchSortMap = new Map<string, string>([
        ['hot-null', '🔥 HOT '],
        ['top-day', '📈 TOP (24 hours) '],
        ['top-week', '📈 TOP (week) '],
        ['top-month', '📈 TOP (month) '],
        ['top-year', '📈 TOP (year) '],
        ['top-all', '📈 TOP (all time) ']
    ]);

    function subredditChosen(e: React.FormEvent<HTMLFormElement> | null = null, forceSearchBy: string = "") { // Fetches the posts from the chosen subreddit
        if (utterance)
            utterance.onend = () => { };
        e?.preventDefault();
        setState(() => State.LOADING);
        const searchMethod = forceSearchBy || searchBy;
        if (searchMethod === 'post') {
            const url = inputRef.current?.value!;
            if (!(url.startsWith('https://www.reddit.com/r/') || url.startsWith('https://old.reddit.com/r/'))) {
                alert('Invalid URL! Please enter a valid URL.');
                setState(() => State.MAIN);
                return;
            }
            fetch(url + '.json')
                .then(response => {
                    if (!response.ok) {
                        alert('Unable to find post! Please check the URL or try again later.');
                        setState(() => State.MAIN);
                        return;
                    }
                    return response.json();
                })
                .then(response => {
                    response = response[0].data.children[0].data;
                    const post = castPost(response);
                    setPosts(() => [post]);
                    return post;
                })
                .then(post => fetchNewPostIndex(0, [post]));
            return;
        }
        if (!inputRef.current?.value || !/^[a-zA-Z0-9-_]{3,21}$/.test(inputRef.current?.value!)) {
            alert('Invalid subreddit name! Please enter a valid subreddit name.');
            setState(() => State.MAIN);
            return;
        }
        fetchPosts(inputRef.current?.value!, searchSort.split('-')[0], searchSort.split('-')[1])
            .catch(_ => {
                alert('Unable to find subreddit! Please check the name or try again later.');
                setState(() => State.MAIN);
                return;
            })
            .then(response => {
                if (!response.ok) {
                    alert('Unable to find subreddit! Please check the name or try again later.');
                    setState(() => State.MAIN);
                    return;
                }
                return response.json();
            })
            .then(response => {
                response = response.data.children.map((post: any) => castPost(post.data)).filter((post: Post) => post.stickied === false);
                setPosts(() => response);
                return response;
            })
            .then(response => fetchNewPostIndex(0, response));
        return;
    }

    function fetchNewPostIndex(index: number, postsList: Post[] | null = null) { // Fetches the post at the given index, and initializes it
        postsList = postsList !== null ? postsList : posts;
        index = Math.min(Math.max(index, 0), postsList.length - 1);
        if (parseInt(localStorage.getItem('config-commentsPerPost') || '300') !== 0) // solves useEffect race conditions
            setState(() => State.LOADING);
        setPostIndex(() => index);
        if (parseInt(localStorage.getItem('config-commentsPerPost') || '300') === 0) {
            setTimeout(() => { setState(() => State.ACTIVE); }, 3);
            initialize({ postInfo: postsList[index], comments: [] });
            return;
        }
        fetchPost(postsList[index], commentsPerPost, readReplies === 'enabled' ? 3 : 0)
            .then(response => response.json())
            .then(response => {
                const currentPost = castCurrentPost(postsList![index], response);
                currentPost.comments = currentPost.comments.filter(c => c.body !== '[deleted]' && !c.stickied && c.body);
                initialize(currentPost);
            });
    }

    function initialize(post: CurrentPost | null) { // Cut comments of the current post into sentence splices
        if (!post) { post = currentPost; }
        const sentences = splitIntoSentences(post!.postInfo.title + '\n' + post!.postInfo.selftext);
        const splicedSentences = [] as string[][];
        for (const sentence of sentences) {
            splicedSentences.push(...spliceSentence(sentence));
        }
        post!.postInfo.sentences = splicedSentences;
        for (const i in post!.comments) {
            const comment = post!.comments[i];
            if (!comment.body) break;
            const sentences = splitIntoSentences(comment.body.replace('&#x200B;', ''));
            const splicedSentences = [] as string[][];
            for (const sentence of sentences) {
                splicedSentences.push(...spliceSentence(sentence));
            }
            let reply = castRepliesToCurrentPost(comment.replies);
            while (reply && readReplies === 'enabled') {
                splicedSentences.push(['<COMMENT METADATA>', reply.comments[0].author, reply.comments[0].score.toString(), reply.comments[0].permalink]);
                splitIntoSentences(reply.comments[0].body.replace('&#x200B;', '')).forEach((sentence, index) => {
                    if (index === 0) {
                        splicedSentences[splicedSentences.length - 1].push(...spliceSentence(sentence)[0]);
                        splicedSentences.push(...spliceSentence(sentence).slice(1));
                    } else {
                        splicedSentences.push(...spliceSentence(sentence));
                    }
                });
                reply = castRepliesToCurrentPost(reply.comments[0].replies);
            }
            post!.comments[i].sentences = splicedSentences;
        }
        console.log(post);
        if (post) setCurrentPost(() => post);
        setState(() => State.ACTIVE);
    }

    function presentText(withAudio = true) { // Present the current sentence, and if withAudio, speak it
        if (commentIndex !== -2) {
            setIndices(() => [commentIndex, sentenceIndex, spliceIndex]);
        }
        if (!currentPost) return;
        let sentence = [] as string[];
        if (commentIndex === -1) {
            sentence = currentPost!.postInfo.sentences![sentenceIndex];
        } else {
            sentence = currentPost!.comments[commentIndex].sentences![sentenceIndex];
        }
        if (!sentence) {
            changeReadingPos('sentence', 1, null, withAudio);
            return;
        }
        if (sentence[0] === '<COMMENT METADATA>') {
            const text = `u/${sentence[1]} ▲${abbrvNumber(parseInt(sentence[2]))}`;
            setAuthorText(() => text);
            setAuthorColor(() => 'aqua');
            setAuthorVisible(() => true);
            setCurrentPermalink(() => sentence[3]);
            sentence = sentence.slice(4);
        }
        if (withAudio) {
            const utterance = speak(
                replaceLinks(expandAcronyms(sentence.join(''))),
                changeReadingPos,
                speechSynthesis.getVoices()[parseInt(voice)],
                parseFloat(readingSpeed),
                parseInt(volume) / 100);
            wordsSpoken = -1 - acronymOffset(sentence.join(''));
            utterance.onboundary = (e) => { // add event listener to utterance to update spliceIndex when a word is spoken
                const sentences = commentIndex === -1 ? currentPost!.postInfo.sentences! : currentPost!.comments[commentIndex].sentences!;
                const sentence = sentences[sentenceIndex][0] === '<COMMENT METADATA>' ? sentences[sentenceIndex].slice(4) : sentences[sentenceIndex];
                let wordCount = 0;
                if (e.name === 'word') wordsSpoken++;
                for (const splice in sentence) {
                    for (const _ in sentence[splice].split(' ').filter(Boolean)) {
                        if (wordCount === wordsSpoken) {
                            updateText(Number(splice));
                            return;
                        }
                        wordCount++;
                    }
                }
            };
            setUtterance(() => utterance);
        }
        updateText(null);
    }

    const getCurrentPostOrComment = () => { return commentIndex === -1 ? currentPost!.postInfo : currentPost!.comments[commentIndex]; };
    const getCurrentSentences = () => { return commentIndex === -1 ? currentPost!.postInfo.sentences! : currentPost!.comments[commentIndex].sentences!; };

    function updateText(splice: number | null = null) {
        if (splice !== null) { spliceIndex = splice; }
        let sentence: string[];
        if (commentIndex === -1) {
            sentence = currentPost!.postInfo.sentences![sentenceIndex];
        } else {
            sentence = currentPost!.comments[commentIndex].sentences![sentenceIndex];
        }
        if (sentence[0] === '<COMMENT METADATA>') {
            sentence = sentence.slice(4);
        } else {
            if (sentenceIndex === 0)
                setAuthorText(() => (commentIndex === -1 ? '[OP] ' : '') + 'u/' + getCurrentPostOrComment().author + '   ▲' + abbrvNumber(getCurrentPostOrComment().score));
            setAuthorVisible(() => sentenceIndex === 0);
            setAuthorColor(() => 'gold');
            setCurrentPermalink(() => getCurrentPostOrComment().permalink);
        }
        if (sentence.length === 1) {
            setPrevText(() => '');
            setMainText(() => sentence[0]);
            setPostText(() => '');
        } else {
            if (androidBugFix === 'enabled') {
                setPrevText(() => '');
                setMainText(() => sentence.join(''));
                setPostText(() => '');
                return;
            }
            if (sentence.join('').length > 100) {
                setPrevText(() => '');
                setMainText(() => sentence[spliceIndex]);
                setPostText(() => '');
            } else {
                setPrevText(() => sentence.slice(0, spliceIndex).join(''));
                setMainText(() => sentence[spliceIndex]);
                setPostText(() => sentence.slice(spliceIndex + 1).join(''));
            }
        }
    }

    // Updates the text indices to the next/previous sentence or comment, with bounds checking
    // Fetches the next post if the current post is finished
    // (Optionally) speaks the next/previous sentence or comment
    function changeReadingPos(incrementType: 'sentence' | 'comment', increment: -1 | 0 | 1 = 1, indices: number[] | null = null, withAudio = true) {
        if (indices) {
            commentIndex = indices[0];
            sentenceIndex = indices[1];
            spliceIndex = indices[2];
        }
        const sentences = getCurrentSentences();
        if (incrementType === 'sentence') sentenceIndex += increment;
        if (incrementType === 'comment') {
            commentIndex += increment;
            sentenceIndex = 0;
        }
        spliceIndex = 0;

        if (sentenceIndex < 0) {
            const post = commentIndex - 1 < 0 ? currentPost!.postInfo : currentPost!.comments[commentIndex - 1];
            sentenceIndex = post.sentences!.length - 1;
            commentIndex--;
        } else {
            if (sentenceIndex >= sentences.length) {
                sentenceIndex = 0;
                commentIndex++;
            }
        }
        if (commentIndex < -1) {
            commentIndex = -1;
            sentenceIndex = 0;
            spliceIndex = 0;
        }
        if (commentIndex >= currentPost!.comments.length) {
            fetchNewPostIndex(postIndex + 1);
            setState(State.LOADING);
            return;
        }
        presentText(withAudio);
        return;
    }

    function doPlay() {
        document.dispatchEvent(new Event('playVideo'));
        setPlaying(() => true);
        if (state !== State.ACTIVE)
            return;
        commentIndex = indices[0];
        sentenceIndex = indices[1];
        spliceIndex = indices[2];
        presentText(true);
    }

    function doPause() {
        setPlaying(() => false);
        if (utterance) {
            utterance.onend = null;
        }
        if (pausingAudioPausesVideo)
            document.dispatchEvent(new Event('pauseVideo'));
        speechSynthesis.cancel();
    }

    function doCancel() {
        setTimeout(() => {
            if (currentPost && currentPost.postInfo.subreddit && searchBy && searchBy === 'subreddit' && inputRef.current)
                inputRef.current!.value = currentPost.postInfo.subreddit;
            else if (currentPost && currentPost.postInfo.permalink && searchBy && searchBy === 'post' && inputRef.current)
                inputRef.current!.value = currentPost.postInfo.permalink;
        }, 5);
        setState(() => State.MAIN);
        doPause();
    }

    useEffect(() => {
        commentIndex = -1;
        sentenceIndex = 0;
        spliceIndex = 0;
        presentText(playing);
    }, [currentPost]);

    useEffect(doCancel, []);

    return <>
        <div className={`primary-container`} style={{ backgroundColor: (backgroundVideo === 'enabled' ? '#00000000' : '#112233'), cursor: (controlsContainerVisible ? 'default' : 'none') }}>
            <div>
                {state === State.MAIN &&
                    <div style={{ textAlign: 'center' }}>
                        <p className="text-white primary-text">redditSpeak</p>
                        <Author author="A text-to-speech reader for Reddit." visible={true} color={"white"} />
                        <br />
                    </div>}
                <div className={`primary-text-container ${state === State.MAIN ? 'waiting-state' : 'main-state'}`}>
                    {state === State.MAIN ?
                        <>
                            <form onSubmit={subredditChosen}>
                                <span>
                                    {searchBy === 'subreddit' && <h1 className="text-white" style={{ display: 'inline-block', paddingRight: '0.2em' }}>r/</h1>}
                                    <input type="text" className="form-control input-sm input-field" placeholder={searchBy === 'subreddit' ? placeholderSubreddit : 'https://www.reddit.com/r/...'} style={{ width: '55%', display: 'inline-block', margin: '0', boxShadow: '0 0 20px purple' }} ref={inputRef} />
                                    <BsFillArrowRightSquareFill className="arrow" onClick={subredditChosen} />
                                    <br />
                                </span>
                            </form>
                            <span style={{ zIndex: 0, position: 'static', display: 'inline-block' }}>
                                <p className="subtitle" style={{ display: 'inline-block' }}>Sort posts by: </p>
                                <Dropdown
                                    options={[
                                        DropdownOption('hot-null', '🔥 HOT'),
                                        DropdownOption('top-day', '📈 TOP (24 hours)'),
                                        DropdownOption('top-week', '📈 TOP (week)'),
                                        DropdownOption('top-month', '📈 TOP (month)'),
                                        DropdownOption('top-year', '📈 TOP (year)'),
                                        DropdownOption('top-all', '📈 TOP (all time)')]
                                    } setSelected={setSearchSort} buttonText={searchSortMap.get(searchSort)} />
                            </span>
                            <br />
                            <span style={{ zIndex: 2000, position: 'static' }}>
                                <p className="subtitle" style={{ display: 'inline-block' }}>Reader Style: </p>
                                <Dropdown
                                    options={[
                                        DropdownOption('Post', 'Post Mode'),
                                        DropdownOption('Answer', 'Answer Mode'),
                                        DropdownOption('Story', 'Story Mode'),
                                        DropdownOption('Discussion', 'Discussion Mode'),
                                        DropdownOption('Discourse', 'Discourse Mode'),
                                        DropdownOption('Custom', 'Custom')
                                    ]} setSelected={setReaderSetting} buttonText={readerSetting === 'custom' ? 'Custom' : readerSetting + ' Mode'} />
                            </span>
                            {/* <BsFillQuestionCircleFill color="lightslategrey" size="1.5em"/> */}
                            <p className="reader-explained">
                                {
                                    readerSetting === 'Post' ? 'Reads only posts and not comments.' :
                                        readerSetting === 'Answer' ? 'Reads the most upvoted answer to each post.' :
                                            readerSetting === 'Story' ? 'Reads the top three replies to each post.' :
                                                readerSetting === 'Discussion' ? 'Reads up to 300 comments for each post.' :
                                                    readerSetting === 'Discourse' ? 'Reads up to 300 comments and replies for each post.' :
                                                        readerSetting === 'Custom' ? 'Custom Reader Setting' :
                                                            ''
                                }
                            </p>
                        </>
                        : state === State.LOADING ?
                            <p className="primary-text">Loading...</p>
                            : state === State.ACTIVE ?
                                <div style={{ cursor: 'pointer' }} onClick={() => {
                                    if (!playing && currentPermalink !== '')
                                        window.open('https://www.reddit.com' + currentPermalink, '_blank');
                                }}>
                                    <Author author={authorText} visible={authorVisible} color={authorColor} />
                                    <p>
                                        <mark className="secondary-text">{prevText}</mark>
                                        <mark className="primary-text">{mainText}</mark>
                                        <mark className="secondary-text">{postText}</mark>
                                    </p>
                                    <Author author="---" visible={false} />
                                </div>
                                : null
                    }
                </div>
            </div>
            {state !== State.LOADING &&
                <div className={`controls-container ${controlsContainerVisible ? 'show-container' : 'hide-container'}`}>
                    {state === State.ACTIVE &&
                        <>
                            <PlaybackControls changeReadingPos={changeReadingPos} fetchNewPostIndex={fetchNewPostIndex} playing={playing} indices={indices} postIndex={postIndex} doPlay={doPlay} doPause={doPause} />
                        </>}

                    <RiSettings4Fill className="icon" onClick={openModal} />
                    {state === State.ACTIVE ? <BiSolidHome className="icon" onClick={doCancel} /> :
                        state === State.MAIN ?
                            (playing ?
                                <BsPauseFill className="icon" onClick={doPause} /> :
                                <BsPlayFill className="icon" onClick={doPlay} />
                            ) : null}
                    <BiSolidInfoCircle className="icon" onClick={() => { window.location.replace('https://www.redditspeak.com/about') }} />
                </div>}

            <div className="modal fade" id="settings-modal" tabIndex={-1} aria-labelledby="settings-modal-label" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="settings-modal-label">Settings</h5>
                            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <p className="subtitle">Search Setting: </p>
                            <Dropdown options={[
                                DropdownOption('hot-null', '🔥 HOT'),
                                DropdownOption('top-day', '📈 TOP (24 hours)'),
                                DropdownOption('top-week', '📈 TOP (week)'),
                                DropdownOption('top-month', '📈 TOP (month)'),
                                DropdownOption('top-year', '📈 TOP (year)'),
                                DropdownOption('top-all', '📈 TOP (all time)')
                            ]} setSelected={setSearchSort} buttonText={searchSortMap.get(searchSort)} />
                            <br />
                        </div>
                        <div className="modal-body">
                            <p className="subtitle">Reader Setting: </p>
                            <Dropdown options={[
                                DropdownOption('Post Mode', 'Post'),
                                DropdownOption('Answer Mode', 'Answer'),
                                DropdownOption('Story Mode', 'Story'),
                                DropdownOption('Discussion Mode', 'Discussion'),
                                DropdownOption('Discourse Mode', 'Discourse'),
                                DropdownOption('Custom', 'Custom')
                            ]} setSelected={setReaderSetting} buttonText={readerSetting === 'custom' ? 'Custom' : readerSetting + ' Mode'} />
                            <br />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {showModal &&
            <div className="" id="settingsModal" role="dialog" aria-labelledby="settingsModalLabel" aria-hidden="true">
                <div className="modal-dialog" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2 className="modal-title" id="exampleModalLabel">Settings</h2>
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close"> <span aria-hidden="true" onClick={() => { setShowModal(() => false); }}>&times;</span></button>
                        </div>
                        <div className="modal-body">
                            <h4><strong>Search</strong></h4>
                            <span>
                                <p className='modal-option-name'>Search by: </p>
                                <Dropdown options={[
                                    DropdownOption('subreddit', 'Subreddit'),
                                    DropdownOption('post', 'Specific Post'),
                                ]} setSelected={m_setSearchBy} buttonText={m_searchBy} dropdownSize='sm' useOptionsForButtonText={true} />
                            </span>
                            <br />
                            <span>
                                <p className='modal-option-name'>Sort pots by: </p>
                                <Dropdown options={[
                                    DropdownOption('hot-null', '🔥 HOT'),
                                    DropdownOption('top-day', '📈 TOP (24 hours)'),
                                    DropdownOption('top-week', '📈 TOP (week)'),
                                    DropdownOption('top-month', '📈 TOP (month)'),
                                    DropdownOption('top-year', '📈 TOP (year)'),
                                    DropdownOption('top-all', '📈 TOP (all time)')
                                ]} setSelected={m_setSearchSort} buttonText={m_searchSort} dropdownSize='sm' useOptionsForButtonText={true} />
                            </span>
                            <br />
                            <span>
                                <p className='modal-option-name'># of Comments: </p>
                                <input type="range" className="inline-block" placeholder="0" min="0" max="300" value={m_commentsPerPost} style={{ width: '30%', padding: '0' }} onChange={e => { m_setCommentsPerPost(() => parseInt(e.target.value)); }} />
                                <p className='inline-block modal-option-name' style={{ paddingLeft: '0.2em' }}>{m_commentsPerPost}</p>
                            </span>
                            <br />
                            <span>
                                <p className='modal-option-name'>Read Comment Replies: </p>
                                <Dropdown options={[
                                    DropdownOption('enabled', 'Enabled'),
                                    DropdownOption('disabled', 'Disabled'),
                                ]} setSelected={m_setReadReplies} buttonText={m_readReplies} dropdownSize='sm' useOptionsForButtonText={true} />
                            </span>
                            <br /><br />
                            <h4><strong>Speech</strong></h4>
                            <span>
                                <p className='modal-option-name'>Voice: </p>
                                <Dropdown options={
                                    speechSynthesis.getVoices()
                                        .map((voice, index) => [index, voice] as [number, SpeechSynthesisVoice])
                                        .filter(item => item[1].lang === 'en-US' || item[1].lang === 'en-GB')
                                        .map(item => {
                                            const [index, voice] = item as [number, SpeechSynthesisVoice];
                                            return DropdownOption(index.toString(), voice.name.split(' - ')[0].replace('Microsoft ', '').replace('Google ', '').replace('US Engl', '(unstable) US Engl').replace('UK Engl', '(unstable) UK Engl'))
                                        })
                                } setSelected={m_setVoice} buttonText={m_voice} dropdownSize='sm' useOptionsForButtonText={true} />
                            </span>
                            <br />
                            <span>
                                <p className='modal-option-name'>Reading Speed: </p>
                                <Dropdown options={[
                                    DropdownOption('0.5', 'Very Slow'),
                                    DropdownOption('0.875', 'Slow'),
                                    DropdownOption('1.0', 'Normal'),
                                    DropdownOption('1.5', 'Fast'),
                                    DropdownOption('2.5', 'Very Fast')
                                ]} setSelected={m_setReadingSpeed} buttonText={m_readingSpeed} dropdownSize='sm' useOptionsForButtonText={true} />
                            </span>
                            <br />
                            <span>
                                <p className='modal-option-name'>Volume: </p>
                                <input type="range" className="inline-block" placeholder="100" min="0" max="100" value={m_volume} style={{ width: '30%', padding: '0' }} onChange={e => { m_setVolume(() => e.target.value); }} />
                                <p className='inline-block modal-option-name' style={{ paddingLeft: '0.2em' }}>{m_volume}</p>
                            </span>
                            <br />
                            <span>
                                <p className='modal-option-name'>Fix "Stuck Text" on Android: </p>
                                <Dropdown options={[
                                    DropdownOption('enabled', 'Enabled (Less Features)'),
                                    DropdownOption('disabled', 'Disabled'),
                                ]} setSelected={m_setAndroidBugFix} buttonText={m_androidBugFix} dropdownSize='sm' useOptionsForButtonText={true} />
                            </span>
                            <br /><br />
                            <h4><strong>Background</strong></h4>
                            <span>
                                <p className='modal-option-name'>Background Video: </p>
                                <Dropdown options={[
                                    DropdownOption('enabled', 'Enabled'),
                                    DropdownOption('disabled', 'Disabled'),
                                ]} setSelected={m_setBackgroundVideo} buttonText={m_backgroundVideo} dropdownSize='sm' useOptionsForButtonText={true} />
                            </span>
                            <br />
                            <span> {
                                m_backgroundVideo === 'enabled' && <>
                                    <p className='modal-option-name'>Video URL: </p>
                                    <input type="text" className="form-control" placeholder="(Leave empty for no change)" onChange={e => m_backgroundVideoUrl.current = e.currentTarget.value!} style={{ width: '60%', height: '1.8em', padding: '0', display: 'inline-block' }} />
                                    <br />
                                    <p className='modal-option-name'>Pause Button Pauses Video: </p>
                                    <input type="checkbox" className="inline-block" checked={m_pausingAudioPausesVideo} onChange={e => m_setPausingAudioPausesVideo(e.target.checked)} />
                                </>
                            }
                            </span>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={() => { setShowModal(() => false); }}>Close</button>
                            <button type="button" className="btn btn-primary" onClick={saveModal}>Save changes</button>
                        </div>
                    </div>
                </div>
            </div>}
    </>;
}