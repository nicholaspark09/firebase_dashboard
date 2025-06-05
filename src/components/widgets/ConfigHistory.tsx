import {
    Add as AddIcon,
    CompareArrows,
    Difference,
    Edit as EditIcon,
    Flag,
    Group,
    History,
    Person,
    Remove as RemoveIcon,
    Restore,
    Schedule
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Tooltip,
    Typography
} from '@mui/material';
import {
    doc,
    onSnapshot,
    setDoc,
    updateDoc
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

interface ConfigSnapshot {
    id: string;
    timestamp: string;
    author: string;
    configType: 'feature_flags' | 'beta_features';
    action: 'create' | 'update' | 'delete' | 'rollback';
    description: string;
    previousSnapshot?: any;
    currentSnapshot: any;
    changes: {
        added: string[];
        modified: { [key: string]: { old: any; new: any } };
        removed: string[];
    };
}

interface ConfigDiff {
    key: string;
    type: 'added' | 'removed' | 'modified' | 'unchanged';
    oldValue?: any;
    newValue?: any;
}

const ConfigHistory: React.FC = () => {
    const [snapshots, setSnapshots] = useState<ConfigSnapshot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Dialog states
    const [diffDialog, setDiffDialog] = useState(false);
    const [selectedSnapshot, setSelectedSnapshot] = useState<ConfigSnapshot | null>(null);

    // Current configs for comparison
    const [currentFeatureFlags, setCurrentFeatureFlags] = useState<any>({});
    const [currentBetaFeatures, setCurrentBetaFeatures] = useState<any>({});

    const { currentUser } = useAuth();

    useEffect(() => {
        // Listen to config history
        const historyUnsubscribe = onSnapshot(
            doc(db, 'config_versions', 'history'),
            (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    const snapshotList = Object.values(data.snapshots || {}) as ConfigSnapshot[];
                    setSnapshots(
                        snapshotList.sort((a, b) =>
                            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                        )
                    );
                }
                setLoading(false);
            },
            (error) => {
                setError('Failed to load config history: ' + error.message);
                setLoading(false);
            }
        );

        // Listen to current feature flags
        const flagsUnsubscribe = onSnapshot(
            doc(db, 'android_config', 'feature_flags'),
            (doc) => {
                if (doc.exists()) {
                    setCurrentFeatureFlags(doc.data());
                }
            }
        );

        // Listen to current beta features
        const betaUnsubscribe = onSnapshot(
            doc(db, 'android_config', 'beta_users'),
            (doc) => {
                if (doc.exists()) {
                    setCurrentBetaFeatures(doc.data());
                }
            }
        );

        return () => {
            historyUnsubscribe();
            flagsUnsubscribe();
            betaUnsubscribe();
        };
    }, []);

    // Helper function to save snapshot
    const saveSnapshot = async (
        configType: 'feature_flags' | 'beta_features',
        action: string,
        description: string,
        previousData: any,
        currentData: any
    ) => {
        try {
            const snapshotId = `${configType}_${Date.now()}`;
            const timestamp = new Date().toISOString();
            const author = currentUser?.email || 'Unknown';

            const changes = calculateChanges(previousData, currentData, configType);

            const snapshot: ConfigSnapshot = {
                id: snapshotId,
                timestamp,
                author,
                configType,
                action: action as any,
                description,
                previousSnapshot: previousData,
                currentSnapshot: currentData,
                changes
            };

            await updateDoc(doc(db, 'config_versions', 'history'), {
                [`snapshots.${snapshotId}`]: snapshot
            });

        } catch (error) {
            console.error('Failed to save snapshot:', error);
        }
    };

    // Calculate changes between snapshots
    const calculateChanges = (previous: any, current: any, configType: string) => {
        const changes = {
            added: [] as string[],
            modified: {} as { [key: string]: { old: any; new: any } },
            removed: [] as string[]
        };

        const prevData = configType === 'feature_flags' ? previous?.flags || previous : previous;
        const currData = configType === 'feature_flags' ? current?.flags || current : current;

        if (!prevData) {
            // If no previous data, everything is added
            Object.keys(currData || {}).forEach(key => {
                changes.added.push(key);
            });
            return changes;
        }

        // Check for added and modified
        Object.keys(currData || {}).forEach(key => {
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
            if (!(key in (currData || {}))) {
                changes.removed.push(key);
            }
        });

        return changes;
    };

    // Generate diff for display
    const generateDiff = (snapshot: ConfigSnapshot): ConfigDiff[] => {
        const diffs: ConfigDiff[] = [];

        // Added items
        snapshot.changes.added.forEach(key => {
            diffs.push({
                key,
                type: 'added',
                newValue: snapshot.currentSnapshot?.flags?.[key] || snapshot.currentSnapshot?.[key]
            });
        });

        // Modified items
        Object.entries(snapshot.changes.modified).forEach(([key, change]) => {
            diffs.push({
                key,
                type: 'modified',
                oldValue: change.old,
                newValue: change.new
            });
        });

        // Removed items
        snapshot.changes.removed.forEach(key => {
            diffs.push({
                key,
                type: 'removed',
                oldValue: snapshot.previousSnapshot?.flags?.[key] || snapshot.previousSnapshot?.[key]
            });
        });

        return diffs.sort((a, b) => a.key.localeCompare(b.key));
    };

    // Rollback to a specific snapshot
    const handleRollback = async (snapshot: ConfigSnapshot) => {
        if (!window.confirm(`Rollback ${snapshot.configType} to version from ${new Date(snapshot.timestamp).toLocaleString()}?`)) {
            return;
        }

        try {
            setError('');

            const docRef = doc(db, 'android_config',
                snapshot.configType === 'feature_flags' ? 'feature_flags' : 'beta_users'
            );

            // Get current data for snapshot before rollback
            const currentData = snapshot.configType === 'feature_flags'
                ? currentFeatureFlags
                : currentBetaFeatures;

            // Perform rollback
            await setDoc(docRef, snapshot.currentSnapshot);

            // Save rollback snapshot
            await saveSnapshot(
                snapshot.configType,
                'rollback',
                `Rolled back to ${new Date(snapshot.timestamp).toLocaleString()}`,
                currentData,
                snapshot.currentSnapshot
            );

            setSuccess(`Successfully rolled back ${snapshot.configType} to previous version`);
        } catch (error: any) {
            setError('Failed to rollback: ' + error.message);
        }
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const openDiffDialog = (snapshot: ConfigSnapshot) => {
        setSelectedSnapshot(snapshot);
        setDiffDialog(true);
    };

    const formatValue = (value: any): string => {
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (typeof value === 'string') return value;
        if (Array.isArray(value)) return value.join(', ');
        return JSON.stringify(value);
    };

    const getChangeIcon = (type: string) => {
        switch (type) {
            case 'added': return <AddIcon color="success" />;
            case 'removed': return <RemoveIcon color="error" />;
            case 'modified': return <EditIcon color="warning" />;
            default: return <EditIcon />;
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'create': return 'success';
            case 'update': return 'primary';
            case 'delete': return 'error';
            case 'rollback': return 'warning';
            default: return 'default';
        }
    };

    const paginatedSnapshots = snapshots.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    if (loading) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6">Loading Configuration History...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <History color="primary" />
                    Configuration History
                </Typography>
                <Chip
                    label={`${snapshots.length} Changes`}
                    size="small"
                    color="primary"
                    variant="outlined"
                />
            </Box>

            {/* Alerts */}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            {/* History Table */}
            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: 440 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        Timestamp
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        Config Type
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        Action
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        Author
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        Description
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        Changes
                                    </Typography>
                                </TableCell>
                                <TableCell align="center">
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        Actions
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedSnapshots.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                                        <Typography color="text.secondary">
                                            No configuration changes recorded yet.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedSnapshots.map((snapshot) => (
                                    <TableRow key={snapshot.id} hover>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Schedule fontSize="small" color="action" />
                                                <Typography variant="caption">
                                                    {new Date(snapshot.timestamp).toLocaleString()}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={snapshot.configType === 'feature_flags' ? <Flag /> : <Group />}
                                                label={snapshot.configType === 'feature_flags' ? 'Feature Flags' : 'Beta Features'}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={snapshot.action}
                                                size="small"
                                                color={getActionColor(snapshot.action) as any}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Person fontSize="small" color="action" />
                                                <Typography variant="body2">{snapshot.author}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{snapshot.description}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                {snapshot.changes.added.length > 0 && (
                                                    <Chip label={`+${snapshot.changes.added.length}`} size="small" color="success" />
                                                )}
                                                {Object.keys(snapshot.changes.modified).length > 0 && (
                                                    <Chip label={`~${Object.keys(snapshot.changes.modified).length}`} size="small" color="warning" />
                                                )}
                                                {snapshot.changes.removed.length > 0 && (
                                                    <Chip label={`-${snapshot.changes.removed.length}`} size="small" color="error" />
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                <Tooltip title="View Changes">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => openDiffDialog(snapshot)}
                                                    >
                                                        <Difference fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Rollback">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleRollback(snapshot)}
                                                        color="warning"
                                                    >
                                                        <Restore fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {snapshots.length > 0 && (
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={snapshots.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                )}
            </Paper>

            {/* Diff Dialog */}
            <Dialog open={diffDialog} onClose={() => setDiffDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CompareArrows />
                    Configuration Changes
                    {selectedSnapshot && (
                        <Chip
                            label={new Date(selectedSnapshot.timestamp).toLocaleString()}
                            size="small"
                            variant="outlined"
                        />
                    )}
                </DialogTitle>
                <DialogContent>
                    {selectedSnapshot && (
                        <Box>
                            {/* Summary */}
                            <Card sx={{ mb: 2 }}>
                                <CardContent>
                                    <Grid container spacing={2}>
                                        <Grid>
                                            <Typography variant="subtitle2" gutterBottom>Config Type</Typography>
                                            <Chip
                                                icon={selectedSnapshot.configType === 'feature_flags' ? <Flag /> : <Group />}
                                                label={selectedSnapshot.configType === 'feature_flags' ? 'Feature Flags' : 'Beta Features'}
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid>
                                            <Typography variant="subtitle2" gutterBottom>Action</Typography>
                                            <Chip
                                                label={selectedSnapshot.action}
                                                size="small"
                                                color={getActionColor(selectedSnapshot.action) as any}
                                            />
                                        </Grid>
                                        <Grid>
                                            <Typography variant="subtitle2" gutterBottom>Author</Typography>
                                            <Typography variant="body2">{selectedSnapshot.author}</Typography>
                                        </Grid>
                                        <Grid>
                                            <Typography variant="subtitle2" gutterBottom>Description</Typography>
                                            <Typography variant="body2">{selectedSnapshot.description}</Typography>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>

                            {/* Changes */}
                            <Typography variant="h6" gutterBottom>Changes</Typography>
                            <List dense>
                                {generateDiff(selectedSnapshot).map((diff, index) => (
                                    <ListItem key={index} sx={{
                                        bgcolor: diff.type === 'added' ? 'success.light' :
                                            diff.type === 'removed' ? 'error.light' :
                                                diff.type === 'modified' ? 'warning.light' : 'transparent',
                                        borderRadius: 1,
                                        mb: 1,
                                        opacity: diff.type === 'added' ? 0.1 : diff.type === 'removed' ? 0.1 : diff.type === 'modified' ? 0.1 : 1
                                    }}>
                                        <ListItemIcon>
                                            {getChangeIcon(diff.type)}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="body2" fontWeight="medium" sx={{ fontFamily: 'monospace' }}>
                                                        {diff.key}
                                                    </Typography>
                                                    <Chip label={diff.type} size="small" />
                                                </Box>
                                            }
                                            secondary={
                                                <Box>
                                                    {diff.type === 'modified' && (
                                                        <Box>
                                                            <Typography variant="caption" color="error">
                                                                - {formatValue(diff.oldValue)}
                                                            </Typography>
                                                            <br />
                                                            <Typography variant="caption" color="success.main">
                                                                + {formatValue(diff.newValue)}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    {diff.type === 'added' && (
                                                        <Typography variant="caption" color="success.main">
                                                            + {formatValue(diff.newValue)}
                                                        </Typography>
                                                    )}
                                                    {diff.type === 'removed' && (
                                                        <Typography variant="caption" color="error">
                                                            - {formatValue(diff.oldValue)}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    {selectedSnapshot && (
                        <Button
                            startIcon={<Restore />}
                            color="warning"
                            onClick={() => {
                                setDiffDialog(false);
                                handleRollback(selectedSnapshot);
                            }}
                        >
                            Rollback to This Version
                        </Button>
                    )}
                    <Button onClick={() => setDiffDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ConfigHistory;