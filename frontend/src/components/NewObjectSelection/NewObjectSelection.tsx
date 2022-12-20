import "./NewObjectSelection.css"
import {NavbarButton} from "../ExploriNavbar/NavbarButton/NavbarButton";
import {
    faBox,
    faBoxesStacked,
    faCaretDown,
    faCaretUp,
} from "@fortawesome/free-solid-svg-icons";
import {useEffect, useRef, useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCircle} from "@fortawesome/free-regular-svg-icons";

type ObjectSelectionProps = {
    // all available object types in the currently visualized dfm (empty list means object types have not been determined  yet)
    availableObjectTypes: string[],
    // all currently selected object types (needs to be passed in at least for initialization, e.g. when restoring a session)
    selectedObjectTypes: string[],
    // should we select all object types at the start of visualizing a new dfm?
    selectAllObjectTypesInitially: boolean,
    // have we already selected all object types for this dfm?
    alreadySelectedAllObjectTypesInitially: boolean,
    setSelectedObjectTypes: (selectedObjectTypes: string[]) => void
}

export const NewObjectSelection = (props: ObjectSelectionProps) => {
    const [open, setOpen] = useState<boolean>(false);
    const closeTimeout = useRef<NodeJS.Timeout | null>(null);

    const selectionCount = props.selectedObjectTypes.length;
    const countIcon = selectionCount === 0 ? faCircle : (selectionCount === 1 ? faBox : faBoxesStacked);
    const dropdownIcon = open ? faCaretUp : faCaretDown;

    // Always clear timeout on component unmount.
    useEffect(() => {
        return () => {
            if (closeTimeout.current)
                // eslint-disable-next-line react-hooks/exhaustive-deps
                clearTimeout(closeTimeout.current);
        }
    }, []);

    const toggleObjectType = (objectType: string) => {
        const newSelection = props.selectedObjectTypes.map((x) => x);
        const index = newSelection.indexOf(objectType);
        if (index !== -1)
            newSelection.splice(index, 1);
        else
            newSelection.push(objectType);
        props.setSelectedObjectTypes(newSelection);
    }

    const delayedClose = () => {
        if (closeTimeout.current)
            clearTimeout(closeTimeout.current);

        closeTimeout.current = setTimeout(() => {
            setOpen(false);
            closeTimeout.current = null;
        }, 300)
    };

    const cancelDelayedClose = () => {
        if (closeTimeout.current)
            clearTimeout(closeTimeout.current);
    }

    return (
        <div className="NOS-Container" onMouseLeave={() => delayedClose()} onMouseEnter={() => cancelDelayedClose()}>
            <div className={`NOS-ButtonWrapper ${open ? 'NOS-ButtonWrapper--open' : ''}`}>
                <NavbarButton icon={countIcon}
                              active={open}
                              onClick={() => setOpen(!open)}>
                    Object Types
                    <FontAwesomeIcon icon={dropdownIcon} className="NOS-Button-DropdownIcon"/>
                </NavbarButton>
            </div>

            {open && (
                <div className="NOS-Dropdown">
                    {props.availableObjectTypes.map((objectType) => (
                        <label key={`SelectionToggle-${objectType}`}
                               className="NOS-ObjectType"
                               htmlFor={`SelectionToggle-${objectType}`}>
                            <input type="checkbox"
                                   id={`SelectionToggle-${objectType}`}
                                   checked={props.selectedObjectTypes.includes(objectType)}
                                   onChange={() => toggleObjectType(objectType)}
                            />
                            {objectType}
                        </label>
                    ))}
                </div>
            )}
        </div>
    )
}