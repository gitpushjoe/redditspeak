import {CurrentPost } from './Reddit';

export default function speak(text: string, indices : number[], currentPost: CurrentPost, changeReadingPos: Function, updateText: Function) {
    const [commentIndex, sentenceIndex, _] = indices;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = speechSynthesis.getVoices()[0];
    utterance.rate = 1.5;
    utterance.onend = () => changeReadingPos('sentence');
    speechSynthesis.speak(utterance);
    return utterance;
}