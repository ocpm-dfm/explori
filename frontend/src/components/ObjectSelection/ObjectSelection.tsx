import React, {useEffect, useState} from 'react';
import "./ObjectSelection.css";
import {StateChangeCallback} from "../../App";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {faTrash, faCheckSquare} from "@fortawesome/free-solid-svg-icons";
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputLabel from '@mui/material/InputLabel';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

type ObjectSelectionState = {
    // current state of selection component
    selectedObjectTypes: string[],
    // have we already selected all object types once at the start of visualizing a new dfm?
    selectedAllObjectTypesInitiallyAlready: boolean,
}

export const ObjectSelection = (props: {
    // all available object types in the currently visualized dfm (empty list means object types have not been determined  yet)
    objectTypes: string[],
    // callback to signal a change in selected object types (Visualization is sibling component -> need to pass information up, such that parent can pass back down to FilteredDFM)
    updateCallback: StateChangeCallback,
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

    const handleChange = (event: SelectChangeEvent<string[]>) => {
        const {
            target: { value },
        } = event;
        if (typeof value === "string") {
            setSelectedObjectTypes([value])
        } else {
            setSelectedObjectTypes(value)
        }

    };

    // all available selection options
    let objectTypeOptions: string[] = objectTypes.map((typeName) => {
        return typeName
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
    const setSelectedObjectTypes = function(selection: string[]) {
        setState((old) => Object.assign({}, old, {
            selectedObjectTypes: selection,
        }));
        updateCallback({
            selectedObjectTypes: selection.map((value) => {
                return value;
            }),
        });
    }

    const MenuProps = {
        PaperProps: {
            style: {
                //maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
                width: 100,
            },
        },
    };

    return (
        <div className="ObjectSelection">
            <Stack spacing={1} direction="row" justifyContent="flex-end">
                <FormControl size="small" sx={{ m: 1, width: 300 }}>
                    <InputLabel id="demo-multiple-name-label">Objects</InputLabel>
                    <Select
                        labelId="demo-multiple-name-label"
                        id="demo-multiple-name"
                        multiple
                        value={state.selectedObjectTypes}
                        onChange={handleChange}
                        input={<OutlinedInput label="Objects" />}
                        renderValue={(selected) => selected.join(', ')}
                        MenuProps={MenuProps}
                    >
                        {objectTypeOptions.map((name) => (
                            <MenuItem
                                key={name}
                                value={name}
                                //style={getStyles(name, personName, theme)}
                            >
                                <Checkbox checked={state.selectedObjectTypes.indexOf(name) > -1} />
                                {name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Button
                    onClick={() => {
                        setSelectedObjectTypes(objectTypes)
                    }}
                    sx={
                        { 'min-width': '0px', 'color': 'rgb(var(--color1))', 'border-color': 'rgb(var(--color1))' }
                    }
                >
                    <FontAwesomeIcon icon={faCheckSquare} />
                </Button>
                <Button
                    onClick={() => {
                        setSelectedObjectTypes([])
                    }}
                    sx={
                        {  'min-width': '0px', 'color': 'rgb(var(--color1))', 'border-color': 'rgb(var(--color1))' }
                    }
                >
                    <FontAwesomeIcon icon={faTrash} />
                </Button>
            </Stack>
        </div>
    );
}
