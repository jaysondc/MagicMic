import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Button, InteractionManager, TouchableOpacity } from 'react-native';
import { theme } from '../lib/theme';
import { BackupService } from '../services/BackupService';
import * as Haptics from 'expo-haptics';
import { useToast } from '../context/ToastContext';
import { resetDatabase, seedDatabase } from '../lib/database';
import { seedData } from '../lib/seedData';
import { CommonActions } from '@react-navigation/native';
import { getSongs, updateSong } from '../lib/database';
import { findSongMetadata } from '../lib/itunes';
import { fetchLyrics } from '../lib/lyrics';
import * as FileSystem from 'expo-file-system';
import { Modal } from 'react-native';

import { useCachePopulation } from '../hooks/useCachePopulation';
import { useDialog } from '../context/DialogContext';

export default function SettingsScreen({ navigation }) {
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();

    const { showDialog } = useDialog();
    const {
        progress: cacheProgress,
        startCachePopulation,
        cancelCachePopulation: handleCancelCache,
        hideProgressModal
    } = useCachePopulation();

    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };
    const handleExport = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsLoading(true);
        try {
            await BackupService.exportData();
            // Share dialog gives own feedback, but we can toast too
            showToast({ message: 'Export initiated', type: 'success' });
        } catch (error) {
            showDialog({
                title: 'Export Failed',
                message: error.message,
                actions: [{ text: 'OK', style: 'cancel' }]
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = async () => {
        showDialog({
            title: 'Restore Backup',
            message: 'This will OVERWRITE all current songs and tags with the backup data. This cannot be undone. Are you sure?',
            actions: [
                {
                    text: 'Import & Overwrite',
                    style: 'destructive',
                    onPress: async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                        setIsLoading(true);
                        try {
                            const success = await BackupService.importData();
                            if (success) {
                                showToast({ message: 'Restore successful!', type: 'success' });
                                // Reset navigation to force full reload of Home
                                navigation.dispatch(
                                    CommonActions.reset({
                                        index: 0,
                                        routes: [{ name: 'Home', params: { refresh: Date.now() } }],
                                    })
                                );
                            }
                        } catch (error) {
                            showDialog({
                                title: 'Import Failed',
                                message: error.message,
                                actions: [{ text: 'OK', style: 'cancel' }]
                            });
                        } finally {
                            setIsLoading(false);
                        }
                    },
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        });
    };

    const handleSeed = () => {
        showDialog({
            title: 'Seed Database',
            message: 'This will reset the database and load sample data. All existing data will be lost.',
            actions: [
                {
                    text: 'Seed',
                    style: 'destructive',
                    onPress: async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                        setIsLoading(true);
                        try {
                            await resetDatabase();
                            await seedDatabase(seedData);
                            showToast({ message: 'Database seeded successfully!', type: 'success' });

                            InteractionManager.runAfterInteractions(() => {
                                navigation.dispatch(
                                    CommonActions.reset({
                                        index: 0,
                                        routes: [{ name: 'Home', params: { refresh: Date.now() } }],
                                    })
                                );
                            });
                        } catch (error) {
                            showToast({ message: 'Error seeding database', type: 'error' });
                        } finally {
                            setIsLoading(false);
                        }
                    }
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        });
    };
    const handlePopulateCache = async () => {
        showDialog({
            title: 'Populate Cache',
            message: 'This will search for missing metadata (art, lyrics) and download song previews for ALL songs. This may consume data. Continue?',
            actions: [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Start',
                    onPress: () => {
                        startCachePopulation((cancelled, totalBytes) => {
                            if (cancelled) {
                                showToast({ message: `Cancelled. Used ${formatBytes(totalBytes)}`, type: 'info' });
                            } else {
                                showToast({ message: `Cache populated! Used ${formatBytes(totalBytes)}`, type: 'success' });
                            }

                            // Close modal after a delay
                            setTimeout(() => {
                                hideProgressModal();
                            }, 1000);
                        });
                    }
                }
            ]
        });
    };

    return (
        <View style={styles.container}>
            {isLoading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} />
            ) : (
                <View style={styles.buttonContainer}>
                    <Text style={styles.sectionTitle}>Backup</Text>
                    <TouchableOpacity style={styles.button} onPress={handleExport}>
                        <Text style={styles.buttonText}>Export Backup</Text>
                        <Text style={styles.buttonSubtext}>Save your library to a file</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleImport}>
                        <Text style={styles.buttonText}>Import Backup</Text>
                        <Text style={styles.buttonSubtext}>Restore from file (Overwrites data)</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>Development</Text>
                    <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleSeed}>
                        <Text style={styles.buttonText}>Seed Database</Text>
                        <Text style={styles.buttonSubtext}>Reset and load sample data</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.button} onPress={handlePopulateCache}>
                        <Text style={styles.buttonText}>Populate Cache</Text>
                        <Text style={styles.buttonSubtext}>Fetch metadata and download previews</Text>
                    </TouchableOpacity>
                </View>
            )}


            <Modal
                visible={cacheProgress.visible}
                transparent={true}
                animationType="fade"
                onRequestClose={handleCancelCache}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Populating Cache</Text>

                        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.modalSpinner} />

                        <Text style={styles.progressText}>
                            Processing: {cacheProgress.current} / {cacheProgress.total}
                        </Text>
                        <Text style={styles.currentSongText} numberOfLines={1}>
                            {cacheProgress.currentSongName}
                        </Text>

                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${cacheProgress.total ? (cacheProgress.current / cacheProgress.total) * 100 : 0}%` }
                                ]}
                            />
                        </View>

                        <TouchableOpacity style={styles.modalCancelButton} onPress={handleCancelCache}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
        marginTop: 20,
        marginBottom: 10,
    },
    buttonContainer: {
        gap: 12,
    },
    button: {
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    dangerButton: {
        borderColor: theme.colors.error,
        borderWidth: 1,
    },
    secondaryButton: {
        borderColor: theme.colors.secondary,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    buttonSubtext: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: 10,
    },
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
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 20
    },
    modalSpinner: {
        marginBottom: 20
    },
    progressText: {
        fontSize: 16,
        color: theme.colors.text,
        marginBottom: 8,
        fontWeight: '600'
    },
    currentSongText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 20,
        textAlign: 'center'
    },
    progressBar: {
        width: '100%',
        height: 8,
        backgroundColor: theme.colors.background,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 16
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
    },
    dataText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontVariant: ['tabular-nums'],
        marginBottom: 20
    },
    modalCancelButton: {
        paddingVertical: 12,
        paddingHorizontal: 25,
        backgroundColor: theme.colors.error, // Solid red
        borderRadius: 25,
        marginTop: 10
    },
    modalCancelText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16
    }
});
