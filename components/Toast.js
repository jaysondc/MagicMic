import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
    SlideInDown,
    SlideOutDown
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { theme } from '../lib/theme';
import { Ionicons } from '@expo/vector-icons';

const Toast = ({
    visible,
    message,
    type = 'info',
    actionLabel,
    onAction,
    onDismiss
}) => {
    const translateY = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            translateY.value = withTiming(0);
        }
    }, [visible]);

    const pan = Gesture.Pan()
        .onChange((event) => {
            if (event.translationY > 0) {
                translateY.value = event.translationY;
            }
        })
        .onEnd((event) => {
            if (event.translationY > 50) {
                runOnJS(onDismiss)();
            } else {
                translateY.value = withTiming(0, { duration: 200 });
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }]
    }));

    if (!visible) return null;

    const getBorderColor = () => {
        switch (type) {
            case 'success': return theme.colors.primary;
            case 'error': return theme.colors.error;
            default: return theme.colors.secondary;
        }
    };

    const getIconName = () => {
        switch (type) {
            case 'success': return 'checkmark-circle';
            case 'error': return 'alert-circle';
            default: return 'information-circle';
        }
    };

    return (
        <GestureDetector gesture={pan}>
            <Animated.View
                entering={SlideInDown.duration(300).withInitialValues({ opacity: 0 })}
                exiting={SlideOutDown.duration(200)}
                style={[
                    styles.container,
                    animatedStyle,
                    { borderLeftColor: getBorderColor() }
                ]}
            >
                <View style={styles.content}>
                    <Ionicons
                        name={getIconName()}
                        size={24}
                        color={getBorderColor()}
                        style={styles.icon}
                    />
                    <Text style={styles.message}>{message}</Text>
                </View>
                {actionLabel && (
                    <TouchableOpacity onPress={onAction} style={styles.actionButton}>
                        <Text style={[styles.actionText, { color: getBorderColor() }]}>
                            {actionLabel}
                        </Text>
                    </TouchableOpacity>
                )}
            </Animated.View>
        </GestureDetector>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.m,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
        borderLeftWidth: 4,
        zIndex: 1000,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    icon: {
        marginRight: theme.spacing.s,
    },
    message: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    actionButton: {
        paddingLeft: theme.spacing.m,
        borderLeftWidth: 1,
        borderLeftColor: theme.colors.border,
        marginLeft: theme.spacing.m,
    },
    actionText: {
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontSize: 12,
    }
});

export default Toast;
