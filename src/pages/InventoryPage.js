import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import {
  Container, Box, Typography, Button, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Chip, IconButton, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid,
  Select, MenuItem, FormControl, InputLabel, Alert, CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Inventory as InventoryIcon,
  History as HistoryIcon
} from '@mui/icons-material';

function InventoryPage() {
  const { token, user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals State
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openTransModal, setOpenTransModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [transType, setTransType] = useState('RESTOCK'); // 'RESTOCK' or 'DISPENSE'

  // Form States
  const [newItemForm, setNewItemForm] = useState({ item_name: '', category: '', sku: '', unit_of_measurement: '', reorder_level: 5 });
  const [transForm, setTransForm] = useState({ quantity: '', notes: '' });

  const fetchInventory = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/inventory`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setInventory(data);
      else setError(data.message);
    } catch (err) {
      setError("Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [token]);

  // Handle Adding New Item
  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newItemForm)
      });
      if (res.ok) {
        setOpenAddModal(false);
        setNewItemForm({ item_name: '', category: '', sku: '', unit_of_measurement: '', reorder_level: 5 });
        fetchInventory();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Restock/Dispense
  const handleTransaction = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/inventory/${selectedItem.id}/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action_type: transType, quantity: transForm.quantity, notes: transForm.notes })
      });
      const data = await res.json();
      if (res.ok) {
        setOpenTransModal(false);
        setTransForm({ quantity: '', notes: '' });
        fetchInventory(); // Refresh the table
      } else {
        alert(data.message); // Simple alert for insufficient stock errors
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openTransaction = (item, type) => {
    setSelectedItem(item);
    setTransType(type);
    setOpenTransModal(true);
  };

  if (loading) return <Layout><Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box></Layout>;

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="primary">Store Inventory</Typography>
            <Typography variant="body2" color="text.secondary">Manage medical consumables and stock levels.</Typography>
          </Box>
          <Button 
            variant="contained" 
            startIcon={<InventoryIcon />} 
            onClick={() => setOpenAddModal(true)}
            sx={{ borderRadius: 2 }}
          >
            Add New Item
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell><b>Item Name</b></TableCell>
                <TableCell><b>Category</b></TableCell>
                <TableCell><b>Branch</b></TableCell>
                <TableCell align="center"><b>Stock Level</b></TableCell>
                <TableCell align="center"><b>Status</b></TableCell>
                <TableCell align="right"><b>Actions</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inventory.map((item) => {
                const stock = parseFloat(item.quantity_in_stock);
                const reorder = parseFloat(item.reorder_level);
                const isLowStock = stock <= reorder;

                return (
                  <TableRow key={item.id} hover>
                    <TableCell fontWeight="bold">{item.item_name}</TableCell>
                    <TableCell>{item.category || 'N/A'}</TableCell>
                    <TableCell>{item.branch_name || 'HQ'}</TableCell>
                    <TableCell align="center">
                      <Typography variant="h6" fontWeight="bold">
                        {stock} <Typography component="span" variant="caption">{item.unit_of_measurement}</Typography>
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={isLowStock ? 'Low Stock' : 'Healthy'} 
                        color={isLowStock ? 'error' : 'success'} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="outlined" color="success" sx={{ mr: 1 }} onClick={() => openTransaction(item, 'RESTOCK')}>
                        + Restock
                      </Button>
                      <Button size="small" variant="outlined" color="error" onClick={() => openTransaction(item, 'DISPENSE')}>
                        - Dispense
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {inventory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>No items found in inventory.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* --- MODAL: Add New Item --- */}
        <Dialog open={openAddModal} onClose={() => setOpenAddModal(false)} maxWidth="sm" fullWidth>
          <DialogTitle fontWeight="bold">Add New Inventory Item</DialogTitle>
          <form onSubmit={handleAddItem}>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={12}><TextField required fullWidth label="Item Name" value={newItemForm.item_name} onChange={e => setNewItemForm({...newItemForm, item_name: e.target.value})} /></Grid>
                <Grid item xs={6}><TextField fullWidth label="Category" value={newItemForm.category} onChange={e => setNewItemForm({...newItemForm, category: e.target.value})} placeholder="e.g. Consumables" /></Grid>
                <Grid item xs={6}><TextField fullWidth label="SKU / Code" value={newItemForm.sku} onChange={e => setNewItemForm({...newItemForm, sku: e.target.value})} /></Grid>
                <Grid item xs={6}><TextField required fullWidth label="Unit (e.g. Boxes, Liters)" value={newItemForm.unit_of_measurement} onChange={e => setNewItemForm({...newItemForm, unit_of_measurement: e.target.value})} /></Grid>
                <Grid item xs={6}><TextField required fullWidth type="number" label="Reorder Alert Level" value={newItemForm.reorder_level} onChange={e => setNewItemForm({...newItemForm, reorder_level: e.target.value})} /></Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenAddModal(false)}>Cancel</Button>
              <Button type="submit" variant="contained">Save Item</Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* --- MODAL: Process Transaction --- */}
        <Dialog open={openTransModal} onClose={() => setOpenTransModal(false)} maxWidth="xs" fullWidth>
          <DialogTitle fontWeight="bold" color={transType === 'RESTOCK' ? 'success.main' : 'error.main'}>
            {transType === 'RESTOCK' ? 'Restock Item' : 'Dispense Item'}
          </DialogTitle>
          <form onSubmit={handleTransaction}>
            <DialogContent dividers>
              <Typography variant="subtitle1" mb={2}><b>Item:</b> {selectedItem?.item_name}</Typography>
              <TextField 
                required fullWidth type="number" 
                label={`Quantity to ${transType === 'RESTOCK' ? 'Add' : 'Remove'}`} 
                value={transForm.quantity} 
                onChange={e => setTransForm({...transForm, quantity: e.target.value})} 
                sx={{ mb: 2 }}
                InputProps={{ inputProps: { min: 0.1, step: "any" } }} 
              />
              <TextField 
                fullWidth multiline rows={2} 
                label="Notes (Optional)" 
                value={transForm.notes} 
                onChange={e => setTransForm({...transForm, notes: e.target.value})} 
                placeholder={transType === 'RESTOCK' ? 'e.g. Vendor delivery' : 'e.g. Used for Patient XYZ'}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenTransModal(false)}>Cancel</Button>
              <Button type="submit" variant="contained" color={transType === 'RESTOCK' ? 'success' : 'error'}>
                Confirm
              </Button>
            </DialogActions>
          </form>
        </Dialog>

      </Container>
    </Layout>
  );
}

export default InventoryPage;