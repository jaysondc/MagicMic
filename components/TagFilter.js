import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    LayoutAnimation,
    Platform,
    UIManager,
    TextInput
} from 'react-native';
import { theme } from '../lib/theme';
import { addTag } from '../lib/database';

if (Platform.OS === 'android') {
    // Android specific configs
}

const TagFilter = ({ tags, selectedTags, onToggleTag, onTagsChanged }) => {
    const [expanded, setExpanded] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newTagName, setNewTagName] = useState('');

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    };

    const handleAddTag = () => {
        if (!newTagName.trim()) {
            setIsAdding(false);
            return;
        }

        // Generate a random neon color
        const colors = [theme.colors.primary, theme.colors.secondary, '#FFFF00', '#00FF00', '#FFA500'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        addTag(newTagName.trim(), color);
        setNewTagName('');
        setIsAdding(false);
        if (onTagsChanged) onTagsChanged();
    };

    const renderTag = (tag) => {
        const isSelected = selectedTags.includes(tag.id);
        return (
            <TouchableOpacity
                key={tag.id}
                style={[
                    styles.chip,
                    { borderColor: tag.color },
                    isSelected && { backgroundColor: tag.color }
                ]}
                onPress={() => onToggleTag(tag.id)}
            >
                <Text style={[
                    styles.chipText,
                    { color: isSelected ? '#000' : tag.color }
                ]}>
                    {tag.name}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderAddTag = () => {
        if (isAdding) {
            return (
                <View style={[styles.chip, styles.addChipInput]}>
                    <TextInput
                        style={styles.input}
                        value={newTagName}
                        onChangeText={setNewTagName}
                        placeholder="Tag name"
                        placeholderTextColor={theme.colors.textSecondary}
                        autoFocus={true}
                        onSubmitEditing={handleAddTag}
                        onBlur={handleAddTag}
                    />
                </View>
            );
        }
        return (
            <TouchableOpacity
                style={[styles.chip, styles.addChip]}
                onPress={() => setIsAdding(true)}
            >
                <Text style={styles.addChipText}>+ Add</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={toggleExpand}>
                    <Text style={styles.expandText}>{expanded ? 'Collapse ▲' : 'Expand ▼'}</Text>
                </TouchableOpacity>
            </View>

            {expanded ? (
                <View style={styles.grid}>
                    {tags.map(renderTag)}
                    {renderAddTag()}
                </View>
            ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
                    {tags.map(renderTag)}
                    {renderAddTag()}
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {

        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: theme.spacing.m,
        marginBottom: theme.spacing.s,
    },
    label: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        textTransform: 'uppercase',
    },
    expandText: {
        color: theme.colors.secondary,
        fontSize: 12,
    },
    scroll: {
        paddingHorizontal: theme.spacing.m,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: theme.spacing.m,
    },
    chip: {
        borderWidth: 1,
        borderRadius: theme.borderRadius.round,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
        marginBottom: 8,
        minWidth: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipText: {
        fontSize: 14,
        fontWeight: '600',
    },
    addChip: {
        borderColor: theme.colors.textSecondary,
        borderStyle: 'dashed',
    },
    addChipText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    addChipInput: {
        borderColor: theme.colors.primary,
        paddingVertical: 0,
        minWidth: 80,
    },
    input: {
        color: theme.colors.text,
        fontSize: 14,
        padding: 4,
        minWidth: 60,
    },
});

export default TagFilter;
