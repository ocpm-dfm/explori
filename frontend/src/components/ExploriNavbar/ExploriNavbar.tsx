import "./ExploriNavbar.css"
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import {faDiagramProject, faArrowRightArrowLeft, faGaugeHigh} from "@fortawesome/free-solid-svg-icons";
import {faFile, IconDefinition, faCircleQuestion} from "@fortawesome/free-regular-svg-icons";
import {Link, useLocation} from "react-router-dom";


export interface ExploriNavbarProps  {
    lowerRowSlot?: any
}


function NavbarLink(props: { icon: IconDefinition, display: string, route: string }) {
    const location = useLocation();
    const active = location.pathname === props.route;

    return (
        <Link to={props.route} className={`ENAV-link ${active ? 'ENAV-link--active' : ''}`}>
            <FontAwesomeIcon icon={props.icon} />
            {props.display}
        </Link>
    )
}


export function ExploriNavbar(props: ExploriNavbarProps) {
    return (
        <div className="ENAV-outer">
            <div className="ENAV-Row ENAV-Row1">
                <div className="ENAV-logo">
                    <img src="/explori.png" alt="" />
                    <span>Explori</span>
                </div>
                <div>
                    <Link to="/help" className="ENAV-new-session ENAV-help">
                        <FontAwesomeIcon icon={faCircleQuestion} />
                    </Link>
                    <Link to="/session" className="ENAV-new-session">
                        <FontAwesomeIcon icon={faFile} />
                    </Link>
                </div>
            </div>
            <div className="ENAV-Row ENAV-Row2">
                <div className="ENAV-links">
                    <NavbarLink icon={faDiagramProject} display="Graph" route="/" />
                    <NavbarLink icon={faArrowRightArrowLeft} display="Alignments" route="/alignments" />
                    <NavbarLink icon={faGaugeHigh} display="Performance" route="/performance" />
                </div>
                <div className="ENAV-props">
                    {props.lowerRowSlot !== undefined ? props.lowerRowSlot : undefined }
                </div>
            </div>
        </div>
    );
}