import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface ConfigChange {
    configType: 'feature_flags' | 'beta_features';
    action: 'create' | 'update' | 'delete' | 'rollback';
    description: string;
    author: string;
    previousData?: any;
    currentData: any;
}

// Save a configuration snapshot
export const saveConfigSnapshot = async (change: ConfigChange) => {
    try {
        const snapshotId = `${change.configType}_${Date.now()}`;
        const timestamp = new Date().toISOString();

        const changes = calculateChanges(change.previousData, change.currentData, change.configType);

        const snapshot = {
            id: snapshotId,
            timestamp,
            author: change.author,
            configType: change.configType,
            action: change.action,
            description: change.description,
            previousSnapshot: change.previousData,
            currentSnapshot: change.currentData,
            changes
        };

        // Save to history collection
        await updateDoc(doc(db, 'config_versions', 'history'), {
            [`snapshots.${snapshotId}`]: snapshot
        });

        return snapshot;
    } catch (error) {
        console.error('Failed to save config snapshot:', error);
        throw error;
    }
};

// Calculate changes between two config states
const calculateChanges = (previous: any, current: any, configType: string) => {
    const changes = {
        added: [] as string[],
        modified: {} as { [key: string]: { old: any; new: any } },
        removed: [] as string[]
    };

    // Extract the actual data based on config type
    const prevData = configType === 'feature_flags' ?
        (previous?.flags || previous) : previous;
    const currData = configType === 'feature_flags' ?
        (current?.flags || current) : current;

    if (!prevData) {
        // If no previous data, everything is added
        Object.keys(currData || {}).forEach(key => {
            if (key !== 'metadata') { // Skip metadata field
                changes.added.push(key);
            }
        });
        return changes;
    }

    // Check for added and modified
    Object.keys(currData || {}).forEach(key => {
        if (key === 'metadata') return; // Skip metadata

        if (!(key in prevData)) {
            changes.added.push(key);
        } else if (JSON.stringify(prevData[key]) !== JSON.stringify(currData[key])) {
            changes.modified[key] = {
                old: prevData[key],
                new: currData[key]
            };
        }
    });

    // Check for removed
    Object.keys(prevData || {}).forEach(key => {
        if (key === 'metadata') return; // Skip metadata

        if (!(key in (currData || {}))) {
            changes.removed.push(key);
        }
    });

    return changes;
};

// Get current configuration data
export const getCurrentConfig = async (configType: 'feature_flags' | 'beta_features') => {
    try {
        const docName = configType === 'feature_flags' ? 'feature_flags' : 'beta_users';
        const docSnap = await getDoc(doc(db, 'android_config', docName));

        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    } catch (error) {
        console.error(`Failed to get current ${configType}:`, error);
        return null;
    }
};

// Helper to create snapshot before making changes
export const createSnapshotBeforeChange = async (
    configType: 'feature_flags' | 'beta_features',
    description: string,
    author: string
) => {
    const currentData = await getCurrentConfig(configType);

    return {
        configType,
        action: 'update' as const,
        description,
        author,
        previousData: currentData,
        // currentData will be set after the change is made
    };
};