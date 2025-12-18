import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Button, InteractionManager } from 'react-native';
import { theme } from '../lib/theme';
import { BackupService } from '../services/BackupService';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useToast } from '../context/ToastContext';
import { resetDatabase, seedDatabase } from '../lib/database';
import { seedData } from '../lib/seedData';
import { CommonActions } from '@react-navigation/native';

export default function SettingsScreen({ navigation }) {
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();

    const handleExport = async () => {
        setIsLoading(true);
        try {
            await BackupService.exportData();
            // Share dialog gives own feedback, but we can toast too
            showToast({ message: 'Export initiated', type: 'success' });
        } catch (error) {
            Alert.alert('Export Failed', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = async () => {
        Alert.alert(
            'Restore Backup',
            'This will OVERWRITE all current songs and tags with the backup data. This cannot be undone. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Import & Overwrite',
                    style: 'destructive',
                    onPress: async () => {
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
                            Alert.alert('Import Failed', error.message);
                        } finally {
                            setIsLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleSeed = () => {
        Alert.alert(
            'Seed Database',
            'This will reset the database and load sample data. All existing data will be lost.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Seed',
                    style: 'destructive',
                    onPress: async () => {
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
                }
            ]
        );
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
                </View>
            )}
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
});
