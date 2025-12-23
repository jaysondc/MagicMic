
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    interpolate,
    withDelay
} from 'react-native-reanimated';
import { theme } from '../lib/theme';

const ShimmerEffect = ({ width, height, borderRadius = 4, style, delay = 0 }) => {
    const shimmerValue = useSharedValue(0);

    useEffect(() => {
        shimmerValue.value = withDelay(
            delay,
            withRepeat(
                withTiming(1, { duration: 1000 }),
                -1, // infinite
                false // no reverse
            )
        );
    }, [delay]);

    const animatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            shimmerValue.value,
            [0, 0.5, 1],
            [0.3, 0.7, 0.3]
        );

        return {
            opacity,
        };
    });

    return (
        <View style={[styles.container, { width, height, borderRadius }, style]}>
            <Animated.View style={[styles.shimmer, animatedStyle]} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.border, // Use border color as base for the skeleton
        overflow: 'hidden',
    },
    shimmer: {
        flex: 1,
        backgroundColor: theme.colors.surface, // Shimmer pulse color
    },
});

export default ShimmerEffect;
