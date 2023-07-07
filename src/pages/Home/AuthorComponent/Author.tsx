import './Author.css'

export default function Author(props: { author: string, visible : boolean, color? : string }) {
    return <p className = {`author ${props.visible ? '' : 'invisible'}`} style={{color : props.color || 'gold'}}>{props.author}</p>
}