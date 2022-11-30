import React, {useEffect, useState} from 'react';
import "./ObjectSelection.css";
import { default as ReactSelect } from "react-select";
import { components, MultiValue } from "react-select";


/* TODO:
    - [ ] store object selection when switching tabs (currently not clear how tabs will work exactly, keep this for later for now)
 */

const Option = (props: any) => {
    return (
      <div>
        <components.Option {...props}>
          <input
            type="checkbox"
            checked={props.isSelected}
            onChange={() => null}
          />{" "}
          <label>{props.label}</label>
        </components.Option>
      </div>
    );
};

type ObjectSelectionState = {
    // current state of selection component
    selectedObjectTypes: MultiValue<any>,
    // have we already selected all object types once at the start of visualizing a new dfm?
    selectedAllObjectTypesInitiallyAlready: boolean,
}

export type selectedObjectTypesUpdateCallback = (selection: string[]) => void;

export const ObjectSelection = (props: {
    // all available object types in the currently visualized dfm (empty list means object types have not been determined  yet)
    objectTypes: string[],
    // callback to signal a change in selected object types (Visualization is sibling component -> need to pass information up, such that parent can pass back down to FilteredDFM)
    updateCallback: selectedObjectTypesUpdateCallback,
    // should we select all object types at the start of visualizing a new dfm?
    selectAllObjectTypesInitially: boolean,
}) => {
    const objectTypes = props.objectTypes;
    const updateCallback = props.updateCallback;
    const selectAllObjectTypesInitially = props.selectAllObjectTypesInitially;

    const [state, setState] = useState<ObjectSelectionState>({
        selectedObjectTypes: [],
        selectedAllObjectTypesInitiallyAlready: false,
    });

    // all available selection options
    let objectTypeOptions: MultiValue<any> = objectTypes.map((typeName) => {
        return {
            value: typeName,
            label: typeName,
        }
    });

    // select all object types?
    useEffect(() => {
        if (objectTypes.length > 0 && selectAllObjectTypesInitially && !state.selectedAllObjectTypesInitiallyAlready) {
            setSelectedObjectTypes(objectTypeOptions);
            setState((old) => Object.assign({}, old, {
                selectedAllObjectTypesInitiallyAlready: true,
            }));
        }
    });

    // update current selection state and pass information up to parent
    const setSelectedObjectTypes = function(selection: MultiValue<any>) {
        setState((old) => Object.assign({}, old, {
            selectedObjectTypes: selection,
        }));
        updateCallback(selection.map((value, _idx, _arr) => {
            return value.value;
        }));
    }

    return (
        <div className="ObjectSelection">
            <ReactSelect
                options={objectTypeOptions}
                isMulti={true}
                closeMenuOnSelect={false}
                hideSelectedOptions={false}
                //allowSelectAll={true}
                components={{
                    Option
                }}
                onChange={setSelectedObjectTypes}
                value={state.selectedObjectTypes}
            />
        </div>
    );
}
