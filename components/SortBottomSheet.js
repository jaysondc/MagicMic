import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Dimensions
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../lib/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SORT_OPTIONS = [
    { id: 'created_at', label: 'Added', icon: 'calendar-outline' },
    { id: 'last_sung_date', label: 'Last Sung', icon: 'mic-outline' },
    { id: 'sing_count', label: 'Times Sung', icon: 'stats-chart-outline' },
    { id: 'my_rating', label: 'Rating', icon: 'star-outline' },
    { id: 'updated_at', label: 'Updated', icon: 'time-outline' },
    { id: 'title', label: 'Song Name', icon: 'musical-note-outline' },
    { id: 'artist', label: 'Artist Name', icon: 'person-outline' },
];

const SortBottomSheet = ({ visible, onClose, currentSortBy, onSelectSort, safeBottomPadding = 0 }) => {
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            opacity.value = withTiming(1, { duration: 200 });
            translateY.value = withTiming(0, { duration: 400 });
        } else {
            closeSheet();
        }
    }, [visible]);

    const closeSheet = () => {
        opacity.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 }, (finished) => {
            if (finished) {
                runOnJS(onClose)();
            }
        });
    };

    const handleSelect = (id) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        onSelectSort(id);
        closeSheet();
    };

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    if (!visible) return null;


    return (
        <Modal transparent visible={visible} onRequestClose={onClose} animationType="none" statusBarTranslucent>
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={closeSheet}>
                    <Animated.View style={[styles.backdrop, backdropStyle]} />
                </TouchableWithoutFeedback>

                <Animated.View style={[styles.sheet, sheetStyle, { paddingBottom: safeBottomPadding + theme.spacing.m }]}>
                    <View style={styles.handleContainer}>
                        <View style={styles.handle} />
                    </View>
                    <Text style={styles.title}>Sort By</Text>

                    {SORT_OPTIONS.map((option) => (
                        <TouchableOpacity
                            key={option.id}
                            style={[
                                styles.option,
                                currentSortBy === option.id && styles.selectedOption
                            ]}
                            onPress={() => handleSelect(option.id)}
                        >
                            <View style={styles.optionContent}>
                                <Ionicons
                                    name={option.icon}
                                    size={24}
                                    color={currentSortBy === option.id ? theme.colors.background : theme.colors.text}
                                />
                                <Text
                                    style={[
                                        styles.optionText,
                                        currentSortBy === option.id && styles.selectedOptionText
                                    ]}
                                >
                                    {option.label}
                                </Text>
                            </View>
                            {currentSortBy === option.id && (
                                <Ionicons name="checkmark" size={24} color={theme.colors.background} />
                            )}
                        </TouchableOpacity>
                    ))}
                    <View style={{ height: 20 }} />
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.l,
        borderTopRightRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        paddingBottom: theme.spacing.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    handleContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: theme.colors.textSecondary,
        borderRadius: 2,
    },
    title: {
        ...theme.textVariants.header,
        fontSize: 18,
        textAlign: 'center',
        marginBottom: theme.spacing.m,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.xs,
    },
    selectedOption: {
        backgroundColor: theme.colors.secondary,
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionText: {
        fontSize: 16,
        color: theme.colors.text,
        marginLeft: theme.spacing.m,
    },
    selectedOptionText: {
        color: theme.colors.background,
        fontWeight: 'bold',
    },
});

export default SortBottomSheet;
