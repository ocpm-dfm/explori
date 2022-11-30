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
    selectedObjectTypes: MultiValue<any>,
    selectedAllObjectTypesInitiallyAlready: boolean,
}

export type selectedObjectTypesUpdateCallback = (selection: string[]) => void;

export const ObjectSelection = (props: {
    objectTypes: string[],
    updateCallback: selectedObjectTypesUpdateCallback,
    selectAllObjectTypesInitially: boolean,
}) => {
    // Current assumption: Empty objectTypes list means the objectTypes haven't been determined, yet.
    const objectTypes = props.objectTypes;
    const updateCallback = props.updateCallback;
    const selectAllObjectTypesInitially = props.selectAllObjectTypesInitially;

    const [state, setState] = useState<ObjectSelectionState>({
        selectedObjectTypes: [],
        selectedAllObjectTypesInitiallyAlready: false,
    });

    let objectTypeOptions: MultiValue<any> = objectTypes.map((typeName) => {
        return {
            value: typeName,
            label: typeName,
        }
    });

    // select all object types by default
    useEffect(() => {
        if (objectTypes.length > 0 && selectAllObjectTypesInitially && !state.selectedAllObjectTypesInitiallyAlready) {
            setSelectedObjectTypes(objectTypeOptions);
            setState((old) => Object.assign({}, old, {
                selectedAllObjectTypesInitiallyAlready: true,
            }));
        }
    });

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
