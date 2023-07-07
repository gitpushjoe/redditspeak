import './Home.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import 'bootstrap/dist/css/bootstrap.min.css'
import Author from './AuthorComponent/Author';
import { useEffect, useRef, useState } from 'react';
import { BsFillArrowRightSquareFill, BsPauseFill, BsPlayFill } from 'react-icons/bs';
import { BiSolidHome, BiSolidInfoCircle } from 'react-icons/bi';
import { Dropdown, DropdownOption } from './utils/DropdownComponent/Dropdown';
import { GrReddit } from 'react-icons/gr';
import { fetchPosts } from './utils/Fetch';
import { castPost, Post, fetchPost, CurrentPost, castCurrentPost, castRepliesToCurrentPost } from './utils/Reddit';
import speak from './utils/SpeechSynth';
import { splitIntoSentences, spliceSentence, abbrvNumber } from './utils/String';
import PlaybackControls from './PlaybackComponent/PlaybackControls';
import { RiSettings4Fill } from 'react-icons/ri';

export default function Home() {

    enum State {
        MAIN,
        LOADING,
        ACTIVE
    };

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
    const [authorColor, setAuthorColor] = useState<'gold'|'aqua'>('gold');

    const [searchSort, setSearchSort] = useState<string>('hot-null');
    const [readerSetting, setReaderSetting] = useState<string>('Discussion');
    const [searchBy, setSearchBy] = useState<'subreddit'|'post'>('subreddit');
    const [commentsPerPost, setCommentsPerPost] = useState<number>(3);
    const [readReplies, setReadReplies] = useState<string>('enabled');
    const [voice, setVoice] = useState<string>('1');
    const [readingSpeed, setReadingSpeed] = useState<string>('1.25');
    const [volume, setVolume] = useState<string>('100');

    const [m_searchSort, m_setSearchSort] = useState<string>(searchSort);
    const [m_searchBy, m_setSearchBy] = useState<'subreddit'|'post'>(searchBy);
    const [m_commentsPerPost, m_setCommentsPerPost] = useState<number>(commentsPerPost);
    const [m_readReplies, m_setReadReplies] = useState<string>(readReplies);
    const [m_voice, m_setVoice] = useState<string>(voice);
    const [m_readingSpeed, m_setReadingSpeed] = useState<string>(readingSpeed);
    const [m_volume, m_setVolume] = useState<string>(volume);
    const [m_backgroundVideo, m_setBackgroundVideo] = useState<string>('enabled');

    function setModalSettingsToDefault() {
        m_setSearchSort(searchSort);
        m_setSearchBy(searchBy);
        m_setCommentsPerPost(commentsPerPost);
        m_setReadReplies(readReplies);
        m_setVoice(voice);
        m_setReadingSpeed(readingSpeed);
        m_setVolume(volume);
        m_setBackgroundVideo(m_backgroundVideo);
    }

    function openModal() {
        setShowModal(() => true);
        setModalSettingsToDefault();
    }

    function saveModal() {
        setSearchSort(m_searchSort);
        setSearchBy(m_searchBy);
        setCommentsPerPost(m_commentsPerPost);
        setReadReplies(m_readReplies);
        setVoice(m_voice);
        setReadingSpeed(m_readingSpeed);
        setVolume(m_volume);
        setShowModal(() => false);
    }

    const [showModal, setShowModal] = useState<boolean>(false);
    const [commentsPerPostSlider, setCommentsPerPostSlider] = useState<number>(100);
    const [volumeSlider, setVolumeSlider] = useState<number>(100);

    let commentIndex = -2; // -2 = uninitialized, -1 = post, 0+ = comment
    let sentenceIndex = 0;
    let spliceIndex = 0;
    let wordsSpoken = 0;

    const inputRef = useRef<any>(null);
    const searchRef = useRef<any>(null);
    const readerRef = useRef<any>(null);

    const searchSortMap = new Map<string, string>([
        ['hot-null', '🔥 HOT '],
        ['top-day', '📈 TOP (24 hours) '],
        ['top-week', '📈 TOP (week) '],
        ['top-month', '📈 TOP (month) '],
        ['top-year', '📈 TOP (year) '],
        ['top-all', '📈 TOP (all time) ']
    ]);

    function subredditChosen(e: any) {
        if (utterance)
            utterance.onend = () => { };
        e.preventDefault();
        setState(() => State.LOADING);
        // const searchSort = searchRef.current?.value!.split('-');
        if (searchBy === 'post') {
            const url = inputRef.current?.value!;
            if (!(url.startsWith('https://www.reddit.com/r/') || url.startsWith('https://old.reddit.com/r/'))) {
                alert('Invalid URL! Please enter a valid URL.');
                setState(() => State.MAIN);
                return;
            }
            fetch(url + '.json')
                .then(response => response.json())
                .then(response => {
                    response = response[0].data.children[0].data;
                    console.log(response);
                    const post = castPost(response);
                    setPosts(() => [post]);
                    return post;
                })
                .then(post => fetchNewPostIndex(0, [post]))
            return;
        }
        fetchPosts(inputRef.current?.value!, searchSort.split('-')[0], searchSort.split('-')[1])
            .then(response => response.json())
            .then(response => {
                response = response.data.children.map((post: any) => castPost(post.data)).filter((post: Post) => post.stickied === false);
                console.log(response);
                setPosts(() => response);
                return response;
            })
            .then(response => fetchNewPostIndex(0, response))
        return null;
    }

    function fetchNewPostIndex(index: number, postsList: Post[] | null = null) { // Fetches the post at the given index, and initializes it
        postsList = postsList !== null ? postsList : posts;
        index = Math.min(Math.max(index, 0), postsList.length - 1);
        if (commentsPerPost !== 0) 
            setState(() => State.LOADING);
        setPostIndex(() => index);
        if (commentsPerPost === 0) {
            setTimeout(() => {setState(() => State.ACTIVE)}, 3);
            initialize({postInfo: postsList[index], comments: []});
            return;
        }
        fetchPost(postsList[index], commentsPerPost, readReplies ? 3 : 0)
            .then(response => response.json())
            .then(response => {
                let currentPost = castCurrentPost(postsList![index], response);
                currentPost.comments = currentPost.comments.filter(c => c.body !== '[deleted]' && !c.stickied && c.body);
                initialize(currentPost);
            })
    }

    function initialize(post: CurrentPost | null) { // Cut comments of the current post into sentence splices
        if (!post) { post = currentPost; }
        const sentences = splitIntoSentences(post!.postInfo.title + '\n' + post!.postInfo.selftext);
        const splicedSentences = [] as string[][];
        for (let sentence of sentences) {
            splicedSentences.push(...spliceSentence(sentence));
        }
        post!.postInfo.sentences = splicedSentences;
        for (const i in post!.comments) {
            const comment = post!.comments[i];
            if (!comment.body) break;
            const sentences = splitIntoSentences(comment.body);
            const splicedSentences = [] as string[][];
            for (let sentence of sentences) {
                splicedSentences.push(...spliceSentence(sentence));
            }
            // alert(splicedSentences.map(s => s.join('\n')).join('\n\n'));
            let reply = castRepliesToCurrentPost(comment.replies);
            while (reply) {
                splicedSentences.push(['<COMMENT METADATA>', reply.comments[0].author, reply.comments[0].score.toString()]);
                splitIntoSentences(reply.comments[0].body).forEach((sentence, index) => {
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
        if (post) setCurrentPost(() => post);
        setState(() => State.ACTIVE);
    }

    function presentText(withAudio = true, incrementForMetadata = 0) { // Present the current sentence, and if withAudio, speak it
        let metadataFlag = false;
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
            console.log(`Metadata: ${sentence}`);
            const text = `u/${sentence[1]} ▲${abbrvNumber(parseInt(sentence[2]))}`;
            setAuthorText(() => text);
            setAuthorColor(() => 'aqua');
            setAuthorVisible(() => true);
            metadataFlag = true;
            sentence = sentence.slice(3);
        }
        if (spliceIndex === 0 && withAudio) {
            const utterance = speak(sentence.join(''), [commentIndex, sentenceIndex, spliceIndex], changeReadingPos, speechSynthesis.getVoices()[parseInt(voice)], parseInt(readingSpeed), parseInt(volume)/100);
            wordsSpoken = -1;
            utterance.onboundary = (e) => { // add event listener to utterance to update spliceIndex when a word is spoken
                const sentences = commentIndex === -1 ? currentPost!.postInfo.sentences! : currentPost!.comments[commentIndex].sentences!;
                const sentence = sentences[sentenceIndex][0] === '<COMMENT METADATA>' ? sentences[sentenceIndex].slice(3) : sentences[sentenceIndex];
                let wordCount = 0;
                if (e.name === 'word') wordsSpoken++;
                for (const splice in sentence) {
                    for (const _ in sentence[splice].split(' ').filter(Boolean)) {
                        if (wordCount === wordsSpoken) {
                            // console.log(sentences[sentenceIndex].flat().join(' ').split(' ').filter(Boolean).slice(0, wordsSpoken).join(' '));
                            updateText(Number(splice));
                            return;
                        }
                        wordCount++;
                    }
                }
            }
            setUtterance(() => utterance);
        }
        updateText(null, !metadataFlag);
    }

    const getCurrentPostOrComment = () => { return commentIndex === -1 ? currentPost!.postInfo : currentPost!.comments[commentIndex]; }
    const getCurrentSentences = () => { return commentIndex === -1 ? currentPost!.postInfo.sentences! : currentPost!.comments[commentIndex].sentences!; }

    function updateText(splice: number | null = null, updateAuthor = true) {
        if (splice !== null) { spliceIndex = splice; }
        let sentence: string[];
        if (commentIndex === -1) {
            sentence = currentPost!.postInfo.sentences![sentenceIndex];
        } else {
            sentence = currentPost!.comments[commentIndex].sentences![sentenceIndex];
        }
        if (sentence[0] === '<COMMENT METADATA>') {
            sentence = sentence.slice(3);
        } else {
            console.log(`NO METADATA: ${sentence}`);
            if (sentenceIndex === 0)
                setAuthorText(() => (commentIndex === -1 ? '[OP] ' : '') + 'u/' + getCurrentPostOrComment().author + '   ▲' + abbrvNumber(getCurrentPostOrComment().score));
            setAuthorVisible(() => sentenceIndex === 0);
            setAuthorColor(() => 'gold');
        }
        if (sentence.length === 1) {
            setPrevText(() => '');
            setMainText(() => sentence[0]);
            setPostText(() => '');
        } else {
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
        if (incrementType === 'comment') commentIndex += increment;
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
        console.log({increment});
        presentText(withAudio, increment === 0 ? 1 : increment);
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
            utterance.onend = () => { };
        }
        document.dispatchEvent(new Event('pauseVideo'));
        speechSynthesis.cancel();
    }

    function doCancel() {
        setState(() => State.MAIN);
        doPause();
    }

    useEffect(() => {
        commentIndex = -1;
        sentenceIndex = 0;
        spliceIndex = 0;
        presentText(playing);
    }, [currentPost])

    useEffect(doCancel, []);

    return <>
        <div className="primary-container">
            <div className={`primary-text-container ${state === State.MAIN ? 'waiting-state' : 'main-state'}`}>
                {state === State.MAIN ?
                    <>
                        <form onSubmit={subredditChosen}>
                            <span>
                                { searchBy === 'subreddit' && <p className="primary-text" style={{ display: 'inline-block', paddingRight: '0.2em'}}>r/</p> }
                                <input type="text" className="form-control input-sm input-field" placeholder={searchBy === 'subreddit' ? 'askReddit' : 'https://www.reddit.com/r/...'} style={{ width: '55%', display: 'inline-block', margin: '0', boxShadow: '0 0 20px purple' }} ref={inputRef} />
                                <BsFillArrowRightSquareFill className="arrow" onClick={subredditChosen} />
                                <br />
                            </span>
                        </form>
                        <span style={{zIndex: 0, position: 'static'}}>
                            <p className="subtitle" style={{ display: 'inline-block' }}>Sort posts by: </p>
                            <Dropdown 
                                options={[
                                    DropdownOption('hot-null', '🔥 HOT'), 
                                    DropdownOption('top-day', '📈 TOP (24 hours)'), 
                                    DropdownOption('top-week', '📈 TOP (week)'), 
                                    DropdownOption('top-month', '📈 TOP (month)'), 
                                    DropdownOption('top-year', '📈 TOP (year)'), 
                                    DropdownOption('top-all', '📈 TOP (all time)')]
                                } setSelected={setSearchSort} buttonText={searchSortMap.get(searchSort)!} />
                        </span>
                        <br />
                        <span style={{zIndex: 2000, position: 'static'}}>
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
                            <>
                                <Author author={authorText} visible={authorVisible} color={authorColor} />
                                <p>
                                    <mark className="secondary-text">{prevText}</mark>
                                    <mark className="primary-text">{mainText}</mark>
                                    <mark className="secondary-text">{postText}</mark>
                                </p>
                                <Author author="---" visible={false} />
                            </>
                            : null
                }
            </div>
        </div>
        {state !== State.LOADING &&
            <div className="controls-container">
                {state === State.ACTIVE &&
                    <>
                        <PlaybackControls changeReadingPos={changeReadingPos} fetchNewPostIndex={fetchNewPostIndex} playing={playing} indices={indices} postIndex={postIndex} doPlay={doPlay} doPause={doPause} />
                    </>}

                <RiSettings4Fill className="icon" onClick={openModal} />
                {state === State.ACTIVE ? <BiSolidHome className="icon" onClick={doCancel} /> :
                    state === State.MAIN ? 
                    ( playing ? 
                        <BsPauseFill className="icon" onClick={doPause}/> : 
                        <BsPlayFill className="icon" onClick={doPlay}/>
                    ) : null}
                <BiSolidInfoCircle className="icon" />
            </div>}

        <div className="modal fade" id="settings-modal" tabIndex={-1} aria-labelledby="settings-modal-label" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title" id="settings-modal-label">Settings</h5>
                        <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close" onClick={() => { setReaderSetting(() => readerRef.current.value); setSearchSort(() => searchRef.current.value); }}></button>
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
                        ]} setSelected={setSearchSort} buttonText={searchSortMap.get(searchSort)!} />
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

        {showModal &&
        <div className="" id="settingsModal" role="dialog" aria-labelledby="settingsModalLabel" aria-hidden="true">
            <div className="modal-dialog" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h2 className="modal-title" id="exampleModalLabel">Settings</h2>
                        <button type="button" className="close" data-dismiss="modal" aria-label="Close"> <span aria-hidden="true" onClick={() => {setShowModal(() => false)}}>&times;</span></button>
                    </div>
                    <div className="modal-body">
                        <h4><strong>Search</strong></h4>
                        <span>
                            <p className='modal-option-name'>Search by: </p>
                            <Dropdown options={[
                                DropdownOption('subreddit', 'Subreddit'),
                                DropdownOption('post', 'Specific Post'),
                            ]} setSelected={m_setSearchBy} buttonText={m_searchBy} dropdownSize='sm' useOptionsForButtonText={true}/>
                        </span>
                        <br/>
                        <span>
                            <p className='modal-option-name'>Sort pots by: </p>
                            <Dropdown options={[
                                DropdownOption('hot-null', '🔥 HOT'),
                                DropdownOption('top-day', '📈 TOP (24 hours)'),
                                DropdownOption('top-week', '📈 TOP (week)'),
                                DropdownOption('top-month', '📈 TOP (month)'),
                                DropdownOption('top-year', '📈 TOP (year)'),
                                DropdownOption('top-all', '📈 TOP (all time)')
                            ]} setSelected={m_setSearchSort} buttonText={m_searchSort} dropdownSize='sm' useOptionsForButtonText={true}/>
                        </span>
                        <br/>
                        <span>
                            <p className='modal-option-name'>Num. Comments: </p>
                            <input type="range" className="inline-block" placeholder="0" min="0" max="300" value={m_commentsPerPost} style={{ width: '30%', padding: '0'}} onChange={e => {m_setCommentsPerPost(() => parseInt(e.target.value))}}/>
                            <p className='inline-block modal-option-name' style={{paddingLeft: '0.2em'}}>{m_commentsPerPost}</p>
                        </span>
                        <br/>
                        <span>
                            <p className='modal-option-name'>Read Comment Replies: </p>
                            <Dropdown options={[
                                DropdownOption('enabled', 'Enabled'),
                                DropdownOption('disabled', 'Disabled'),
                            ]} setSelected={m_setReadReplies} buttonText={m_readReplies} dropdownSize='sm' useOptionsForButtonText={true}/>
                        </span>
                        <br/><br/>
                        <h4><strong>Speech</strong></h4>
                        <span>
                            <p className='modal-option-name'>Voice: </p>
                            <Dropdown options={
                                speechSynthesis.getVoices().map((voice, index) => DropdownOption(index.toString(), voice.name.split(' - ')[0].replace('Microsoft ', '').replace('Google ', '')))
                            } setSelected={m_setVoice} buttonText={m_voice} dropdownSize='sm' useOptionsForButtonText={true}/>
                        </span>
                        <br/>
                        <span>
                            <p className='modal-option-name'>Reading Speed: </p>
                            <Dropdown options={[
                                DropdownOption('0.75', 'Slow'),
                                DropdownOption('1.25', 'Normal'),
                                DropdownOption('1.75', 'Fast'),
                                DropdownOption('2.25', 'Very Fast')
                            ]} setSelected={m_setReadingSpeed} buttonText={m_readingSpeed} dropdownSize='sm' useOptionsForButtonText={true}/>
                        </span>
                        <br/>
                        <span>
                            <p className='modal-option-name'>Volume: </p>
                            <input type="range" className="inline-block" placeholder="100" min="0" max="100" value={m_volume} style={{ width: '30%', padding: '0'}} onChange={e => {m_setVolume(() => e.target.value)}}/>
                            <p className='inline-block modal-option-name' style={{paddingLeft: '0.2em'}}>{m_volume}</p>
                        </span>
                        <br/><br/>
                        <h4><strong>Background</strong></h4>
                        <span>
                            <p className='modal-option-name'>Background Video: </p>
                            <Dropdown options={[
                                DropdownOption('enabled', 'Enabled'),
                                DropdownOption('disabled', 'Disabled'),
                            ]} setSelected={m_setBackgroundVideo} buttonText={m_backgroundVideo} dropdownSize='sm' useOptionsForButtonText={true}/>
                        </span>
                        <br/>
                        <span>
                            <p className='modal-option-name'>Video URL: </p>
                            <input type="text" className="form-control" placeholder="(Leave empty for no change)" style={{ width: '60%', height: '1.8em', padding: '0', display: 'inline-block'}}/>
                        </span>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={() => {setShowModal(() => false)}}>Close</button>
                        <button type="button" className="btn btn-primary" onClick={saveModal}>Save changes</button>
                    </div>
                </div>
            </div>
        </div>}
    </>
};