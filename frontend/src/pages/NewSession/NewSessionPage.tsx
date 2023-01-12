import {DefaultLayout} from "../../components/DefaultLayout/DefaultLayout";
import {EventLogList} from "../../components/EventLogList/EventLogList";
import {useNavigate} from "react-router-dom";


type NewSessionProps = {
    switchOcelCallback: (newOcel: string) => Promise<void>
}

export const NewSessionPage = (props: NewSessionProps) => {
    const navigateTo = useNavigate();

    const switchOcels = async (newOcel: string) => {
        await props.switchOcelCallback(newOcel);
        navigateTo("/");
    }

    return (
        <DefaultLayout>
            <h1>Start a new session</h1>
            <EventLogList onSelect={switchOcels} selectText="Start new session" />
        </DefaultLayout>)
}