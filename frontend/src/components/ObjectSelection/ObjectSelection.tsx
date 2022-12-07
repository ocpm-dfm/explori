import React, {useEffect} from 'react';
import "./ObjectSelection.css";
import { default as ReactSelect } from "react-select";
import { components, MultiValue } from "react-select";
import {StateChangeCallback} from "../../App";


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

export const ObjectSelection = (props: {
    // all available object types in the currently visualized dfm (empty list means object types have not been determined  yet)
    availableObjectTypes: string[],
    // all currently selected object types (needs to be passed in at least for initialization, e.g. when restoring a session)
    selectedObjectTypes: string[],
    // callback to signal a change in selected object types (Visualization is sibling component -> need to pass information up, such that parent can pass back down to FilteredDFM)
    updateCallback: StateChangeCallback,
    // should we select all object types at the start of visualizing a new dfm?
    selectAllObjectTypesInitially: boolean,
    // have we already selected all object types for this dfm?
    alreadySelectedAllObjectTypesInitially: boolean,
}) => {
    const availableObjectTypes = props.availableObjectTypes;
    const selectedObjectTypes = props.selectedObjectTypes;
    const updateCallback = props.updateCallback;
    const selectAllObjectTypesInitially = props.selectAllObjectTypesInitially;
    const alreadySelectedAllObjectTypesInitially = props.alreadySelectedAllObjectTypesInitially;

    // propagate current selection state up to parent
    const setSelectedObjectTypes = function(selection: MultiValue<any>) {
        updateCallback({
            selectedObjectTypes: selection.map((value, _idx, _arr) => {
                return value.value;
            }),
        });
    }

    // all available selection options
    let availableOptions: MultiValue<any> = availableObjectTypes.map((typeName) => {
        return {
            value: typeName,
            label: typeName,
        }
    });

    // all selected selection options
    let selectedOptions:  MultiValue<any> = selectedObjectTypes.map((typeName) => {
        return {
            value: typeName,
            label: typeName,
        }
    });

    // select all object types?
    useEffect(() => {
        if (
            !alreadySelectedAllObjectTypesInitially
            && availableObjectTypes.length > 0
            && selectAllObjectTypesInitially
        ) {
            updateCallback({
                alreadySelectedAllObjectTypesInitially: true,
                selectedObjectTypes: availableObjectTypes,
            });
        }
    });

    return (
        <div className="ObjectSelection">
            <ReactSelect
                options={availableOptions}
                isMulti={true}
                closeMenuOnSelect={false}
                hideSelectedOptions={false}
                //allowSelectAll={true}
                components={{
                    Option
                }}
                onChange={setSelectedObjectTypes}
                value={selectedOptions}
            />
        </div>
    );
}
