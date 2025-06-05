import {
    Add,
    Delete,
    Edit,
    Email,
    Group,
    MoreVert,
    PersonAdd,
    Science
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Paper,
    Stack,
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

interface BetaFeature {
    [key: string]: string;
}

const BetaFeaturesTable: React.FC = () => {
    const [betaFeatures, setBetaFeatures] = useState<BetaFeature>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { currentUser } = useAuth();

    // Table pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Dialog states
    const [addFeatureDialog, setAddFeatureDialog] = useState(false);
    const [addUserDialog, setAddUserDialog] = useState(false);
    const [editFeatureDialog, setEditFeatureDialog] = useState(false);
    const [viewUsersDialog, setViewUsersDialog] = useState(false);

    // Form states
    const [newFeatureName, setNewFeatureName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [selectedFeature, setSelectedFeature] = useState('');
    const [editingFeatureName, setEditingFeatureName] = useState('');
    const [editingNewName, setEditingNewName] = useState('');

    // Menu state
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [menuFeature, setMenuFeature] = useState('');

    // Firebase document reference
    const betaUsersDocRef = doc(db, 'android_config', 'beta_users');

    useEffect(() => {
        // Set up real-time listener for beta features
        const unsubscribe = onSnapshot(betaUsersDocRef, (doc) => {
            if (doc.exists()) {
                setBetaFeatures(doc.data() as BetaFeature);
            } else {
                setBetaFeatures({});
            }
            setLoading(false);
        }, (error) => {
            setError('Failed to load beta features: ' + error.message);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Helper functions to handle comma-separated strings
    const parseEmailString = (emailString: string): string[] => {
        if (!emailString || emailString.trim() === '') return [];
        return emailString.split(',').map(email => email.trim()).filter(email => email.length > 0);
    };

    const formatEmailString = (emails: string[]): string => {
        return emails.join(',');
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, featureName: string) => {
        setAnchorEl(event.currentTarget);
        setMenuFeature(featureName);
    };

    const saveChangeWithHistory = async (
        newBetaFeatures: any,
        description: string,
        action: 'create' | 'update' | 'delete' = 'update'
    ) => {
        try {
            const previousData = await getCurrentConfig('beta_features');

            // Save the new data
            await setDoc(betaUsersDocRef, newBetaFeatures);

            // Save to history
            await saveConfigSnapshot({
                configType: 'beta_features',
                action,
                description,
                author: currentUser?.email || 'Unknown',
                previousData,
                currentData: newBetaFeatures
            });

            setSuccess(`Beta features updated: ${description}`);
        } catch (error: any) {
            setError('Failed to update beta features: ' + error.message);
        }
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setMenuFeature('');
    };

    const handleAddFeature = async () => {
        if (!newFeatureName.trim()) {
            setError('Feature name cannot be empty');
            return;
        }

        if (betaFeatures[newFeatureName]) {
            setError('Feature already exists');
            return;
        }

        const newFeatures = {
            ...betaFeatures,
            [newFeatureName]: ''
        };

        const description = `Added new beta feature: ${newFeatureName}`;
        await saveChangeWithHistory(newFeatures, description, 'create');

        setNewFeatureName('');
        setAddFeatureDialog(false);
    };

    const handleDeleteFeature = async (featureName: string) => {
        if (!window.confirm(`Are you sure you want to delete the "${featureName}" feature?`)) {
            return;
        }

        const newFeatures = { ...betaFeatures };
        delete newFeatures[featureName];

        const description = `Deleted beta feature: ${featureName}`;
        await saveChangeWithHistory(newFeatures, description, 'delete');
        handleMenuClose();
    };

    const handleRenameFeature = async () => {
        if (!editingNewName.trim()) {
            setError('New feature name cannot be empty');
            return;
        }

        if (betaFeatures[editingNewName] && editingNewName !== editingFeatureName) {
            setError('A feature with that name already exists');
            return;
        }

        const newFeatures = { ...betaFeatures };
        newFeatures[editingNewName] = newFeatures[editingFeatureName];

        if (editingNewName !== editingFeatureName) {
            delete newFeatures[editingFeatureName];
        }

        const description = editingNewName !== editingFeatureName
            ? `Renamed beta feature: ${editingFeatureName} → ${editingNewName}`
            : `Updated beta feature: ${editingNewName}`;

        await saveChangeWithHistory(newFeatures, description);

        setEditFeatureDialog(false);
        setEditingFeatureName('');
        setEditingNewName('');
    };

    const handleAddUser = async () => {
        if (!newUserEmail.trim()) {
            setError('Email cannot be empty');
            return;
        }

        if (!selectedFeature) {
            setError('Please select a feature');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newUserEmail)) {
            setError('Please enter a valid email address');
            return;
        }

        const currentEmails = parseEmailString(betaFeatures[selectedFeature] || '');
        if (currentEmails.includes(newUserEmail)) {
            setError('User is already in this beta feature');
            return;
        }

        const updatedEmails = [...currentEmails, newUserEmail];
        const emailString = formatEmailString(updatedEmails);

        const newFeatures = {
            ...betaFeatures,
            [selectedFeature]: emailString
        };

        const description = `Added user ${newUserEmail} to ${selectedFeature}`;
        await saveChangeWithHistory(newFeatures, description);

        setNewUserEmail('');
        setAddUserDialog(false);
    };

    const handleRemoveUser = async (featureName: string, userEmail: string) => {
        if (!window.confirm(`Remove "${userEmail}" from "${featureName}"?`)) {
            return;
        }

        const currentEmails = parseEmailString(betaFeatures[featureName] || '');
        const updatedEmails = currentEmails.filter(email => email !== userEmail);
        const emailString = formatEmailString(updatedEmails);

        const newFeatures = {
            ...betaFeatures,
            [featureName]: emailString
        };

        const description = `Removed user ${userEmail} from ${featureName}`;
        await saveChangeWithHistory(newFeatures, description);
    };

    const openAddUserDialog = (featureName: string) => {
        setSelectedFeature(featureName);
        setAddUserDialog(true);
        setError('');
        handleMenuClose();
    };

    const openEditFeatureDialog = (featureName: string) => {
        setEditingFeatureName(featureName);
        setEditingNewName(featureName);
        setEditFeatureDialog(true);
        setError('');
        handleMenuClose();
    };

    const openViewUsersDialog = (featureName: string) => {
        setSelectedFeature(featureName);
        setViewUsersDialog(true);
        handleMenuClose();
    };

    // Prepare data for table
    const featuresArray = Object.entries(betaFeatures).map(([name, emailString]) => ({
        name,
        emails: parseEmailString(emailString),
        userCount: parseEmailString(emailString).length
    }));

    const paginatedFeatures = featuresArray.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    if (loading) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6">Loading Beta Features...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Science color="primary" />
                    Beta Features
                </Typography>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<Add />}
                    onClick={() => setAddFeatureDialog(true)}
                >
                    Add Feature
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
                                        Feature Name
                                    </Typography>
                                </TableCell>
                                <TableCell align="center">
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        User Count
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        Beta Users
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
                            {paginatedFeatures.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4 }}>
                                        <Typography color="text.secondary">
                                            No beta features yet. Click "Add Feature" to get started.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedFeatures.map((feature) => (
                                    <TableRow key={feature.name} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="medium">
                                                {feature.name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={()=> openViewUsersDialog(feature.name)}
                                            >
                                                {feature.userCount}
                                            </Button>
                                        </TableCell>
                                        <TableCell>
                                            {feature.emails.length === 0 ? (
                                                <Typography variant="body2" color="text.secondary">
                                                    No users
                                                </Typography>
                                            ) : (
                                                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                                    {feature.emails.slice(0, 3).map((email) => (
                                                        <Chip
                                                            key={email}
                                                            label={email}
                                                            size="small"
                                                            variant="outlined"
                                                            icon={<Email />}
                                                            sx={{ fontSize: '0.75rem' }}
                                                        />
                                                    ))}
                                                    {feature.emails.length > 3 && (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={() => openViewUsersDialog(feature.name)}
                                                            sx={{ cursor: 'pointer' }}
                                                        >
                                                            {`+${feature.emails.length - 3} more`}
                                                        </Button>
                                                    )}
                                                </Stack>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => handleMenuOpen(e, feature.name)}
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

                {featuresArray.length > 0 && (
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={featuresArray.length}
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
                <MenuItem onClick={() => openAddUserDialog(menuFeature)}>
                    <ListItemIcon>
                        <PersonAdd fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Add User</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => openViewUsersDialog(menuFeature)}>
                    <ListItemIcon>
                        <Group fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>View All Users</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => openEditFeatureDialog(menuFeature)}>
                    <ListItemIcon>
                        <Edit fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Edit Feature</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleDeleteFeature(menuFeature)}>
                    <ListItemIcon>
                        <Delete fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText>Delete Feature</ListItemText>
                </MenuItem>
            </Menu>

            {/* Add Feature Dialog */}
            <Dialog open={addFeatureDialog} onClose={() => setAddFeatureDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add New Beta Feature</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Feature Name"
                        fullWidth
                        variant="outlined"
                        value={newFeatureName}
                        onChange={(e) => setNewFeatureName(e.target.value)}
                        placeholder="e.g., weather_v2, new_ui, premium_features"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddFeatureDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddFeature} variant="contained">Add Feature</Button>
                </DialogActions>
            </Dialog>

            {/* Add User Dialog */}
            <Dialog open={addUserDialog} onClose={() => setAddUserDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Beta User to {selectedFeature}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="User Email"
                        type="email"
                        fullWidth
                        variant="outlined"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="user@example.com"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddUserDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddUser} variant="contained">Add User</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Feature Dialog */}
            <Dialog open={editFeatureDialog} onClose={() => setEditFeatureDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Feature: {editingFeatureName}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Feature Name"
                        fullWidth
                        variant="outlined"
                        value={editingNewName}
                        onChange={(e) => setEditingNewName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditFeatureDialog(false)}>Cancel</Button>
                    <Button onClick={handleRenameFeature} variant="contained">Save Changes</Button>
                </DialogActions>
            </Dialog>

            {/* View Users Dialog */}
            <Dialog open={viewUsersDialog} onClose={() => setViewUsersDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Beta Users for {selectedFeature}</DialogTitle>
                <DialogContent>
                    <Stack spacing={1} sx={{ mt: 1 }}>
                        {parseEmailString(betaFeatures[selectedFeature] || '').map((email) => (
                            <Box
                                key={email}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    p: 2,
                                    bgcolor: 'background.default',
                                    borderRadius: 1
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Email fontSize="small" color="action" />
                                    <Typography variant="body2">{email}</Typography>
                                </Box>
                                <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleRemoveUser(selectedFeature, email)}
                                >
                                    <Delete fontSize="small" />
                                </IconButton>
                            </Box>
                        ))}
                        {parseEmailString(betaFeatures[selectedFeature] || '').length === 0 && (
                            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                                No beta users yet
                            </Typography>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => openAddUserDialog(selectedFeature)} startIcon={<PersonAdd />}>
                        Add User
                    </Button>
                    <Button onClick={() => setViewUsersDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default BetaFeaturesTable;