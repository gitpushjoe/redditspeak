export function spliceSentence(sentence: string, smallSentenceLength : number = 40, longSentenceLength : number = 100): string[][] {
    sentence = sentence.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&apos;', "'").replace('&nbsp;', ' ');
    if (sentence.length < smallSentenceLength) { // short sentence
        return [[sentence]];
    } else if (sentence.length < longSentenceLength) { // sentence should be displayed as a whole, but split into two parts while being read
        return [splitByRegex(sentence, /([,;:]\s+|-\s|\.\.\.|\(|\)|--)/)];
    } else { // sentence cannot be displayed as a whole, should be split into multiple parts
        const result = [[]] as string[][];
        const spliced = splitByRegex(sentence, /([,;:]\s+|-\s|\.\.\.|\(|\)|--)/);
        let chars = 0;
        for (let splice of spliced) {
            const lastSentence = result[result.length - 1];
            if ((lastSentence ? lastSentence.join(' ').length : 0) + splice.length + chars < 100) {
                result[result.length - 1].push(splice);
            } else {
                let lastWords = '';
                for (let word of splice.split(" ")) {
                    lastWords += word + ' ';
                    if (lastWords.length + chars > 80) {
                        result[result.length - 1].push(...spliceSentence(lastWords, 90).flat());
                        lastWords = '';
                    }
                }
                if (lastWords.length > 0) {
                    result[result.length - 1].push(...spliceSentence(lastWords, 90).flat());
                }
            }
        }
        return result;
    }
}

export function splitByRegex(inp: string, regex: RegExp): string[] {
    return fixRegexOutput(inp.split(regex).filter(Boolean));
}

export function fixRegexOutput(inp: string[]): string[] {
    return inp.reduce((acc: string[], curr, index, array) => {
        if (index % 2 === 0) {
          const nextChar = (array[index + 1] || '');
          if (nextChar !== '(') {
            const substring = curr + nextChar;
            acc.push(substring);
          } else {
            if (nextChar && index + 2 < inp.length) {
                inp[index + 2] = nextChar + inp[index + 2];
            }
            acc.push(curr);
          }
        }
        return acc;
    }, []);
}

export function splitIntoSentences(inp: string): string[] {
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

export function abbrvNumber(num : number) : string {
    if (num < 1000) {
        return num.toString();
    }
    if (num < 1000000) {
        return ((num / 1000).toFixed(1) + 'k').replace('.0k', 'k');
    }
    if (num < 1000000000) {
        return ((num / 1000000).toFixed(1) + 'm').replace('.0m', 'm');
    }
    return '';
}