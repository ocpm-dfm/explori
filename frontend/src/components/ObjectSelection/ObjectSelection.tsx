import React, {useEffect} from 'react';
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

export const ObjectSelection = (props: {
    // all available object types in the currently visualized dfm (empty list means object types have not been determined  yet)
    availableObjectTypes: string[],
    // all currently selected object types (needs to be passed in at least for initialization, e.g. when restoring a session)
    selectedObjectTypes: string[],
    // should we select all object types at the start of visualizing a new dfm?
    selectAllObjectTypesInitially: boolean,
    // have we already selected all object types for this dfm?
    alreadySelectedAllObjectTypesInitially: boolean,
    setSelectedObjectTypes: (selectedObjectTypes: string[]) => void,
}) => {
    const availableObjectTypes = props.availableObjectTypes;
    const selectedObjectTypes = props.selectedObjectTypes;
    const selectAllObjectTypesInitially = props.selectAllObjectTypesInitially;
    const alreadySelectedAllObjectTypesInitially = props.alreadySelectedAllObjectTypesInitially;

    const setSelectedObjectTypes = props.setSelectedObjectTypes;

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

    // select all object types?
    useEffect(() => {
        if (
            !alreadySelectedAllObjectTypesInitially
            && availableObjectTypes.length > 0
            && selectAllObjectTypesInitially
        ) {
            setSelectedObjectTypes(availableObjectTypes);
        }
    });

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
                        value={props.selectedObjectTypes}
                        onChange={handleChange}
                        input={<OutlinedInput label="Objects" />}
                        renderValue={(selected) => selected.join(', ')}
                        MenuProps={MenuProps}
                    >
                        {availableObjectTypes.map((name) => (
                            <MenuItem
                                key={name}
                                value={name}
                                //style={getStyles(name, personName, theme)}
                            >
                                <Checkbox checked={selectedObjectTypes.indexOf(name) > -1} />
                                {name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Button
                    onClick={() => {
                        setSelectedObjectTypes(availableObjectTypes)
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