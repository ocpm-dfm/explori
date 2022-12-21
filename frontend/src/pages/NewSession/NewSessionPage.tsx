import {DefaultLayout} from "../../components/DefaultLayout/DefaultLayout";
import {EventLogList} from "../../components/EventLogList/EventLogList";


type NewSessionProps = {
    switchOcelCallback: (newOcel: string) => Promise<void>
}

export const NewSessionPage = (props: NewSessionProps) => {

    return (
        <DefaultLayout>
            <h1>Start a new session</h1>
            <EventLogList switchOcelsCallback={props.switchOcelCallback} />
        </DefaultLayout>)
}