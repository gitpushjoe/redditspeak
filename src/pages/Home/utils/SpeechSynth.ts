import {CurrentPost } from './Reddit';

export default function speak(text: string, indices : number[], changeReadingPos: Function, voice : SpeechSynthesisVoice | null, rate : number, volume : number) {
    const [commentIndex, sentenceIndex, _] = indices;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice || speechSynthesis.getVoices()[0];
    utterance.rate = rate;
    utterance.volume = volume;
    utterance.onend = () => changeReadingPos('sentence');
    speechSynthesis.speak(utterance);
    return utterance;
}