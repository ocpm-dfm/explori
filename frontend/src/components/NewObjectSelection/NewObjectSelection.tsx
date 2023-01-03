import "./NewObjectSelection.css"
import {NavbarButton} from "../ExploriNavbar/NavbarButton/NavbarButton";
import {
    faBox,
    faBoxesStacked,
    faCaretDown,
    faCaretUp, faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import {useEffect, useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCircle} from "@fortawesome/free-regular-svg-icons";
import {useDelayedExecution} from "../../hooks";
import {getObjectTypeColor} from "../../utils";

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
    const delayedClose = useDelayedExecution(() => setOpen(false), 300);

    useEffect(() => {
        if (
            !props.alreadySelectedAllObjectTypesInitially
            && props.availableObjectTypes.length > 0
            && props.selectAllObjectTypesInitially
        ) {
            props.setSelectedObjectTypes(props.availableObjectTypes);
        }
    });

    const toggleObjectType = (objectType: string) => {
        const newSelection = props.selectedObjectTypes.map((x) => x);
        const index = newSelection.indexOf(objectType);
        if (index !== -1)
            newSelection.splice(index, 1);
        else
            newSelection.push(objectType);

        if (newSelection.length > 0)
            props.setSelectedObjectTypes(newSelection);
    }

    const selectOnlyObjectType = (objectType: string) => {
        props.setSelectedObjectTypes([objectType]);
    }

    const selectAllObjectTypes = () => {
        props.setSelectedObjectTypes(props.availableObjectTypes);
    }

    const isOnlyObjectType = (objectType: string) =>
        props.selectedObjectTypes.length === 1 && props.selectedObjectTypes[0] === objectType;

    const selectionCount = props.selectedObjectTypes.length;
    const countIcon = selectionCount === 0 ? faCircle : (selectionCount === 1 ? faBox : faBoxesStacked);
    const dropdownIcon = open ? faCaretUp : faCaretDown;

    const totalNumberOfObjectTypes = props.availableObjectTypes.length;

    return (
        <div className="NOS-Container"
             onMouseLeave={() => delayedClose.execute()}
             onMouseEnter={() => delayedClose.cancel()}>
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
                    <div className="NOS-ObjectType NOS-ObjectType-SelectAll" onClick={() => selectAllObjectTypes()}>
                        Select all
                    </div>
                    {props.availableObjectTypes.map((objectType, index) => {
                        const otColor = getObjectTypeColor(totalNumberOfObjectTypes, index);
                        const onlyOT = isOnlyObjectType(objectType);
                        return (
                            <div key={`SelectionToggle-${objectType}`}
                                 onClick={() => toggleObjectType(objectType)}
                                 onDoubleClick={() => selectOnlyObjectType(objectType)}
                                 className={`NOS-ObjectType ${onlyOT ? 'NOS-ObjectType--disabled' : ''}`}
                                 title={onlyOT ? "At least one object type has to be selected at all times. Please select another object type first to unselect this object time." : ""}
                            >
                                <FontAwesomeIcon
                                    icon={props.selectedObjectTypes.includes(objectType) ? faCircleCheck : faCircle}
                                    className="NOS-ObjectType-Check" style={{color: otColor}}/>
                                {objectType}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}