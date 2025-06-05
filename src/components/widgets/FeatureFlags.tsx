import {
    Add,
    Delete,
    Edit,
    Flag,
    MoreVert,
    ToggleOff,
    ToggleOn
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Paper,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Typography
} from '@mui/material';
import {
    doc,
    onSnapshot,
    setDoc
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentConfig, saveConfigSnapshot } from '../../utils/configHistory';

interface FeatureFlags {
    [key: string]: boolean;
}

const FeatureFlagsTable: React.FC = () => {
    const { currentUser } = useAuth();
    const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Table pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Dialog states
    const [addFlagDialog, setAddFlagDialog] = useState(false);
    const [editFlagDialog, setEditFlagDialog] = useState(false);

    // Form states
    const [newFlagName, setNewFlagName] = useState('');
    const [newFlagValue, setNewFlagValue] = useState(false);
    const [editingFlagName, setEditingFlagName] = useState('');
    const [editingNewName, setEditingNewName] = useState('');

    // Menu state
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [menuFlag, setMenuFlag] = useState('');

    // Firebase document reference
    const featureFlagsDocRef = doc(db, 'android_config', 'feature_flags');

    useEffect(() => {
        // Set up real-time listener for feature flags
        const unsubscribe = onSnapshot(featureFlagsDocRef, (doc) => {
            if (doc.exists()) {
                setFeatureFlags(doc.data() as FeatureFlags);
            } else {
                setFeatureFlags({});
            }
            setLoading(false);
        }, (error) => {
            setError('Failed to load feature flags: ' + error.message);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, flagName: string) => {
        setAnchorEl(event.currentTarget);
        setMenuFlag(flagName);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setMenuFlag('');
    };

    const handleToggleFlag = async (flagName: string, currentValue: boolean) => {
        const newFlags = { ...featureFlags, [flagName]: !currentValue };
        const description = `${!currentValue ? 'Enabled' : 'Disabled'} ${flagName}`;
        await saveChangeWithHistory(newFlags, description);
    };

    const handleAddFlag = async () => {
        if (!newFlagName.trim()) {
            setError('Flag name cannot be empty');
            return;
        }

        const flagNameRegex = /^[a-z0-9_]+$/;
        if (!flagNameRegex.test(newFlagName)) {
            setError('Flag name must contain only lowercase letters, numbers, and underscores');
            return;
        }

        if (featureFlags.hasOwnProperty(newFlagName)) {
            setError('Feature flag already exists');
            return;
        }

        const newFlags = { ...featureFlags, [newFlagName]: newFlagValue };
        const description = `Added new flag: ${newFlagName} (${newFlagValue ? 'enabled' : 'disabled'})`;
        await saveChangeWithHistory(newFlags, description, 'create');

        setNewFlagName('');
        setNewFlagValue(false);
        setAddFlagDialog(false);
    };

    const handleDeleteFlag = async (flagName: string) => {
        if (!window.confirm(`Are you sure you want to delete the "${flagName}" feature flag?`)) {
            return;
        }

        const newFlags = { ...featureFlags };
        delete newFlags[flagName];

        const description = `Deleted flag: ${flagName}`;
        await saveChangeWithHistory(newFlags, description, 'delete');
        handleMenuClose();
    };

    const saveChangeWithHistory = async (
        newFlags: any,
        description: string,
        action: 'create' | 'update' | 'delete' = 'update'
    ) => {
        try {
            const previousData = await getCurrentConfig('feature_flags');

            // Save the new data
            await setDoc(featureFlagsDocRef, newFlags);

            // Save to history
            await saveConfigSnapshot({
                configType: 'feature_flags',
                action,
                description,
                author: currentUser?.email || 'Unknown',
                previousData,
                currentData: newFlags
            });

            setSuccess(`Feature flags updated: ${description}`);
        } catch (error: any) {
            setError('Failed to update feature flags: ' + error.message);
        }
    };

    const handleRenameFlag = async () => {
        if (!editingNewName.trim()) {
            setError('New flag name cannot be empty');
            return;
        }

        const flagNameRegex = /^[a-z0-9_]+$/;
        if (!flagNameRegex.test(editingNewName)) {
            setError('Flag name must contain only lowercase letters, numbers, and underscores');
            return;
        }

        if (featureFlags.hasOwnProperty(editingNewName) && editingNewName !== editingFlagName) {
            setError('A feature flag with that name already exists');
            return;
        }

        const newFlags = { ...featureFlags };
        newFlags[editingNewName] = newFlags[editingFlagName];

        if (editingNewName !== editingFlagName) {
            delete newFlags[editingFlagName];
        }

        const description = editingNewName !== editingFlagName
            ? `Renamed flag: ${editingFlagName} → ${editingNewName}`
            : `Updated flag: ${editingNewName}`;

        await saveChangeWithHistory(newFlags, description);

        setEditFlagDialog(false);
        setEditingFlagName('');
        setEditingNewName('');
    };

    const openEditFlagDialog = (flagName: string) => {
        setEditingFlagName(flagName);
        setEditingNewName(flagName);
        setEditFlagDialog(true);
        setError('');
        handleMenuClose();
    };

    // Prepare data for table
    const flagsArray = Object.entries(featureFlags).map(([name, value]) => ({
        name,
        value,
        status: value ? 'enabled' : 'disabled'
    }));

    const paginatedFlags = flagsArray.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    if (loading) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6">Loading Feature Flags...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Flag color="primary" />
                    Feature Flags
                </Typography>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<Add />}
                    onClick={() => setAddFlagDialog(true)}
                >
                    Add Flag
                </Button>
            </Box>

            {/* Alerts */}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            {/* Table */}
            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: 440 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        Flag Name
                                    </Typography>
                                </TableCell>
                                <TableCell align="center">
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        Enabled
                                    </Typography>
                                </TableCell>
                                <TableCell align="center" width={60}>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        Actions
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedFlags.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4 }}>
                                        <Typography color="text.secondary">
                                            No feature flags yet. Click "Add Flag" to get started.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedFlags.map((flag) => (
                                    <TableRow key={flag.name} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="medium" sx={{ fontFamily: 'monospace' }}>
                                                {flag.name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Switch
                                                checked={flag.value}
                                                onChange={() => handleToggleFlag(flag.name, flag.value)}
                                                color="primary"
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => handleMenuOpen(e, flag.name)}
                                            >
                                                <MoreVert />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {flagsArray.length > 0 && (
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={flagsArray.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                )}
            </Paper>

            {/* Actions Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={() => handleToggleFlag(menuFlag, featureFlags[menuFlag])}>
                    <ListItemIcon>
                        {featureFlags[menuFlag] ? <ToggleOff fontSize="small" /> : <ToggleOn fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText>{featureFlags[menuFlag] ? 'Disable' : 'Enable'}</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => openEditFlagDialog(menuFlag)}>
                    <ListItemIcon>
                        <Edit fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Rename Flag</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleDeleteFlag(menuFlag)}>
                    <ListItemIcon>
                        <Delete fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText>Delete Flag</ListItemText>
                </MenuItem>
            </Menu>

            {/* Add Flag Dialog */}
            <Dialog open={addFlagDialog} onClose={() => setAddFlagDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add New Feature Flag</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Flag Name"
                        fullWidth
                        variant="outlined"
                        value={newFlagName}
                        onChange={(e) => setNewFlagName(e.target.value)}
                        placeholder="e.g., dashboard_v2, new_ui_enabled, dark_mode"
                        helperText="Use lowercase letters, numbers, and underscores only"
                    />
                    <FormControlLabel
                        control={
                            <Switch
                                checked={newFlagValue}
                                onChange={(e) => setNewFlagValue(e.target.checked)}
                                color="primary"
                            />
                        }
                        label={`Initial value: ${newFlagValue ? 'Enabled' : 'Disabled'}`}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddFlagDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddFlag} variant="contained">Add Flag</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Flag Dialog */}
            <Dialog open={editFlagDialog} onClose={() => setEditFlagDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Rename Feature Flag: {editingFlagName}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="New Flag Name"
                        fullWidth
                        variant="outlined"
                        value={editingNewName}
                        onChange={(e) => setEditingNewName(e.target.value)}
                        helperText="Use lowercase letters, numbers, and underscores only"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditFlagDialog(false)}>Cancel</Button>
                    <Button onClick={handleRenameFlag} variant="contained">Save Changes</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default FeatureFlagsTable;