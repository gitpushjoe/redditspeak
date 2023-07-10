export default function speak(text: string, changeReadingPos: Function, voice : SpeechSynthesisVoice | null, rate : number, volume : number) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice || speechSynthesis.getVoices()[0];
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.volume = volume;
    utterance.onend = () => changeReadingPos('sentence');
    speechSynthesis.speak(utterance);
    return utterance;
}