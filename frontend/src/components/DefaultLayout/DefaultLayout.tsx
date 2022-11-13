import "./DefaultLayout.css"
import {ExploriNavbar} from "../ExploriNavbar/ExploriNavbar";

export function DefaultLayout(props: { content: any, navbarSlot?: any }) {
    return (
        <div className="DefaultLayout-Container">
            <ExploriNavbar lowerRowSlot={props.navbarSlot} />
            <div className="DefaultLayout-Content">
                { props.content }
            </div>
        </div>
    )
}