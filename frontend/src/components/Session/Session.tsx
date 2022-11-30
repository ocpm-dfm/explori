import './Session.css';
import { ExploriNavbar } from '../ExploriNavbar/ExploriNavbar';
import { ObjectSelection } from '../ObjectSelection/ObjectSelection';
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../api';

export function Session(_props: any) {
    const initialSelectedFile: any = {}
    const [selectedFile, setSelectedFile] = useState(initialSelectedFile)
    const [isFileSelected, setIsFileSelected] = useState(false)
    const [fileStatus, setFileStatus] = useState("")
    const objectSelection = <ObjectSelection />

    useEffect(() => {
        setIsFileSelected('name' in selectedFile)
        if ('name' in selectedFile) {
            setFileStatus("Selected file ready to be uploaded")
        }
    }, [selectedFile])

    const handleFileSelection = async (event: any) => {
        event.preventDefault()
        setSelectedFile(event.target.files[0])
    }

    const uploadFile = async (event: any) => {
        event.preventDefault()

        const formdata = new FormData()
        formdata.append('file', selectedFile)

        const uploadFileUrl: string = API_BASE_URL.concat('/logs/upload')
        console.log(uploadFileUrl + ": " + uploadFileUrl)
        fetch(uploadFileUrl, {
            method: 'PUT',
            body: formdata
        })
            .then((response) => response.json())
            .then((result) => {
                console.log(result)
                if (result.status == "successful") {
                    setFileStatus("File uploaded!")
                }
            })

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
                    onChange={handleFileSelection} >
                </input>
                <div>{fileStatus}</div>
                <button
                    form='uploadEventLogForm'
                    disabled={!isFileSelected}
                    onClick={uploadFile} >
                    Confirm Upload
                </button>
            </form>
        </div>
    )
}