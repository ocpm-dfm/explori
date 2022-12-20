import './NavbarButton.css'
import {IconDefinition} from "@fortawesome/free-regular-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

type NavbarButtonProps = {
    icon?: IconDefinition
    onClick?: () => void,
    active?: boolean


    children?: any,
    className?: string
    title?: string
}

export const NavbarButton = (props: NavbarButtonProps) => {
    return (
        <div className={`NavbarButton ${props.active ? 'NavbarButton--active' : ''} ${props.className ? props.className : ''}`}
                onClick={() => props.onClick && props.onClick()}
                title={props.title}>
            {props.icon ? <FontAwesomeIcon icon={props.icon} /> : null}
            {props.children}
        </div>);
}
