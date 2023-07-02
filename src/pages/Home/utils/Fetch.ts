type sortType = 'hot' | 'top';
type periodType = 'day' | 'week' | 'month' | 'year' | 'all';

export function fetchPosts(subreddit: string, sort: sortType, period: periodType|null): Promise<any> {
    let url : string;
    if (sort === 'hot') {
        url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=100`;
    } else {
        url = `https://www.reddit.com/r/${subreddit}/top.json?sort=top&limit=100&t=${period}`;
    }
    return fetch(url)
}