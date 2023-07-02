import './Author.css'

export default function Author(props: { author: string, visible : boolean }) {
    return <p className = {`author ${props.visible ? '' : 'invisible'}`} >{props.author}</p>
}