import React, { useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, Animated, Keyboard, Platform, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../lib/theme';
import { useToast } from '../context/ToastContext';

const FloatingActionButton = ({ onPress }) => {
    const insets = useSafeAreaInsets();
    const { isToastVisible } = useToast();

    // Base position
    const baseBottom = 30 + insets.bottom;
    const toastOffset = 70; // Height of toast + extra spacing

    const animation = useRef(new Animated.Value(0)).current;

    const animationConfig = {
        duration: 250,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false // using false as it interacts with layout-related interpolation sometimes, though translateY is native-safe.
    };

    useEffect(() => {
        let targetValue = 0;

        if (isToastVisible) {
            targetValue = toastOffset;
        }

        Animated.timing(animation, {
            ...animationConfig,
            toValue: targetValue,
        }).start();

    }, [isToastVisible]);

    // For keyboard, we might want a separate listener or combine. 
    // Usually FABs hide or move up above keyboard. 
    // Let's move it up.
    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const onShow = (e) => {
            Animated.timing(animation, {
                ...animationConfig,
                toValue: e.endCoordinates.height,
            }).start();
        };

        const onHide = () => {
            // Return to toast state
            Animated.timing(animation, {
                ...animationConfig,
                toValue: isToastVisible ? toastOffset : 0,
            }).start();
        };

        const showSubscription = Keyboard.addListener(showEvent, onShow);
        const hideSubscription = Keyboard.addListener(hideEvent, onHide);

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, [isToastVisible]);


    return (
        <Animated.View
            style={[
                styles.container,
                {
                    bottom: baseBottom,
                    transform: [{
                        translateY: animation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -1] // Invert because positive translateY implies down, we want up (negative), but logic above used positive payload.
                            // Actually, let's keep logic simple. offset is 70 (pixels). 
                            // If we use translateY, we want -70 to move UP.
                            // So input 70 -> output -70.
                        })
                    }]
                }
            ]}
        >
            <TouchableOpacity
                style={styles.button}
                onPress={onPress}
                activeOpacity={0.8}
            >
                <MaterialCommunityIcons name="music-note-plus" size={30} color={theme.colors.background} />
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: theme.spacing.xl,
        zIndex: 999,
    },
    button: {
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
    }
});

export default FloatingActionButton;
