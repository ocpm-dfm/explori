import './Session.css';
import { ObjectSelection } from '../ObjectSelection/ObjectSelection';
import { useEffect, useState } from 'react';
import { getURI } from '../../api';

export function Session(_props: any) {
    /*
    TODO: implement selectedFile, isFileSelected, fileStatus again
    FIX: disabled attribute in upload button
    */

    const compare = _props.compare
    const dataSource = _props.dataSource
    const setDataSource = _props.setDataSource
    const formatEventLogMetadata = _props.formatEventLogMetadata

    const initialSelectedFile: any = {}
    const [selectedFile, setSelectedFile] = useState(initialSelectedFile)
    //const [isFileSelected, setIsFileSelected] = useState(false)
    //const [fileStatus, setFileStatus] = useState("")
    const objectSelection = <ObjectSelection />

    useEffect(() => {
        /*
        setIsFileSelected('name' in selectedFile)
        if ('name' in selectedFile) {
            setFileStatus("Selected file ready to be uploaded")
        }
        */
    }, [selectedFile])

    const handleFileSelection = async (event: any) => {
        event.preventDefault()
        setSelectedFile(event.target.files[0])
    }

    const uploadFile = async (event: any) => {
        event.preventDefault()

        const formdata = new FormData()
        formdata.append('file', selectedFile)

        const uploadFileUrl: string = getURI('/logs/upload', {})
        console.log(uploadFileUrl + ": " + uploadFileUrl)
        fetch(uploadFileUrl, {
            method: 'PUT',
            body: formdata
        })
            .then((response) => response.json())
            .then((result) => {
                if (result.status == "successful") {
                    const eventLogMetadata = formatEventLogMetadata(result.data)
                    eventLogMetadata.id = dataSource.length + 1
                    let newDataSource = [
                        ...dataSource,
                        eventLogMetadata
                    ]
                    newDataSource = newDataSource.sort(compare)
                    setDataSource(newDataSource)
                }
            })
            .catch(err => console.log("Error in uploading ..."))

    }

    return (
        <div className="Session">
            <form id="uploadEventLogForm">
                <label htmlFor="uploadEventLog">Upload an event log:</label>
                <input
                    type="file"
                    accept=".jsonocel, .xmlocel"
                    name="uploadEventLog"
                    onChange={handleFileSelection} >
                </input>
                {
                    //FIX: <div>{fileStatus}</div>
                }
                <button
                    form='uploadEventLogForm'
                    disabled={false}
                    onClick={uploadFile} >
                    Confirm Upload
                </button>
            </form>
        </div>
    )
}