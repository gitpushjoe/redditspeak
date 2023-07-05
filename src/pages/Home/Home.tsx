import './Home.css';
import Author from './AuthorComponent/Author';
import { useEffect, useRef, useState } from 'react';
import { BsChevronDoubleLeft, BsChevronDoubleRight, BsFillArrowRightSquareFill, BsPauseFill, BsPlayFill, BsSkipBackwardFill, BsSkipEndFill, BsSkipForwardFill, BsSkipStartFill } from 'react-icons/bs';
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
    const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);
    const [playing, setPlaying] = useState<boolean>(false);
    const [indices, setIndices] = useState<number[]>([-1, 0, 0]); // [commentIndex, sentenceIndex, spliceIndex]
    let commentIndex = -2;
    let sentenceIndex = 0;
    let spliceIndex = 0;
    let wordsSpoken = 0;
    const inputRef = useRef<HTMLInputElement>(null);

    const dividers = [',', '- ', '...', ':', ';', '--', ' / ', '('];

    // useEffect(() => {
    //     const handleKeyDown = (event: KeyboardEvent) => {
    //         if (event.code === 'Space') {
    //         console.log('KEYDOWN', event.code, playing);
    //         if (utterance) {
    //             utterance.onend = () => {};
    //         }
    //         setPlaying(() => false);
    //         speechSynthesis.cancel();
    //         }
    //     };
        
    //     window.removeEventListener('keydown', handleKeyDown);
    //     window.addEventListener('keydown', handleKeyDown);
        
    //     return () => {
    //         window.removeEventListener('keydown', handleKeyDown);
    //     };
    //     }, [utterance]);
      

    // useEffect(() => {
    //     let handleKeyDown = (event: KeyboardEvent) => {
    //     commentIndex = indices[0];
    //     sentenceIndex = indices[1];
    //     spliceIndex = indices[2];
    //       if (event.code === 'Enter' && speech && !playing) {
    //         console.log('KEYDOWN', event.code, playing);
    //         presentText();
    //       }
    //     };
      
    //     window.removeEventListener('keydown', handleKeyDown);
    //     window.addEventListener('keydown', handleKeyDown);
      
    //     return () => {
    //       window.removeEventListener('keydown', handleKeyDown);
    //     };
    //   }, [utterance, playing]);

    function speak(text: string) {
        wordsSpoken = 0;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = speechSynthesis.getVoices()[0];
        utterance.rate = 1.5;
        utterance.onend = () => changeReadingPos('sentence');
        utterance.onboundary = (e) => {
            // console.log(e.name, spliceIndex)
            const sentences = commentIndex === -1 ? currentPost!.postInfo.sentences! : currentPost!.comments[commentIndex].sentences!;
            if (e.name === 'word')
                wordsSpoken++;
                let wordCount = 0;
                for (const splice in sentences[sentenceIndex]) {
                    for (const word in sentences[sentenceIndex][splice].split(' ')) {
                        if (wordCount === wordsSpoken) {
                            spliceIndex = Number(splice);
                            updateText();
                            return;
                        }
                        wordCount++;
                        // console.log(wordCount, splice, spliceIndex)
                    }
                }
        }
        speechSynthesis.speak(utterance);
        return utterance;
    }

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
                setPostIndex(() => 0);
                return response;
            })
            .then(response => fetchNewPostIndex(0, response))
        return null;
    }

    function fetchNewPostIndex(index: number, postsList : Post[] | null = null) {
        postsList = postsList !== null ? postsList : posts;
        fetchPost(postsList[index])
            .then(response => response.json())
            .then(response => {
                // console.log(castCurrentPost(postsList![postIndex], response).comments.map(c => [c.body, c.score]));
                console.log(JSON.stringify(response, null, 2));
                let currentPost = castCurrentPost(postsList![index], response);
                currentPost.comments = currentPost.comments.filter(c => c.body !== '[deleted]' && !c.stickied);
                initialize(currentPost);
            })
    }

    function initialize(post : CurrentPost | null) {
        console.log(post);
        if (!post) {post = currentPost;}
        const sentences = splitIntoSentences(post!.postInfo.title + '\n' + post!.postInfo.selftext);
        alert(sentences.join('\n'));
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

    function spliceSentence(sentence: string): string[][] {
        if (sentence.length < 60) { // short sentence
            return [[sentence]];
        } else if (sentence.length < 100) { // sentence should be displayed as a whole, but split into two parts while being read
            return [fixRegexOutput(sentence.split(/([,;:]\s+|-\s|\.\.\.|\(|--)/).filter(Boolean))];
        } else { // sentence cannot be displayed as a whole, should be split into multiple parts
            const result = [[]] as string[][];
            const spliced = fixRegexOutput(sentence.split(/([,;:]\s+|-\s|\.\.\.|\(|--)/).filter(Boolean));
            let chars = 0;
            for (let splice of spliced) {
                const lastSentence = result[result.length - 1];
                if ((lastSentence ? lastSentence.join(' ').length : 0) + splice.length + chars < 100) {
                    result[result.length - 1].push(splice);
                } else {
                    for (let word of splice.split(" ")) {
                        const lastSentence = result[result.length - 1];
                        const lastSplice = lastSentence ? lastSentence[lastSentence.length - 1] : '';
                        if (lastSplice && lastSplice.length + word.length + 1 < 100) {
                            if (lastSentence)
                                result[result.length - 1][result[result.length - 1].length - 1] += word + ' ';
                            else
                                result[result.length - 1].push(word + ' ');
                        } else {
                            result[result.length - 1].push(word + ' ');
                        }
                    }
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
        if (commentIndex !== -2) {
            setIndices(() => [commentIndex, sentenceIndex, spliceIndex]);
            console.log([commentIndex, sentenceIndex, spliceIndex]);
        }
        if (!currentPost) return;
        let sentence = [] as string[];
        if (commentIndex === -1) {
            sentence = currentPost!.postInfo.sentences![sentenceIndex];
        } else {
            // console.log(currentPost!.comments[commentIndex], commentIndex);
            sentence = currentPost!.comments[commentIndex].sentences![sentenceIndex];
        }
        if (!sentence) {
            changeReadingPos('sentence');
            console.log('INCREMENTING')
            return;
        }
        if (spliceIndex === 0) {
            setUtterance(() => speak(sentence.join('')));
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

    function getCurrentSlice() {
        return getCurrentSentence()[spliceIndex];
    }

    function updateText() {
        let sentence: string[];
        if (commentIndex === -1) {
            sentence = currentPost!.postInfo.sentences![sentenceIndex];
        } else {
            sentence = currentPost!.comments[commentIndex].sentences![sentenceIndex];
        }
        if (sentenceIndex === 0)
            setAuthorText(() => 'u/' + getCurrentPostOrComment().author);
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

    function changeReadingPos(incrementType: 'splice' | 'sentence' | 'comment', increment: -1|1 = 1) {
        const sentences = getCurrentSentences();
        if (incrementType === 'splice') spliceIndex += increment;
        if (incrementType === 'sentence') sentenceIndex += increment;
        if (incrementType === 'comment') commentIndex += increment;
        if (incrementType !== 'splice') spliceIndex = 0;

        
        if (sentenceIndex < 0) {
            sentenceIndex = getCurrentPostOrComment().sentences![Math.max(0, commentIndex - 1)].length - 1;
            commentIndex--;
        }
        if (sentenceIndex >= sentences.length) {
            sentenceIndex = 0;
            commentIndex++;
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
        spliceIndex = Math.min(sentences[sentenceIndex].length - 1, spliceIndex);
        spliceIndex = Math.max(0, spliceIndex);
        presentText();
        return;
        // if (commentIndex === -1 && sentences.length === 0) {
        //     commentIndex = 0;
        //     sentenceIndex = 0;
        //     spliceIndex = 0;
        //     presentText();
        //     return;
        // }
        // if (incrementType === 'sentence') {
        //     spliceIndex = 0;
        //     if (sentenceIndex >= sentences.length - 1) {
        //         sentenceIndex = 0;
        //         if (commentIndex >= currentPost!.comments.length - 1) {
        //             fetchNewPostIndex(postIndex + 1);
        //             setMainText('Loading...');
        //         } else {
        //             commentIndex++;
        //         }
        //     } else {
        //         sentenceIndex++;
        //     }
        // } else {
        //     spliceIndex = Math.max(spliceIndex + 1, sentences[sentenceIndex].length - 1)
        // }
        // presentText();
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
        setPlaying(() => false);
        speechSynthesis.cancel();
    }

    useEffect(() => {
        commentIndex = -1;
        sentenceIndex = 0;
        spliceIndex = 0;
        presentText();
        setPlaying(() => true);
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
                        <BsSkipBackwardFill className={`icon ${playing ? 'unavailable' : ''}`}/>
                        <BsSkipStartFill className={`icon ${playing ? 'unavailable' : ''}`}/>
                        <BsChevronDoubleLeft className={`icon ${playing ? 'unavailable' : ''}`}/>
                        { playing ? 
                            <BsPauseFill className="icon" onClick={doPause}/> : 
                            <BsPlayFill className="icon" onClick={doPlay}/>}
                        <BsChevronDoubleRight className={`icon ${playing ? 'unavailable' : ''}`}/>
                        <BsSkipEndFill className={`icon ${playing ? 'unavailable' : ''}`}/>
                        <BsSkipForwardFill className={`icon ${playing ? 'unavailable' : ''}`}/>
                    </div>
                    <Author author="---" visible={false}/>
                </>
                : null
                }
        </div>
    </div>
    </>
}