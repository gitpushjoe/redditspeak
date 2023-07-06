import './Home.css';
import Author from './AuthorComponent/Author';
import SpeechSynth from './utils/SpeechSynth';
import { useEffect, useRef, useState } from 'react';
import { BsChevronDoubleLeft, BsChevronDoubleRight, BsFillArrowRightSquareFill, BsPauseFill, BsPlayFill, BsSkipBackwardFill, BsSkipEndFill, BsSkipForwardFill, BsSkipStartFill } from 'react-icons/bs';
import { fetchPosts } from './utils/Fetch';
import { castPost, Post, fetchPost, CurrentPost, castCurrentPost } from './utils/Reddit';
import speak from './utils/SpeechSynth';
import { splitIntoSentences, spliceSentence, abbrvNumber } from './utils/String';

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
    const [currentPost, setCurrentPost] = useState<CurrentPost|null>(null);
    const [prevText, setPrevText] = useState<string>("");
    const [postText, setPostText] = useState<string>("");
    const [authorVisible, setAuthorVisible] = useState<boolean>(false);
    const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);
    const [playing, setPlaying] = useState<boolean>(true);
    const [indices, setIndices] = useState<number[]>([-1, 0, 0]); // [commentIndex, sentenceIndex, spliceIndex]
    let commentIndex = -2;
    let sentenceIndex = 0;
    let spliceIndex = 0;
    let wordsSpoken = 0;
    const inputRef = useRef<HTMLInputElement>(null);

    function subredditChosen(e: any) {
        if (utterance)
            utterance.onend = () => {};
        e.preventDefault();
        setState(State.LOADING);
        fetchPosts(inputRef.current?.value!, 'hot', null)
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

    function fetchNewPostIndex(index: number, postsList : Post[] | null = null) {
        setState(State.LOADING);
        setPostIndex(() => index);
        postsList = postsList !== null ? postsList : posts;
        index = Math.min(Math.max(index, 0), postsList.length - 1);
        fetchPost(postsList[index])
            .then(response => response.json())
            .then(response => {
                let currentPost = castCurrentPost(postsList![index], response);
                currentPost.comments = currentPost.comments.filter(c => c.body !== '[deleted]' && !c.stickied);
                initialize(currentPost);
            })
    }

    function initialize(post : CurrentPost | null) {
        if (!post) {post = currentPost;}
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
            post!.comments[i].sentences = splicedSentences;
        }
        console.log(post);
        if (post) setCurrentPost(() => post);
        setState(() => State.ACTIVE);
    }

    function presentText(withAudio = true) {
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
        if (spliceIndex === 0 && withAudio) {
            const utterance = speak(sentence.join(''), [commentIndex, sentenceIndex, spliceIndex], currentPost, changeReadingPos, updateText);
            wordsSpoken = 0;
            utterance.onboundary = (e) => { // add event listener to utterance to update spliceIndex
                const sentences = commentIndex === -1 ? currentPost!.postInfo.sentences! : currentPost!.comments[commentIndex].sentences!;
                let wordCount = 0;
                if (e.name === 'word') wordsSpoken++;
                for (const splice in sentences[sentenceIndex]) {
                    for (const word in sentences[sentenceIndex][splice].split(' ')) {
                        if (wordCount === wordsSpoken) {
                            updateText(Number(splice));
                            return;
                        }
                        wordCount++;
                    }
                }
            }
            setUtterance(() => utterance);
        }
        updateText();
    }

    function getCurrentPostOrComment() {
        return commentIndex === -1 ? currentPost!.postInfo : currentPost!.comments[commentIndex];
    }

    function getCurrentSentences() {
        return commentIndex === -1 ? currentPost!.postInfo.sentences! : currentPost!.comments[commentIndex].sentences!;
    }

    function getCurrentSentence() {
        return getCurrentSentences()[sentenceIndex];
    }

    function updateText(splice: number|null = null) {
        if (splice !== null) 
            {spliceIndex = splice; console.log(splice);}
        let sentence: string[];
        if (commentIndex === -1) {
            sentence = currentPost!.postInfo.sentences![sentenceIndex];
        } else {
            sentence = currentPost!.comments[commentIndex].sentences![sentenceIndex];
        }
        if (sentenceIndex === 0)
            setAuthorText(() => (commentIndex === -1 ? '[OP] ' : '') + 'u/' + getCurrentPostOrComment().author + '   ▲' + abbrvNumber(getCurrentPostOrComment().score));
        setAuthorVisible(() => sentenceIndex === 0);
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

    function changeReadingPos(incrementType: 'splice' | 'sentence' | 'comment', increment: -1|0|1 = 1, indices : number[]|null = null, withAudio = true) {
        if (indices) {
            commentIndex = indices[0];
            sentenceIndex = indices[1];
            spliceIndex = indices[2];
        }
        const sentences = getCurrentSentences();
        if (incrementType === 'splice') spliceIndex += increment;
        if (incrementType === 'sentence') sentenceIndex += increment;
        if (incrementType === 'comment') commentIndex += increment;
        if (incrementType !== 'splice') spliceIndex = 0;
        
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
        setPlaying(() => true);
        commentIndex = indices[0];
        sentenceIndex = indices[1];
        spliceIndex = indices[2];
        presentText();
    }

    function doPause() {
        setPlaying(() => false);
        if (utterance) {
            utterance.onend = () => {};
        }
        speechSynthesis.cancel();
    }

    useEffect(() => {
        commentIndex = -1;
        sentenceIndex = 0;
        spliceIndex = 0;
        presentText(playing);
    }, [currentPost])

    useEffect(() => {
        setState(() => State.MAIN);
    }, [])

    function doRewindSentence() {if (!playing) changeReadingPos('sentence', -1, indices, false);}
    function doRewindComment() {if (!playing) changeReadingPos('comment', -1, indices, false);}
    function doRewindPost() {if (!playing) {
        if (indices[0] === -1 && indices[1] === 0 && indices[2] === 0) {
            fetchNewPostIndex(postIndex - 1);
        } else {
            changeReadingPos('comment', -1, [-1, 0, 0], false);
        }
    }}

    function doFastFowardSentence() {if (!playing) changeReadingPos('sentence', 1, indices, false);}
    function doFastFowardComment() {if (!playing) changeReadingPos('comment', 1, indices, false);}
    function doFastFowrardPost() {if (!playing) fetchNewPostIndex(postIndex + 1);}

    return <>
    <div className="main-container">
        <div className="main-text-container">
                { state === State.MAIN ?
                <form onSubmit={subredditChosen}>
                    <span>
                        <p className="main-text" style={{display: 'inline-block'}}>r/</p> 
                        <input type="text" placeholder="AskReddit" ref={inputRef}/>
                        <BsFillArrowRightSquareFill className="arrow" onClick={subredditChosen}/>
                        <br/>
                        <p className="subtitle" style={{display: 'inline-block'}}>Search Setting: </p>
                    </span>
                </form>
                : state === State.LOADING ?
                    <p className="main-text">Loading...</p>
                : state === State.ACTIVE ?
                <>
                    <Author author={authorText} visible={authorVisible}/>
                    <p>
                            <mark className="secondary-text">{prevText}</mark>
                            <mark className="main-text">{mainText}</mark>
                            <mark className="secondary-text">{postText}</mark>
                        </p>
                    <div className="controls-container">
                        <BsSkipBackwardFill className={`icon ${playing ? 'unavailable' : ''}`} onClick={doRewindPost}/>
                        <BsSkipStartFill className={`icon ${playing ? 'unavailable' : ''}`} onClick={doRewindComment}/>
                        <BsChevronDoubleLeft className={`icon ${playing ? 'unavailable' : ''}`} onClick={doRewindSentence}/>
                        { playing ? 
                            <BsPauseFill className="icon" onClick={doPause}/> : 
                            <BsPlayFill className="icon" onClick={doPlay}/>}
                        <BsChevronDoubleRight className={`icon ${playing ? 'unavailable' : ''}`} onClick={doFastFowardSentence}/>
                        <BsSkipEndFill className={`icon ${playing ? 'unavailable' : ''}`} onClick={doFastFowardComment}/>
                        <BsSkipForwardFill className={`icon ${playing ? 'unavailable' : ''}`} onClick={doFastFowrardPost}/>
                    </div>
                    <Author author="---" visible={false}/>
                </>
                : null
                }
        </div>
    </div>
    </>
}