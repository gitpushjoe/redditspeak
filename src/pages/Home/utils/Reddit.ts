export type Post = {
    all_awardings: any[],
    author: string,
    created: string,
    id: string,
    name: string,
    permalink: string,
    score: number,
    title: string,
    url: string,
    stickied: boolean,
    selftext: string,
    subreddit: string,
    sentences?: string[][],
};

export type Comment = {
    replies: any,
    author: string,
    body: string,
    created: string,
    id: string,
    name: string,
    permalink: string,
    score: number,
    sentences?: string[][],
    stickied: boolean,
};

export type CurrentPost = {
    postInfo: Post,
    comments: Comment[],
};

const dummyPost = {
    all_awardings: [],
    author: '',
    created: '',
    id: '',
    name: '',
    permalink: '',
    score: 0,
    title: '',
    url: '',
    stickied: false,
    selftext: '',
    subreddit: '',
};

export function castPost(post: any): Post {
    return {
        all_awardings: post.all_awardings,
        author: post.author,
        created: post.created,
        id: post.id,
        name: post.name,
        permalink: post.permalink,
        score: post.score,
        title: post.title,
        url: post.url,
        stickied: post.stickied,
        selftext: post.selftext,
        subreddit: post.subreddit,
    };
}

export function castCurrentPost(source: Post, data: any): CurrentPost {
    return {
        postInfo: source,
        comments: data[1].data.children.map((comment: any) : Comment => {
            return {
                replies: comment.data.replies,
                author: comment.data.author,
                body: comment.data.body,
                created: comment.data.created,
                id: comment.data.id,
                name: comment.data.name,
                permalink: comment.data.permalink,
                score: comment.data.score,
                stickied: comment.data.stickied,
            };
        })
    };
}

export function castRepliesToCurrentPost(replies: any): CurrentPost|null {
    if (!replies.data || !replies.data.children || replies.data.children[0].kind !== 't1') {
        return null;
    }
    return {
        postInfo: dummyPost,
        comments: replies.data.children.map((comment: any) : Comment => {
            return {
                replies: comment.data.replies,
                author: comment.data.author,
                body: comment.data.body,
                created: comment.data.created,
                id: comment.data.id,
                name: comment.data.name,
                permalink: comment.data.permalink,
                score: comment.data.score,
                stickied: comment.data.stickied,
            };
        })
    };
}

export async function fetchPost(post: Post, count = 100, depth = 0): Promise<any> {
    return fetch(`https://www.reddit.com/r/${post.subreddit}/comments/${post.id}.json?limit=${count}&depth=${depth}`);
}

export const acronyms = [
    ['TIL', 'Today I learned '],
    ['ELI5', 'Explain like I\'m 5 '],
    ['IIRC', 'If I recall correctly '],
    ['YSK', 'You should know'],
    ['TL;DR', 'Too long; didn\'t read '],
    ['AMA', 'Ask me anything '],
    ['IMO', 'In my opinion '],
    ['IMHO', 'In my honest opinion '],
    ['AFAIK', 'As far as I know '],
    ['OP', 'Original poster '],
    ['OC', 'Original content '],
    ['NSFW', 'Not safe for work '],
    ['NSFL', 'Not safe for life '],
    ['DAE', 'Does anyone else '],
    ['FTFY', 'Fixed that for you '],
    ['IAMA', 'I am a '],
    ['IANAL', 'I am not a lawyer '],
    ['IANAD', 'I am not a doctor '],
    ['DYK', 'Did you know '],
    ['PSA', 'Public service announcement '],
];

export function expandAcronyms(inp: string): string {
    for (const [acronym, expansion] of acronyms) {
        inp = inp.replace(new RegExp(`\\b${acronym}\\b`, 'gi'), expansion);
    }
    return inp;
}

export function acronymOffset(inp: string): number {
    let res = 0;
    for (const [acronym, expansion] of acronyms) {
        const count = (inp.match(new RegExp(`\\b${acronym}\\b`, 'gi')) || []).length;
        res += count * (expansion.split(' ').length - 1);
    }
    return res;
}