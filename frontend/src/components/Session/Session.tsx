import './Session.css';
import { ExploriNavbar } from '../ExploriNavbar/ExploriNavbar';
import { ObjectSelection } from '../ObjectSelection/ObjectSelection';
import { useEffect, useState } from 'react';

export function Session(_props: any) {
    const initialSelectedFile: object[] = []
    const [selectedFile, setSelectedFile] = useState(initialSelectedFile)
    const [isFileSelected, setIsFileSelected] = useState(false)
    const objectSelection = <ObjectSelection />

    useEffect(() => {
        setIsFileSelected(
            selectedFile.length >= 1 ? true : false
        )
    }, [selectedFile])

    const handleFileSelection = async (event: any) => {
        event.preventDefault()

        setSelectedFile((oldFiles) => {
            const newFiles = event.target.files
            return [...oldFiles, ...newFiles]
        })
    }

    const uploadFile = async (event: any) => {
        event.preventDefault()
        //TODO: send files to backend 
    }

    return (
        <div className="Session">
            <ExploriNavbar lowerRowSlot={objectSelection} />
            <form id="uploadEventLogForm">
                <label htmlFor="uploadEventLog">Upload an event log:</label>
                <input
                    type="file"
                    accept=".jsonocel, .xmlocel"
                    name="uploadEventLog"
                    onChange={handleFileSelection}
                    multiple >
                </input>
                {
                    isFileSelected ?
                        <div>
                            <div>Files ready to be uploaded:</div>
                            <div>{
                                selectedFile.map((file: any, index: number) => {
                                    return (
                                        <div key={index.toString()}>
                                            {file.name}
                                        </div>
                                    )
                                })
                            }</div>
                        </div> : <div></div>
                }
                <button
                    form='uploadEventLogForm'
                    disabled={selectedFile.length >= 1 ? false : true}
                    onClick={uploadFile} >
                    Confirm Upload
                </button>
            </form>
        </div>
    )
}
