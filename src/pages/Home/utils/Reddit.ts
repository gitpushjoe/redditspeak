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
    selftextSentences?: string[][],
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
    }
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
            }
        })
    }
};

export async function fetchPost(post: Post, offset: number = 0): Promise<any> {
    return fetch(`https://www.reddit.com${post.permalink}.json?offset=${offset}&limit=200`)
}