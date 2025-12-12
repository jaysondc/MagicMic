import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, runOnJS } from 'react-native-reanimated';
import { theme } from '../lib/theme';

const STAR_SIZE = 40;
const MAX_RATING = 5;

const RatingWidget = ({ rating = 0, onRatingChange }) => {
    // Local state for drag preview, initialized with props
    const [displayRating, setDisplayRating] = useState(rating);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        setDisplayRating(rating);
    }, [rating]);

    const handlePan = Gesture.Pan()
        .onUpdate((event) => {
            if (containerWidth > 0) {
                // Calculate rating based on x position
                const x = Math.max(0, Math.min(event.x, containerWidth));
                const percent = x / containerWidth;
                const rawRating = percent * MAX_RATING;
                // Snap to nearest 0.5
                const snappedRating = Math.ceil(rawRating * 2) / 2;
                runOnJS(setDisplayRating)(snappedRating);
            }
        })
        .onEnd(() => {
            runOnJS(onRatingChange)(displayRating);
        });

    // Tap gesture to handle single clicks
    const handleTap = Gesture.Tap()
        .onBegin((event) => {
            if (containerWidth > 0) {
                const x = Math.max(0, Math.min(event.x, containerWidth));
                const percent = x / containerWidth;
                const rawRating = percent * MAX_RATING;
                const snappedRating = Math.ceil(rawRating * 2) / 2;
                runOnJS(setDisplayRating)(snappedRating);
            }
        })
        .onFinalize(() => {
            runOnJS(onRatingChange)(displayRating);
        });

    const composedGesture = Gesture.Simultaneous(handlePan, handleTap);

    const handleIncrement = () => {
        const newRating = Math.min(MAX_RATING, rating + 0.5);
        onRatingChange(newRating);
    };

    const handleDecrement = () => {
        const newRating = Math.max(0, rating - 0.5);
        onRatingChange(newRating);
    };

    const renderStars = () => {
        const stars = [];
        for (let i = 0; i < MAX_RATING; i++) {
            let iconName = 'star-outline';
            if (displayRating >= i + 1) {
                iconName = 'star';
            } else if (displayRating >= i + 0.5) {
                iconName = 'star-half';
            }

            stars.push(
                <Ionicons
                    key={i}
                    name={iconName}
                    size={STAR_SIZE}
                    color={theme.colors.warning} // Gold color
                    style={styles.star}
                />
            );
        }
        return stars;
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={handleDecrement} style={styles.button}>
                <Ionicons name="remove" size={24} color={theme.colors.text} />
            </TouchableOpacity>

            <GestureDetector gesture={composedGesture}>
                <View
                    style={styles.starsContainer}
                    onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
                >
                    {renderStars()}
                </View>
            </GestureDetector>

            <TouchableOpacity onPress={handleIncrement} style={styles.button}>
                <Ionicons name="add" size={24} color={theme.colors.text} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        marginVertical: theme.spacing.m,
    },
    starsContainer: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.s,
    },
    star: {
        marginHorizontal: 2,
    },
    button: {
        padding: theme.spacing.s,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.round,
        marginHorizontal: theme.spacing.s,
    }
});

export default RatingWidget;
