import './Home.css';
import Author from './AuthorComponent/Author';
import { useEffect, useRef, useState } from 'react';
import { BsFillArrowRightSquareFill, BsPlay } from 'react-icons/bs';
import { BsPlayFill, BsPauseFill, BsChevronDoubleRight, BsChevronDoubleLeft, BsSkipEndFill, BsSkipStartFill, BsSkipBackwardFill, BsSkipForwardFill } from 'react-icons/bs';
import { fetchPosts } from './utils/Fetch';
import { castPost, Post, fetchPost, CurrentPost, castCurrentPost } from './utils/Reddit';

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
    const [play, setPlay] = useState<boolean>(true);
    const [utteranceStopped, setUtteranceStopped] = useState<boolean>(false);
    const [speak, setSpeak] = useState<Function>(() => {});
    const spliceIndex = useRef<number>(0);
    const commentIndex = useRef<number>(-1);
    const sentenceIndex = useRef<number>(-1);
    const [wordsSpoken, setWordsSpoken] = useState<number>(0);
    // let wordsSpoken = 0;
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!currentPost) return;
        let wordCount = 0;
        const sentences = commentIndex.current === -1 ? currentPost!.postInfo.sentences! : currentPost!.comments[commentIndex.current].sentences!;
        const sentence = sentences[sentenceIndex.current];
        for (const splice in sentence) {
            for (const word in sentence[splice].split(' ')) {
                if (wordCount === wordsSpoken) {
                    spliceIndex.current = Number(splice);
                    presentText();
                    return;
                }
                wordCount++;
            }
        }
    }, [wordsSpoken, currentPost]);

    useEffect(() => {
        if (play) {
            setSpeak(() => (text: string, onEnd : Function, sentence : string[], current : CurrentPost) => {
                setWordsSpoken(() => 0);
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.voice = speechSynthesis.getVoices()[0];
                utterance.rate = 1.5;
                utterance.onend = () => onEnd();
                utterance.onboundary = (e) => {
                    console.log(e.name, spliceIndex.current)
                    if (e.name === 'word')
                        setWordsSpoken(prev => prev + 1);
                }
                speechSynthesis.speak(utterance);
            })
        } else {
            setSpeak(() => (text: string) => {});
        }
    }, [play, currentPost])

    // useEffect(() => {
    //     alert(play);
    //     if (play) {
    //         setUtter(() => {
    //             return (utterance: SpeechSynthesisUtterance) => {speechSynthesis.speak(utterance); speechSynthesis.resume(); console.log('SPEAKING');}
    //         })
    //     } else {
    //         setUtter(() => {
    //             return (utterance: SpeechSynthesisUtterance) => {alert('PAUSED')}
    //         })
    //     }
    // }, [play])

    function subredditChosen(e: any) {
        e.preventDefault();
        setState(State.LOADING);
        fetchPosts(inputRef.current?.value!, 'hot', null)
            .then(response => response.json())
            .then(response => {
                response = response.data.children.map((post: any) => castPost(post.data)).filter((post: Post) => post.stickied === false);
                console.log(response);
                setPosts(() => response);
                setPostIndex(() => 0);
                return response;
            })
            .then(response => getPostIndex(0, response))
        return null;
    }

    function getPostIndex(index: number, postsList : Post[] | null = null) {
        postsList = postsList !== null ? postsList : posts;
        setPostIndex(() => index);
        fetchPost(postsList[index])
            .then(response => response.json())
            .then(response => {
                // console.log(castCurrentPost(postsList![postIndex], response).comments.map(c => [c.body, c.score]));
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
        if (post) setCurrentPost(() => post);
        setState(() => State.ACTIVE);
    }

    function spliceSentence(sentence: string): string[][] {
        if (sentence.length < 100) { // short sentence
            return [[sentence]];
        } else if (sentence.length < 175) { // sentence should be displayed as a whole, but split into two parts while being read
            return [fixRegexOutput(sentence.split(/([,;:]\s+|-\s|\.\.\.|\(|--)/).filter(Boolean))];
        } else { // sentence cannot be displayed as a whole, should be split into multiple parts
            const result = [[]] as string[][];
            const spliced = fixRegexOutput(sentence.split(/([,;:]\s+|-\s|\.\.\.|\(|--)/).filter(Boolean));
            let chars = 0;
            for (let splice of spliced) {
                if (splice.length + chars < 175) {
                    result[result.length - 1].push(splice);
                    chars += splice.length;
                } else {
                    result.push([splice]);
                    chars = 0;
                }
            }
            return result;
        }
    }

    function fixRegexOutput(inp: string[]): string[] {
        return inp.reduce((acc: string[], curr, index, array) => {
            if (index % 2 === 0) {
              const substring = curr + (array[index + 1] || '');
              acc.push(substring);
            }
            return acc;
        }, []);
    }

    function splitIntoSentences(inp: string): string[] {
            const substrings = inp.split(/([.!?]+\s+|\n+)/).filter(Boolean);
            const result : string[] = fixRegexOutput(substrings);
            return result.reduce((result, current) => {
                if (result.length === 0) {
                    result.push(current);
                } else {
                    const lastString = result[result.length - 1];
                    if (lastString.match(/(?:Dr|Mr|Mrs|Ms|Prof|Rev|Hon|Capt|Col|Gen|Cmdr|etc)\.\s+$/)) {
                        result[result.length - 1] = lastString.slice(0, -1) + ' ' + current;
                    } else {
                        result.push(current);
                    }
                }
                return result;
                }, [] as string[]);
    }

    function presentText() {
        // alert([currentPost?.postInfo.selftextSentences!.length])
        if (!currentPost) return;
        let sentence = [] as string[];
        if (commentIndex.current === -1) {
            sentence = currentPost!.postInfo.sentences![sentenceIndex.current];
        } else {
            // console.log(currentPost!.comments[commentIndex.current], commentIndex.current);
            sentence = currentPost!.comments[commentIndex.current].sentences![sentenceIndex.current];
        }
        if (!sentence) {
            increment('sentence');
            return;
        }
        if (spliceIndex.current === 0) {
            speak(sentence.join(''), () => increment('sentence'), sentence, currentPost);
        }
        updateText(currentPost);
    }

    function updateText(post : CurrentPost | null = null) {
        let sentence: string[];
        if (commentIndex.current === -1) {
            sentence = post!.postInfo.sentences![sentenceIndex.current];
        } else {
            sentence = post!.comments[commentIndex.current].sentences![sentenceIndex.current];
        }
        if (sentenceIndex.current === 0)
            setAuthorText(() => 'u/' + (commentIndex.current === -1 ? post!.postInfo.author : post!.comments[commentIndex.current].author));
        setAuthorVisible(() => sentenceIndex.current === 0);
        if (sentence.length === 1) {
            setPrevText(() => '');
            setMainText(() => sentence[0]);
            setPostText(() => '');
        } else {
            setPrevText(() => sentence.slice(0, spliceIndex.current).join(''));
            setMainText(() => sentence[spliceIndex.current]);
            setPostText(() => sentence.slice(spliceIndex.current + 1).join(''));
        }
    }

    function increment(incrementType : 'sentence' | 'slice') {
        console.log(commentIndex.current, sentenceIndex.current, spliceIndex.current)
        const sentences = commentIndex.current === -1 ? currentPost!.postInfo.sentences! : currentPost!.comments[commentIndex.current].sentences!;
        if (commentIndex.current === -1 && sentences.length === 0) {
            commentIndex.current = 0;
            sentenceIndex.current = 0;
            spliceIndex.current = 0;
            presentText();
            return;
        }
        if (incrementType === 'sentence') {
            spliceIndex.current = 0;
            if (sentenceIndex.current >= sentences.length - 1) {
                sentenceIndex.current = 0;
                if (commentIndex.current >= currentPost!.comments.length - 1) {
                    getPostIndex(postIndex + 1);
                    setMainText('Loading...');
                } else {
                    commentIndex.current++;
                }
            } else {
                sentenceIndex.current++;
            }
        } else {
            spliceIndex.current = Math.max(spliceIndex.current + 1, sentences[sentenceIndex.current].length - 1)
        }
        presentText();
    }

    function doPlay() {
        setPlay(() => true);
    }

    function doPause() {
        setPlay(() => false);
    }

    useEffect(() => {
        commentIndex.current = -1;
        sentenceIndex.current = 0;
        spliceIndex.current = 0;
        setPlay(() => true);
        presentText();
    }, [currentPost])

    return <>
    <div className="main-container">
        <div className="main-text-container">
                { state === State.MAIN ?
                <form onSubmit={subredditChosen}>
                    <span>
                        <p className="main-text" style={{display: 'inline-block'}}>r/</p> 
                        <input type="text" placeholder="AskReddit" ref={inputRef}/>
                        <BsFillArrowRightSquareFill className="arrow" onClick={subredditChosen}/>
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
                        <BsSkipBackwardFill color="white" className="icon"/>
                        <BsSkipStartFill color="white" className="icon"/>
                        <BsChevronDoubleLeft color="white" className="icon"/>
                        { play ? 
                            <BsPauseFill color="white" className="icon" onClick={doPause}/> : 
                            <BsPlayFill color="white" className="icon" onClick={doPlay}/>}
                        <BsChevronDoubleRight color="white" className="icon"/>
                        <BsSkipEndFill color="white" className="icon"/>
                        <BsSkipForwardFill color="white" className="icon"/>
                    </div>
                    <Author author="---" visible={false}/>
                </>
                : null
                }
        </div>
    </div>
    </>
}