import styles from './Test.module.css';

export const TestComponent = (props: {name: string}) => {
    return (
        <div>
          <h1 className={styles.TestHeader}>Hello {props.name}</h1>
          <h2>How are you?</h2>
        </div>
    );
}