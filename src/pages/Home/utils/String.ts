export function spliceSentence(sentence: string): string[][] {
    if (sentence.length < 60) { // short sentence
        return [[sentence]];
    } else if (sentence.length < 100) { // sentence should be displayed as a whole, but split into two parts while being read
        return [splitByRegex(sentence, /([,;:]\s+|-\s|\.\.\.|\(|--)/)];
    } else { // sentence cannot be displayed as a whole, should be split into multiple parts
        const result = [[]] as string[][];
        const spliced = splitByRegex(sentence, /([,;:]\s+|-\s|\.\.\.|\(|--)/);
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

export function splitByRegex(inp: string, regex: RegExp): string[] {
    return fixRegexOutput(inp.split(regex).filter(Boolean));
}

export function fixRegexOutput(inp: string[]): string[] {
    return inp.reduce((acc: string[], curr, index, array) => {
        if (index % 2 === 0) {
          const substring = curr + (array[index + 1] || '');
          acc.push(substring);
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