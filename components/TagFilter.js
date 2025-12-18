import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Platform,
    UIManager,
    TextInput,
    Alert
} from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { theme } from '../lib/theme';
import { addTag } from '../lib/database';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const TagFilter = ({ tags, selectedTags, onToggleTag, onDeleteTag, onTagsChanged, sortLabel, onSortPress }) => {
    const [expanded, setExpanded] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newTagName, setNewTagName] = useState('');

    const toggleExpand = () => {
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

    const handleLongPress = (tag) => {
        if (!onDeleteTag) return;

        Alert.alert(
            "Delete Tag",
            `Are you sure you want to delete "${tag.name}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => onDeleteTag(tag.id)
                }
            ]
        );
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
                onLongPress={() => handleLongPress(tag)}
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

    const showSort = !!onSortPress;

    const renderSortChip = () => (
        <TouchableOpacity
            style={[styles.sortChip, expanded && styles.sortChipExpanded]}
            onPress={onSortPress}
        >
            <Text style={styles.sortChipText}>{sortLabel || 'Sort'}</Text>
            <Ionicons name="filter" size={12} color={theme.colors.background} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
    );

    return (
        <Animated.View layout={LinearTransition} style={styles.container}>
            {expanded ? (
                <View style={[styles.grid, styles.contentPadding]}>
                    {showSort && renderSortChip()}
                    {tags.map(renderTag)}
                    {renderAddTag()}
                </View>
            ) : (
                <View style={[styles.contentRow, styles.contentPadding]}>
                    {showSort && (
                        <>
                            {renderSortChip()}
                            <View style={styles.separator} />
                        </>
                    )}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
                        {tags.map(renderTag)}
                        {renderAddTag()}
                    </ScrollView>
                </View>
            )}

            <TouchableOpacity onPress={toggleExpand} style={styles.expandButton}>
                <Ionicons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={theme.colors.text}
                />
            </TouchableOpacity>
        </Animated.View>
    );
};


const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.background,
        position: 'relative',
    },
    label: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        textTransform: 'uppercase',
    },
    expandButton: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        zIndex: 10,
    },
    contentPadding: {
        paddingRight: theme.spacing.xl + theme.spacing.s, // Make room for the button
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    separator: {
        width: 8,
    },
    sortChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.secondary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.round,
        height: 32,
    },
    sortChipExpanded: {
        marginRight: 8,
        marginBottom: 8,
    },
    sortChipText: {
        color: theme.colors.background,
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    scroll: {
        flex: 1,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    chip: {
        borderWidth: 1,
        borderRadius: theme.borderRadius.round,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
        marginBottom: 8,
        minWidth: 40,
        height: 32,
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
