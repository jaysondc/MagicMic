import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet } from 'react-native';
import { addSong } from '../lib/database';
import { theme } from '../lib/theme';

const AddSongForm = ({ onSongAdded }) => {
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');

    const handleAddSong = () => {
        if (!title || !artist) return;

        addSong(title, artist);
        setTitle('');
        setArtist('');

        // Notify parent to refresh
        if (onSongAdded) onSongAdded();
    };

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                placeholder="Song Title"
                placeholderTextColor={theme.colors.textSecondary}
                value={title}
                onChangeText={setTitle}
            />
            <TextInput
                style={styles.input}
                placeholder="Artist"
                placeholderTextColor={theme.colors.textSecondary}
                value={artist}
                onChangeText={setArtist}
            />
            <Button title="Add Song" onPress={handleAddSong} color={theme.colors.primary} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.s,
        marginBottom: theme.spacing.s,
        borderRadius: theme.borderRadius.s,
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
    },
});

export default AddSongForm;
