import { Add, Dashboard as DashboardIcon, Delete, Edit, ExitToApp } from '@mui/icons-material';
import {
    Alert,
    AppBar,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Fab,
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemText,
    TextField,
    Toolbar,
    Typography
} from '@mui/material';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    updateDoc
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import BetaFeaturesTable from './widgets/BetaFeaturesTable';
import ConfigHistory from './widgets/ConfigHistory';
import FeatureFlagsTable from './widgets/FeatureFlags';

interface DataItem {
    id: string;
    title: string;
    description: string;
    createdAt: any;
}

const Dashboard: React.FC = () => {
    const [items, setItems] = useState<DataItem[]>([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [editingItem, setEditingItem] = useState<DataItem | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const { currentUser, logout } = useAuth();

    useEffect(() => {
        if (!currentUser) return;

        // Set up real-time listener for the user's data
        const q = query(
            collection(db, `users/${currentUser.uid}/items`),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const itemsData: DataItem[] = [];
            querySnapshot.forEach((doc) => {
                itemsData.push({
                    id: doc.id,
                    ...doc.data()
                } as DataItem);
            });
            setItems(itemsData);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !description.trim()) {
            setError('Please fill in all fields');
            return;
        }

        try {
            setError('');
            setSuccess('');
            setLoading(true);

            if (editingItem) {
                // Update existing item
                const itemRef = doc(db, `users/${currentUser!.uid}/items`, editingItem.id);
                await updateDoc(itemRef, {
                    title: title.trim(),
                    description: description.trim()
                });
                setSuccess('Item updated successfully!');
            } else {
                // Add new item
                await addDoc(collection(db, `users/${currentUser!.uid}/items`), {
                    title: title.trim(),
                    description: description.trim(),
                    createdAt: new Date()
                });
                setSuccess('Item added successfully!');
            }

            setTitle('');
            setDescription('');
            setEditingItem(null);
            setDialogOpen(false);
        } catch (error: any) {
            setError(error.message);
        }

        setLoading(false);
    };

    const handleEdit = (item: DataItem) => {
        setEditingItem(item);
        setTitle(item.title);
        setDescription(item.description);
        setDialogOpen(true);
        setError('');
        setSuccess('');
    };

    const handleDelete = async (itemId: string) => {
        if (!window.confirm('Are you sure you want to delete this item?')) {
            return;
        }

        try {
            await deleteDoc(doc(db, `users/${currentUser!.uid}/items`, itemId));
            setSuccess('Item deleted successfully!');
        } catch (error: any) {
            setError(error.message);
        }
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
        setEditingItem(null);
        setTitle('');
        setDescription('');
        setError('');
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Failed to log out');
        }
    };

    return (
        <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'grey.50' }}>
            <AppBar position="static">
                <Toolbar>
                    <DashboardIcon sx={{ mr: 2 }} />
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Dashboard
                    </Typography>
                    <Typography variant="body2" sx={{ mr: 2 }}>
                        {currentUser?.email}
                    </Typography>
                    <Button color="inherit" onClick={handleLogout} startIcon={<ExitToApp />}>
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            <Container maxWidth="xl" sx={{ mt: 4, pb: 4 }}>
                {/* Global Alerts */}
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

                {/* Dashboard Grid */}
                <Grid container spacing={3}>

                    {/* Feature Flags Widget */}
                    <Grid>
                        <Card sx={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
                            <CardContent sx={{ flexGrow: 1, overflow: 'hidden', p: 0 }}>
                                <Box sx={{ p: 2, pb: 0 }}>
                                    <FeatureFlagsTable />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Beta Features Widget */}
                    <Grid>
                        <Card sx={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
                            <CardContent sx={{ flexGrow: 1, overflow: 'hidden', p: 0 }}>
                                <Box sx={{ p: 2, pb: 0 }}>
                                    <BetaFeaturesTable />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* TODO Add this back when the config component is done */}
                    {/* Configuration History Widget */}
                    {/* <Grid>
                        <Card sx={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
                            <CardContent sx={{ flexGrow: 1, overflow: 'hidden', p: 0 }}>
                                <Box sx={{ p: 2, pb: 0 }}>
                                    <ConfigHistory />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid> */}

            
                </Grid>


                {/* Add/Edit Dialog */}
                <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
                    <DialogTitle>
                        {editingItem ? 'Edit Item' : 'Add New Item'}
                    </DialogTitle>
                    <DialogContent>
                        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                label="Title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                autoFocus
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                label="Description"
                                multiline
                                rows={4}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleDialogClose}>Cancel</Button>
                        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                            {loading ? 'Saving...' : (editingItem ? 'Update' : 'Add')}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </Box>
    );
};

export default Dashboard;