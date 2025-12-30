import React, { createContext, useContext, useState, useCallback } from 'react';
import GlobalDialog from '../components/GlobalDialog';

const DialogContext = createContext({});

export const useDialog = () => useContext(DialogContext);

export const DialogProvider = ({ children }) => {
    const [visible, setVisible] = useState(false);
    const [config, setConfig] = useState({
        title: '',
        message: '',
        actions: [],
        children: null
    });

    const showDialog = useCallback(({ title, message, actions = [], children = null }) => {
        setConfig({
            title,
            message,
            actions,
            children
        });
        setVisible(true);
    }, []);

    const hideDialog = useCallback(() => {
        setVisible(false);
    }, []);

    return (
        <DialogContext.Provider value={{ showDialog, hideDialog }}>
            {children}
            <GlobalDialog
                visible={visible}
                title={config.title}
                message={config.message}
                actions={config.actions}
                children={config.children}
                onRequestClose={hideDialog}
            />
        </DialogContext.Provider>
    );
};
