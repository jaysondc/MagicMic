import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '../lib/theme';

export default function GlobalDialog({
    visible,
    title,
    message,
    children,
    actions = [],
    onRequestClose
}) {
    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onRequestClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {title && <Text style={styles.modalTitle}>{title}</Text>}
                    {message && <Text style={styles.modalMessage}>{message}</Text>}

                    {children && <View style={styles.customContent}>{children}</View>}

                    {actions.length > 0 && (
                        <View style={styles.actionContainer}>
                            {actions.map((action, index) => {
                                const isDestructive = action.style === 'destructive';
                                const isCancel = action.style === 'cancel';
                                const isPrimary = !isDestructive && !isCancel;

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.button,
                                            isDestructive && styles.destructiveButton,
                                            isCancel && styles.cancelButton,
                                            action.buttonStyle
                                        ]}
                                        onPress={() => {
                                            if (action.onPress) action.onPress();
                                            if (onRequestClose && !action.preventClose) onRequestClose();
                                        }}
                                    >
                                        <Text style={[
                                            styles.buttonText,
                                            isDestructive && styles.destructiveText,
                                            isCancel && styles.cancelText,
                                            action.textStyle
                                        ]}>
                                            {action.text}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        // Add shadow for premium feel
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 12, // Reduced slightly to group with message
        textAlign: 'center'
    },
    modalMessage: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginBottom: 20,
        textAlign: 'center',
        lineHeight: 22,
    },
    customContent: {
        width: '100%',
        marginBottom: 20,
        alignItems: 'center',
    },
    actionContainer: {
        width: '100%',
        gap: 12, // Modern gap between buttons
        flexDirection: 'column', // Stack vertically for better mobile touch targets
    },
    button: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    destructiveButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.error,
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    buttonText: {
        color: '#FFFFFF', // Assuming primary is dark or vibrant
        fontWeight: 'bold',
        fontSize: 16,
    },
    destructiveText: {
        color: theme.colors.error,
    },
    cancelText: {
        color: theme.colors.text,
    }
});
