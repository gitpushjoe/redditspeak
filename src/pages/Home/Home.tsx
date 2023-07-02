import './Home.css';
import Author from './AuthorComponent/Author';
import { useEffect, useRef, useState } from 'react';
import { BsFillArrowRightSquareFill } from 'react-icons/bs';
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
    let commentIndex = 0;
    let sentenceIndex = 0;
    let spliceIndex = 0;
    let wordsSpoken = 0;
    const inputRef = useRef<HTMLInputElement>(null);

    const dividers = [',', '- ', '...', ':', ';', '--', ' / ', '('];

    function speak(text: string) {
        wordsSpoken = 0;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = speechSynthesis.getVoices()[0];
        utterance.rate = 1.5;
        utterance.onend = () => increment('sentence');
        utterance.onboundary = (e) => {
            console.log(e.name, spliceIndex)
            const sentences = commentIndex === -1 ? currentPost!.postInfo.selftextSentences! : currentPost!.comments[commentIndex].sentences!;
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
                        console.log(wordCount, splice, spliceIndex)
                    }
                }
        }
        speechSynthesis.speak(utterance);
    }

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
        fetchPost(postsList[index])
            .then(response => response.json())
            .then(response => {
                // console.log(castCurrentPost(postsList![postIndex], response).comments.map(c => [c.body, c.score]));
                let currentPost = castCurrentPost(postsList![postIndex], response);
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
        post!.postInfo.selftextSentences = splicedSentences;
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

    function charsBefore(str: string, char: string): number {
        return str.indexOf(char) !== -1 ? str.indexOf(char) : -1;
    }

    function presentText() {
        // alert([currentPost?.postInfo.selftextSentences!.length])
        if (!currentPost) return;
        let sentence = [] as string[];
        if (commentIndex === -1) {
            sentence = currentPost!.postInfo.selftextSentences![sentenceIndex];
        } else {
            // console.log(currentPost!.comments[commentIndex], commentIndex);
            sentence = currentPost!.comments[commentIndex].sentences![sentenceIndex];
        }
        if (!sentence) {
            increment('sentence');
            console.log('INCREMENTING')
            return;
        }
        if (spliceIndex === 0) {
            speak(sentence.join(''));
        }
        updateText();
    }

    function updateText() {
        let sentence: string[];
        if (commentIndex === -1) {
            sentence = currentPost!.postInfo.selftextSentences![sentenceIndex];
        } else {
            sentence = currentPost!.comments[commentIndex].sentences![sentenceIndex];
        }
        if (sentenceIndex === 0)
            setAuthorText(() => 'u/' + (commentIndex === -1 ? currentPost!.postInfo.author : currentPost!.comments[commentIndex].author));
        setAuthorVisible(() => sentenceIndex === 0);
        if (sentence.length === 1) {
            setPrevText(() => '');
            setMainText(() => sentence[0]);
            setPostText(() => '');
        } else {
            setPrevText(() => sentence.slice(0, spliceIndex).join(''));
            setMainText(() => sentence[spliceIndex]);
            setPostText(() => sentence.slice(spliceIndex + 1).join(''));
        }
    }

    function increment(incrementType : 'sentence' | 'slice') {
        const sentences = commentIndex === -1 ? currentPost!.postInfo.selftextSentences! : currentPost!.comments[commentIndex].sentences!;
        if (commentIndex === -1 && sentences.length === 0) {
            commentIndex = 0;
            sentenceIndex = 0;
            spliceIndex = 0;
            presentText();
            return;
        }
        if (incrementType === 'sentence') {
            spliceIndex = 0;
            if (sentenceIndex >= sentences.length - 1) {
                sentenceIndex = 0;
                if (commentIndex >= currentPost!.comments.length - 1) {
                    getPostIndex(postIndex + 1);
                    setMainText('Loading...');
                } else {
                    commentIndex++;
                }
            } else {
                sentenceIndex++;
            }
        } else {
            spliceIndex = Math.max(spliceIndex + 1, sentences[sentenceIndex].length - 1)
        }
        presentText();
    }

    useEffect(() => {
        commentIndex = -1;
        sentenceIndex = 0;
        spliceIndex = 0;
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
                    <Author author="---" visible={false}/>
                </>
                : null
                }
        </div>
    </div>
    </>
}