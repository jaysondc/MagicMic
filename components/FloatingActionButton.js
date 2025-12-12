import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../lib/theme';

const FloatingActionButton = ({ onPress }) => {
    const insets = useSafeAreaInsets();

    return (
        <TouchableOpacity
            style={[styles.button, { bottom: 30 + insets.bottom }]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <MaterialCommunityIcons name="music-note-plus" size={30} color={theme.colors.background} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        position: 'absolute',
        right: theme.spacing.xl,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: theme.colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        zIndex: 999,
    }
});

export default FloatingActionButton;
