import { BsChevronDoubleLeft, BsChevronDoubleRight, BsPauseFill, BsPlayFill, BsSkipBackwardFill, BsSkipEndFill, BsSkipForwardFill, BsSkipStartFill } from "react-icons/bs";

import { BiSolidHome, BiSolidInfoCircle } from 'react-icons/bi';
import { GrReddit } from 'react-icons/gr';
import { RiSettings4Fill } from 'react-icons/ri';

export default function (props: { changeReadingPos: Function, fetchNewPostIndex: Function, playing : boolean, indices : number[], postIndex : number, doPlay : Function, doPause : Function }) {
    const {changeReadingPos, fetchNewPostIndex, playing, indices, postIndex, doPlay, doPause} = props;
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
        <BsSkipBackwardFill className={`icon ${playing ? 'unavailable' : ''}`} onClick={doRewindPost}/>
        <BsSkipStartFill className={`icon ${playing ? 'unavailable' : ''}`} onClick={doRewindComment}/>
        <BsChevronDoubleLeft className={`icon ${playing ? 'unavailable' : ''}`} onClick={doRewindSentence}/>
        { playing ? 
            <BsPauseFill className="icon" onClick={doPause}/> : 
            <BsPlayFill className="icon" onClick={doPlay}/>}
        <BsChevronDoubleRight className={`icon ${playing ? 'unavailable' : ''}`} onClick={doFastFowardSentence}/>
        <BsSkipEndFill className={`icon ${playing ? 'unavailable' : ''}`} onClick={doFastFowardComment}/>
        <BsSkipForwardFill className={`icon ${playing ? 'unavailable' : ''}`} onClick={doFastFowrardPost}/>
        <br/>
    </>
}