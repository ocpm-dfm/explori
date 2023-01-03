import "./DefaultLayout.css"
import {ExploriNavbar} from "../ExploriNavbar/ExploriNavbar";

type LayoutProps = {
    content?: any
    navbarSlot?: any

    children?: any
}

export function DefaultLayout(props: LayoutProps) {
    return (
        <div className="DefaultLayout-Container">
            <ExploriNavbar lowerRowSlot={props.navbarSlot} />
            <div className="DefaultLayout-Content">
                { props.content ? props.content : null }
                { props.children ? props.children : null}
            </div>
        </div>
    )
}