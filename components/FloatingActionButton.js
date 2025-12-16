import React, { useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, Animated, Keyboard, Platform } from 'react-native';
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

    useEffect(() => {
        let targetValue = 0;

        if (isToastVisible) {
            targetValue = toastOffset;
        }

        Animated.spring(animation, {
            toValue: targetValue,
            useNativeDriver: false, // false because we animate layout property 'bottom' (or we can use transform: translateY which allows native driver)
            // transforming translateY is better for performance.
            // Let's use translateY. 
            // 0 means default position. negative means moving UP.
        }).start();

    }, [isToastVisible]);

    // For keyboard, we might want a separate listener or combine. 
    // Usually FABs hide or move up above keyboard. 
    // Let's move it up.
    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const onShow = (e) => {
            // If keyboard shows, we usually want to move it ABOVE the keyboard.
            // But simpler might be to just let it sit, or hide it. 
            // Request: "moves up and down based on ... keyboard position"
            // Keyboard height e.endCoordinates.height

            // We need to animate to (keyboardHeight - insets.bottom). 
            // But 'animation' shared value is currently used for toast offset.
            // We should sum them or simple take the max?
            // If keyboard is open, toast is likely on top of keyboard? 
            // React Native Toasts usually sit above keyboard if configured, but our custom toast is absolute bottom.
            // Our Toast is bottom: 40.

            Animated.spring(animation, {
                toValue: e.endCoordinates.height,
                useNativeDriver: false
            }).start();
        };

        const onHide = () => {
            // Return to toast state
            Animated.spring(animation, {
                toValue: isToastVisible ? toastOffset : 0,
                useNativeDriver: false
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
