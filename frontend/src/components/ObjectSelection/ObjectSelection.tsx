import React from 'react';
import "./ObjectSelection.css";
import { default as ReactSelect } from "react-select";
import { components, MultiValue } from "react-select";

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

export const objectOptions = [
    { value: "INVOICE", label: "INVOICE" },
    { value: "MATERIAL", label: "MATERIAL" },
    { value: "PURCHORD", label: "PURCHORD" },
    { value: "PURCHREQ", label: "PURCHREQ" },
];

export class ObjectSelection extends React.Component<ObjectSelectionProps, ObjectSelectionState> {
   
    //TODO: maybe store object selection when going to another tab? Depends on which tabs we have

    constructor(props: any) {
        super(props);
        this.state = {
            optionSelected: null
        };
    }

    handleChange = (selected: MultiValue<any>) => {
        this.setState({
          optionSelected: selected
        });
        console.log(selected)
    };

    render() {
        return (
            <div className="ObjectSelection">
                <ReactSelect
                    options={objectOptions}
                    isMulti
                    closeMenuOnSelect={false}
                    hideSelectedOptions={false}
                    //allowSelectAll={true}
                    components={{
                        Option
                    }}
                    onChange={this.handleChange}
                    value={this.state.optionSelected}
                />
            </div>
        ); 
    }   
}

interface ObjectSelectionProps {

}

interface ObjectSelectionState {
    optionSelected: any; //needs to be any since else cant assign null
}
