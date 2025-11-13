import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { usePermissions } from '../hooks/usePermissions';
import './Inventory.css';

export default function Inventory() {
  const { hasPermission } = usePermissions();
  const [stocks, setStocks] = useState([]);
  const [products, setProducts] = useState([]);
  const [storageLocations, setStorageLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showInventoryHistory, setShowInventoryHistory] = useState(false);
  const [selectedProductHistory, setSelectedProductHistory] = useState(null);
  const [stockMovements, setStockMovements] = useState([]);
  const [inventoryHistoryList, setInventoryHistoryList] = useState([]);
  const [selectedInventoryDetails, setSelectedInventoryDetails] = useState(null);
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [sortField, setSortField] = useState('product_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedStorage, setSelectedStorage] = useState('');
  const [showOnlyIngredients, setShowOnlyIngredients] = useState(true);
  const [inventoryData, setInventoryData] = useState([]);
  const [showInventoryResults, setShowInventoryResults] = useState(false);
  const [transferData, setTransferData] = useState({
    from_storage_id: '',
    to_storage_id: '',
    notes: '',
  });
  const [transferItems, setTransferItems] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [availableProductsForTransfer, setAvailableProductsForTransfer] = useState([]);

  useEffect(() => {
    loadStorageLocations();
  }, []);

  useEffect(() => {
    if (selectedStorage) {
      loadData();
    }
  }, [selectedStorage, showOnlyIngredients]);

  const loadStorageLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('storage_locations')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStorageLocations(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement dépôts:', error);
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: configuredProducts, error: pricesError } = await supabase
        .from('product_prices')
        .select('product_id')
        .eq('storage_location_id', selectedStorage);

      if (pricesError) throw pricesError;

      const configuredProductIds = configuredProducts?.map(p => p.product_id) || [];

      if (configuredProductIds.length === 0) {
        setStocks([]);
        setProducts([]);
        setLoading(false);
        return;
      }

      let stockQuery = supabase
        .from('product_stocks')
        .select(`
          *,
          products:product_id (id, name, reference, unit),
          storage_locations:storage_location_id (id, name, code)
        `)
        .eq('storage_location_id', selectedStorage)
        .in('product_id', configuredProductIds)
        .order('updated_at', { ascending: false });

      let productsQuery = supabase
        .from('products')
        .select('*, product_types(name)')
        .eq('is_active', true)
        .in('id', configuredProductIds);

      if (showOnlyIngredients) {
        const { data: rawMaterialType } = await supabase
          .from('product_types')
          .select('id')
          .eq('name', 'Matières Premières')
          .single();

        if (rawMaterialType) {
          productsQuery = productsQuery.eq('product_type_id', rawMaterialType.id);
        }
      }

      productsQuery = productsQuery.order('name');

      const [stocksData, productsData] = await Promise.all([
        stockQuery,
        productsQuery,
      ]);

      if (stocksData.error) throw stocksData.error;
      if (productsData.error) throw productsData.error;

      setStocks(stocksData.data || []);
      setProducts(productsData.data || []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStockHistory = async (productId, storageLocationId) => {
    try {
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          products:product_id (name, reference),
          storage_locations:storage_location_id (name, code),
          sales_points:pos_id (name)
        `)
        .eq('product_id', productId)
        .eq('storage_location_id', storageLocationId)
        .order('created_at', { ascending: false });

      if (historyStartDate) {
        query = query.gte('created_at', historyStartDate + 'T00:00:00');
      }
      if (historyEndDate) {
        query = query.lte('created_at', historyEndDate + 'T23:59:59');
      }

      const { data, error } = await query;
      if (error) throw error;

      setStockMovements(data || []);
      setSelectedProductHistory({ productId, storageLocationId });
      setShowHistory(true);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      alert('Erreur lors du chargement de l\'historique: ' + error.message);
    }
  };

  const loadInventoryData = async () => {
    if (!selectedStorage) return;

    try {
      const allInventoryItems = await Promise.all(
        products.map(async (product) => {
          const existingStock = stocks.find(
            s => s.product_id === product.id && s.storage_location_id === selectedStorage
          );

          if (existingStock) {
            const { data: movements } = await supabase
              .from('stock_movements')
              .select('quantity, movement_type, created_at')
              .eq('product_id', existingStock.product_id)
              .eq('storage_location_id', existingStock.storage_location_id)
              .gte('created_at', existingStock.last_inventory_date || '2000-01-01')
              .order('created_at');

            let expectedQuantity = parseFloat(existingStock.quantity);
            movements?.forEach(m => {
              expectedQuantity += parseFloat(m.quantity);
            });

            return {
              ...existingStock,
              currentQuantity: parseFloat(existingStock.quantity),
              expectedQuantity: expectedQuantity.toFixed(2),
              countedQuantity: 0,
              difference: 0,
            };
          } else {
            return {
              id: null,
              product_id: product.id,
              storage_location_id: selectedStorage,
              products: product,
              currentQuantity: 0,
              expectedQuantity: 0,
              countedQuantity: 0,
              difference: 0,
            };
          }
        })
      );

      setInventoryData(allInventoryItems);
      setShowInventoryResults(false);
      setShowInventoryModal(true);
    } catch (error) {
      console.error('Erreur chargement inventaire:', error);
      alert('Erreur lors du chargement des données d\'inventaire');
    }
  };

  const handleInventorySubmit = async () => {
    if (!confirm('Valider cet inventaire ? Les stocks seront mis à jour.')) return;

    try {
      const totalDiscrepancies = inventoryData.filter(item => item.difference !== 0).length;

      const { data: inventory, error: invError } = await supabase
        .from('inventories')
        .insert([{
          storage_location_id: selectedStorage,
          inventory_date: new Date().toISOString(),
          status: 'validated',
          total_items: inventoryData.length,
          total_discrepancies: totalDiscrepancies,
          notes: `Inventaire ${storageLocations.find(s => s.id === selectedStorage)?.name}`,
          created_by: 'admin',
          validated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (invError) throw invError;

      const inventoryLines = inventoryData.map(item => ({
        inventory_id: inventory.id,
        product_id: item.product_id,
        expected_quantity: item.currentQuantity,
        counted_quantity: parseFloat(item.countedQuantity),
        difference: item.difference,
      }));

      const { error: linesError } = await supabase
        .from('inventory_lines')
        .insert(inventoryLines);

      if (linesError) throw linesError;

      for (const item of inventoryData) {
        const newQuantity = parseFloat(item.countedQuantity);

        if (item.id) {
          if (item.difference !== 0) {
            await supabase
              .from('product_stocks')
              .update({
                quantity: newQuantity,
                last_inventory_date: new Date().toISOString(),
              })
              .eq('id', item.id);

            await supabase.from('stock_movements').insert([{
              product_id: item.product_id,
              storage_location_id: item.storage_location_id,
              movement_type: 'inventory_adjustment',
              quantity: item.difference,
              previous_quantity: item.currentQuantity,
              new_quantity: newQuantity,
              notes: `Inventaire #${inventory.id.substring(0, 8)} - Écart: ${item.difference.toFixed(2)}`,
            }]);
          }
        } else if (newQuantity > 0) {
          await supabase
            .from('product_stocks')
            .insert([{
              product_id: item.product_id,
              storage_location_id: item.storage_location_id,
              quantity: newQuantity,
              last_inventory_date: new Date().toISOString(),
            }]);

          await supabase.from('stock_movements').insert([{
            product_id: item.product_id,
            storage_location_id: item.storage_location_id,
            movement_type: 'inventory_adjustment',
            quantity: newQuantity,
            previous_quantity: 0,
            new_quantity: newQuantity,
            notes: `Inventaire #${inventory.id.substring(0, 8)} - Création stock`,
          }]);
        }
      }

      alert('Inventaire validé avec succès');
      setShowInventoryModal(false);
      setShowInventoryResults(false);
      loadData();
    } catch (error) {
      console.error('Erreur validation inventaire:', error);
      alert('Erreur lors de la validation de l\'inventaire: ' + error.message);
    }
  };

  const loadInventoryHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventories')
        .select(`
          *,
          storage_locations:storage_location_id (name, code)
        `)
        .order('inventory_date', { ascending: false });

      if (error) throw error;
      setInventoryHistoryList(data || []);
      setShowInventoryHistory(true);
    } catch (error) {
      console.error('Erreur chargement historique inventaires:', error);
      alert('Erreur lors du chargement de l\'historique des inventaires');
    }
  };

  const loadInventoryDetails = async (inventoryId) => {
    try {
      const { data, error } = await supabase
        .from('inventory_lines')
        .select(`
          *,
          products:product_id (name, reference, unit)
        `)
        .eq('inventory_id', inventoryId)
        .order('products(name)');

      if (error) throw error;
      setSelectedInventoryDetails(data || []);
    } catch (error) {
      console.error('Erreur chargement détails inventaire:', error);
      alert('Erreur lors du chargement des détails de l\'inventaire');
    }
  };

  const openTransferModal = () => {
    const sourceStorage = storageLocations.find(sl => sl.id === selectedStorage);
    let defaultDestination = '';

    if (sourceStorage?.name !== 'Economat Général' && sourceStorage?.name !== 'Casse / Périmés') {
      const casseStorage = storageLocations.find(sl => sl.name === 'Casse / Périmés');
      defaultDestination = casseStorage?.id || '';
    }

    setTransferData({
      from_storage_id: selectedStorage || '',
      to_storage_id: defaultDestination,
      notes: '',
    });
    setTransferItems([]);
    setProductSearch('');

    if (defaultDestination) {
      loadAvailableProductsForTransfer(defaultDestination);
    } else {
      setAvailableProductsForTransfer([]);
    }

    setShowTransferModal(true);
  };

  const addTransferItem = (productId) => {
    if (!productId) return;

    const alreadyAdded = transferItems.find(item => item.product_id === productId);
    if (alreadyAdded) {
      alert('Ce produit est déjà dans la liste');
      return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    setTransferItems([...transferItems, {
      id: Date.now(),
      product_id: productId,
      product_name: product.name,
      product_reference: product.reference,
      quantity: 0,
    }]);
    setProductSearch('');
  };

  const removeTransferItem = (itemId) => {
    setTransferItems(transferItems.filter(item => item.id !== itemId));
  };

  const updateTransferItemQuantity = (itemId, quantity) => {
    setTransferItems(transferItems.map(item =>
      item.id === itemId ? { ...item, quantity: parseFloat(quantity) || 0 } : item
    ));
  };

  const loadAvailableProductsForTransfer = async (destinationStorageId) => {
    if (!destinationStorageId) {
      setAvailableProductsForTransfer([]);
      return;
    }

    try {
      const { data: sourceProducts, error: sourceError } = await supabase
        .from('product_prices')
        .select('product_id')
        .eq('storage_location_id', transferData.from_storage_id);

      if (sourceError) throw sourceError;

      const { data: destProducts, error: destError } = await supabase
        .from('product_prices')
        .select('product_id')
        .eq('storage_location_id', destinationStorageId);

      if (destError) throw destError;

      const sourceProductIds = sourceProducts?.map(p => p.product_id) || [];
      const destProductIds = destProducts?.map(p => p.product_id) || [];
      const commonProductIds = sourceProductIds.filter(id => destProductIds.includes(id));

      if (commonProductIds.length === 0) {
        setAvailableProductsForTransfer([]);
        return;
      }

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .in('id', commonProductIds)
        .order('name');

      if (productsError) throw productsError;

      setAvailableProductsForTransfer(productsData || []);
    } catch (error) {
      console.error('Erreur chargement produits disponibles:', error);
      setAvailableProductsForTransfer([]);
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();

    if (transferItems.length === 0) {
      alert('Veuillez ajouter au moins un produit');
      return;
    }

    const invalidItems = transferItems.filter(item => item.quantity <= 0);
    if (invalidItems.length > 0) {
      alert('Toutes les quantités doivent être supérieures à 0');
      return;
    }

    try {
      for (const item of transferItems) {
        const destConfigCheck = await supabase
          .from('product_prices')
          .select('id')
          .eq('product_id', item.product_id)
          .eq('storage_location_id', transferData.to_storage_id)
          .maybeSingle();

        if (!destConfigCheck.data) {
          const destStorage = storageLocations.find(s => s.id === transferData.to_storage_id);
          alert(`Le produit "${item.product_name}" n'est pas configuré pour le dépôt "${destStorage?.name}". Configurez-le d'abord dans la fiche produit.`);
          return;
        }

        const sourceStock = await supabase
          .from('product_stocks')
          .select('quantity')
          .eq('product_id', item.product_id)
          .eq('storage_location_id', transferData.from_storage_id)
          .maybeSingle();

        if (!sourceStock.data) {
          alert(`Stock source introuvable pour ${item.product_name}`);
          return;
        }

        const currentQty = parseFloat(sourceStock.data.quantity);
        const newSourceQty = currentQty - item.quantity;
        await supabase
          .from('product_stocks')
          .update({ quantity: newSourceQty })
          .eq('product_id', item.product_id)
          .eq('storage_location_id', transferData.from_storage_id);

        await supabase.from('stock_movements').insert([{
          product_id: item.product_id,
          storage_location_id: transferData.from_storage_id,
          movement_type: 'transfer',
          quantity: -item.quantity,
          previous_quantity: currentQty,
          new_quantity: newSourceQty,
          notes: `Transfert vers ${storageLocations.find(s => s.id === transferData.to_storage_id)?.name} - ${transferData.notes}`,
        }]);

        const destStock = await supabase
          .from('product_stocks')
          .select('quantity')
          .eq('product_id', item.product_id)
          .eq('storage_location_id', transferData.to_storage_id)
          .maybeSingle();

        if (destStock.data) {
          const destQty = parseFloat(destStock.data.quantity);
          const newDestQty = destQty + item.quantity;
          await supabase
            .from('product_stocks')
            .update({ quantity: newDestQty })
            .eq('product_id', item.product_id)
            .eq('storage_location_id', transferData.to_storage_id);

          await supabase.from('stock_movements').insert([{
            product_id: item.product_id,
            storage_location_id: transferData.to_storage_id,
            movement_type: 'transfer',
            quantity: item.quantity,
            previous_quantity: destQty,
            new_quantity: newDestQty,
            notes: `Transfert depuis ${storageLocations.find(s => s.id === transferData.from_storage_id)?.name} - ${transferData.notes}`,
          }]);
        } else {
          await supabase
            .from('product_stocks')
            .insert([{
              product_id: item.product_id,
              storage_location_id: transferData.to_storage_id,
              quantity: item.quantity,
            }]);

          await supabase.from('stock_movements').insert([{
            product_id: item.product_id,
            storage_location_id: transferData.to_storage_id,
            movement_type: 'transfer',
            quantity: item.quantity,
            previous_quantity: 0,
            new_quantity: item.quantity,
            notes: `Transfert depuis ${storageLocations.find(s => s.id === transferData.from_storage_id)?.name} - ${transferData.notes}`,
          }]);
        }
      }

      alert('Transferts effectués avec succès');
      setShowTransferModal(false);
      setTransferData({ from_storage_id: '', to_storage_id: '', notes: '' });
      setTransferItems([]);
      loadData();
    } catch (error) {
      console.error('Erreur transfert:', error);
      alert('Erreur lors du transfert: ' + error.message);
    }
  };

  const getStockStatus = (quantity, minAlert) => {
    const qty = parseFloat(quantity);
    const min = parseFloat(minAlert || 0);
    if (qty < 0) return 'negative';
    if (qty === 0) return 'empty';
    if (qty <= min) return 'low';
    return 'ok';
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="inventory-container">
      <div className="page-header">
        <div>
          <h2>Gestion des Stocks</h2>
          <div className="filter-group" style={{ marginTop: '12px' }}>
            <label style={{ fontWeight: '500', marginRight: '8px' }}>Dépôt de stockage:</label>
            <select
              value={selectedStorage}
              onChange={(e) => setSelectedStorage(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                minWidth: '250px'
              }}
            >
              <option value="">Sélectionner un dépôt</option>
              {storageLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.code})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {hasPermission('inventory', 'validate') && (
            <button
              className="btn-primary"
              onClick={loadInventoryData}
              disabled={!selectedStorage}
            >
              Inventaire
            </button>
          )}
          {hasPermission('inventory', 'create') && (
            <button
              className="btn-primary"
              onClick={openTransferModal}
              disabled={!selectedStorage || storageLocations.find(sl => sl.id === selectedStorage)?.code === 'CASSE'}
              style={{ background: '#10b981' }}
              title={storageLocations.find(sl => sl.id === selectedStorage)?.code === 'CASSE' ? 'Les mouvements de stock ne sont pas autorisés pour ce dépôt' : ''}
            >
              Mouvement de stock
            </button>
          )}
          {hasPermission('inventory', 'view_history') && (
            <button
              className="btn-primary"
              onClick={loadInventoryHistory}
              style={{ background: '#f59e0b' }}
            >
              Historique inventaires
            </button>
          )}
        </div>
      </div>

      <div className="filters">
        <div className="filter-group">
          <label>
            <input
              type="checkbox"
              checked={showOnlyIngredients}
              onChange={(e) => setShowOnlyIngredients(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Afficher uniquement les ingrédients
          </label>
        </div>
      </div>

      {!selectedStorage ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
          <p style={{ fontSize: '16px' }}>Veuillez sélectionner un dépôt de stockage pour afficher les stocks</p>
        </div>
      ) : (
        <div className="stocks-table">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('product_name')} style={{ cursor: 'pointer' }}>
                  Produit {sortField === 'product_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('reference')} style={{ cursor: 'pointer' }}>
                  Référence {sortField === 'reference' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('pos_name')} style={{ cursor: 'pointer' }}>
                  Point de vente {sortField === 'pos_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('storage_name')} style={{ cursor: 'pointer' }}>
                  Dépôt {sortField === 'storage_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
              <th onClick={() => handleSort('quantity')} style={{ cursor: 'pointer' }}>
                Quantité {sortField === 'quantity' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Unité</th>
              <th onClick={() => handleSort('last_inventory_date')} style={{ cursor: 'pointer' }}>
                Dernier inventaire {sortField === 'last_inventory_date' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stocks.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                  Aucun stock trouvé
                </td>
              </tr>
            ) : (
              stocks
                .map(stock => ({
                  ...stock,
                  product_name: stock.products?.name || '',
                  reference: stock.products?.reference || '',
                  pos_name: stock.sales_points?.name || '',
                  storage_name: stock.storage_locations?.name || ''
                }))
                .sort((a, b) => {
                  let aValue = a[sortField] || '';
                  let bValue = b[sortField] || '';

                  if (typeof aValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                  }

                  if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
                  if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
                  return 0;
                })
                .map((stock) => (
                <tr key={stock.id}>
                  <td>{stock.products?.name || '-'}</td>
                  <td>{stock.products?.reference || '-'}</td>
                  <td>{stock.sales_points?.name || '-'}</td>
                  <td>{stock.storage_locations?.name || '-'}</td>
                  <td className={`quantity ${getStockStatus(stock.quantity, stock.products?.min_stock_alert)}`}>
                    {parseFloat(stock.quantity).toFixed(2)}
                  </td>
                  <td>{stock.products?.unit || 'unité'}</td>
                  <td>{stock.last_inventory_date ? new Date(stock.last_inventory_date).toLocaleDateString('fr-FR') : '-'}</td>
                  <td>
                    <span className={`status-badge ${getStockStatus(stock.quantity, stock.products?.min_stock_alert)}`}>
                      {getStockStatus(stock.quantity, stock.products?.min_stock_alert) === 'negative' ? 'Négatif' :
                       getStockStatus(stock.quantity, stock.products?.min_stock_alert) === 'empty' ? 'Vide' :
                       getStockStatus(stock.quantity, stock.products?.min_stock_alert) === 'low' ? 'Faible' : 'OK'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-history"
                      onClick={() => loadStockHistory(stock.product_id, stock.storage_location_id)}
                      style={{ background: '#3b82f6' }}
                    >
                      Historique
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      {showInventoryModal && (
        <div className="modal-overlay" onClick={() => setShowInventoryModal(false)}>
          <div className="modal-content" style={{ maxWidth: '1000px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Saisie d'Inventaire - {storageLocations.find(s => s.id === selectedStorage)?.name}</h3>
              <button className="close-btn" onClick={() => setShowInventoryModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {!showInventoryResults ? (
                <>
                  <p style={{ marginBottom: '20px', color: '#6b7280' }}>
                    Saisissez les quantités comptées physiquement pour chaque produit.
                  </p>
                  <div className="history-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Produit</th>
                          <th>Référence</th>
                          <th>Quantité comptée</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryData.map((item, index) => (
                          <tr key={item.product_id || item.id}>
                            <td>{item.products?.name || '-'}</td>
                            <td>{item.products?.reference || '-'}</td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                value={item.countedQuantity}
                                onChange={(e) => {
                                  const newValue = parseFloat(e.target.value) || 0;
                                  const newData = [...inventoryData];
                                  newData[index].countedQuantity = newValue;
                                  newData[index].difference = newValue - item.currentQuantity;
                                  setInventoryData(newData);
                                }}
                                style={{ width: '120px', padding: '6px', textAlign: 'right' }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="modal-actions" style={{ marginTop: '20px' }}>
                    <button className="btn-secondary" onClick={() => setShowInventoryModal(false)}>
                      Annuler
                    </button>
                    <button className="btn-primary" onClick={() => setShowInventoryResults(true)}>
                      Calculer les écarts
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ marginBottom: '20px', color: '#6b7280', fontWeight: '500' }}>
                    Résultats de l'inventaire - Vérifiez les écarts avant validation
                  </p>
                  <div className="history-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Produit</th>
                          <th>Stock système</th>
                          <th>Quantité comptée</th>
                          <th>Écart</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryData.map((item) => (
                          <tr key={item.product_id || item.id}>
                            <td>{item.products?.name || '-'}</td>
                            <td>{item.currentQuantity.toFixed(2)}</td>
                            <td>{item.countedQuantity.toFixed(2)}</td>
                            <td className={item.difference < 0 ? 'negative' : item.difference > 0 ? 'positive' : ''}>
                              {item.difference > 0 ? '+' : ''}{item.difference.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="modal-actions" style={{ marginTop: '20px' }}>
                    <button className="btn-secondary" onClick={() => setShowInventoryResults(false)}>
                      Retour à la saisie
                    </button>
                    <button className="btn-primary" onClick={handleInventorySubmit}>
                      Valider l'inventaire
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Mouvement de Stock (Transfert inter-dépôts)</h3>
              <button className="close-btn" onClick={() => setShowTransferModal(false)}>×</button>
            </div>
            <form onSubmit={handleTransferSubmit}>
              <div className="form-group">
                <label>Dépôt source</label>
                <input
                  type="text"
                  value={storageLocations.find(sl => sl.id === transferData.from_storage_id)?.name || ''}
                  disabled
                  style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group">
                <label>Dépôt destination *</label>
                <select
                  value={transferData.to_storage_id}
                  onChange={(e) => {
                    const destId = e.target.value;
                    setTransferData({ ...transferData, to_storage_id: destId });
                    loadAvailableProductsForTransfer(destId);
                  }}
                  required
                  disabled={(() => {
                    const sourceStorage = storageLocations.find(sl => sl.id === transferData.from_storage_id);
                    return sourceStorage?.name !== 'Economat Général' && sourceStorage?.name !== 'Casse / Périmés';
                  })()}
                  style={(() => {
                    const sourceStorage = storageLocations.find(sl => sl.id === transferData.from_storage_id);
                    if (sourceStorage?.name !== 'Economat Général' && sourceStorage?.name !== 'Casse / Périmés') {
                      return { background: '#f3f4f6', cursor: 'not-allowed' };
                    }
                    return {};
                  })()}
                >
                  <option value="">Sélectionner le dépôt destination</option>
                  {(() => {
                    const sourceStorage = storageLocations.find(sl => sl.id === transferData.from_storage_id);
                    if (sourceStorage?.name === 'Economat Général') {
                      return storageLocations
                        .filter(sl => sl.id !== transferData.from_storage_id)
                        .map((sl) => (
                          <option key={sl.id} value={sl.id}>{sl.name}</option>
                        ));
                    } else {
                      return storageLocations
                        .filter(sl => sl.name === 'Casse / Périmés' && sl.id !== transferData.from_storage_id)
                        .map((sl) => (
                          <option key={sl.id} value={sl.id}>{sl.name}</option>
                        ));
                    }
                  })()}
                </select>
              </div>

              <div className="form-group">
                <label>Rechercher un produit</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Nom ou référence du produit..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
                {productSearch && !transferData.to_storage_id && (
                  <div style={{
                    padding: '12px',
                    marginTop: '8px',
                    background: '#FEF3C7',
                    border: '1px solid #F59E0B',
                    borderRadius: '6px',
                    color: '#92400E',
                    fontSize: '14px'
                  }}>
                    Veuillez d'abord sélectionner un dépôt de destination
                  </div>
                )}
                {productSearch && transferData.to_storage_id && (
                  <div style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    marginTop: '8px',
                    background: 'white'
                  }}>
                    {(() => {
                      const filteredProducts = availableProductsForTransfer
                        .filter(p =>
                          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                          (p.reference && p.reference.toLowerCase().includes(productSearch.toLowerCase()))
                        )
                        .slice(0, 10);

                      if (filteredProducts.length === 0) {
                        return (
                          <div style={{
                            padding: '12px',
                            color: '#6b7280',
                            fontSize: '14px',
                            textAlign: 'center'
                          }}>
                            Aucun produit trouvé. Vérifiez que le produit est configuré pour les deux dépôts.
                          </div>
                        );
                      }

                      return filteredProducts.map(product => (
                        <div
                          key={product.id}
                          onClick={() => addTransferItem(product.id)}
                          style={{
                            padding: '10px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #e5e7eb',
                            ':hover': { background: '#f3f4f6' }
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        >
                          <div style={{ fontWeight: '500' }}>{product.name}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            Réf: {product.reference || 'N/A'}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>

              {transferItems.length > 0 && (
                <div className="form-group">
                  <label>Produits à transférer</label>
                  <div className="history-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Produit</th>
                          <th>Référence</th>
                          <th>Quantité</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transferItems.map((item) => (
                          <tr key={item.id}>
                            <td>{item.product_name}</td>
                            <td>{item.product_reference || '-'}</td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                value={item.quantity}
                                onChange={(e) => updateTransferItemQuantity(item.id, e.target.value)}
                                style={{ width: '100px', padding: '6px', textAlign: 'right' }}
                                required
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => removeTransferItem(item.id)}
                                style={{
                                  background: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '13px'
                                }}
                              >
                                Retirer
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={transferData.notes}
                  onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                  rows="3"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowTransferModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  Effectuer les transferts ({transferItems.length})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHistory && selectedProductHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal-content history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Historique des mouvements de stock</h3>
              <button className="close-btn" onClick={() => setShowHistory(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="history-filters">
                <div className="filter-group">
                  <label>Date de début</label>
                  <input
                    type="date"
                    value={historyStartDate}
                    onChange={(e) => setHistoryStartDate(e.target.value)}
                  />
                </div>
                <div className="filter-group">
                  <label>Date de fin</label>
                  <input
                    type="date"
                    value={historyEndDate}
                    onChange={(e) => setHistoryEndDate(e.target.value)}
                  />
                </div>
                <div className="quick-filters" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    className="btn-quick-filter"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setHistoryStartDate(today);
                      setHistoryEndDate(today);
                      const stock = stocks.find(s =>
                        s.product_id === selectedProductHistory.productId &&
                        s.storage_location_id === selectedProductHistory.storageLocationId
                      );
                      if (stock) {
                        setTimeout(() => loadStockHistory(stock.product_id, stock.storage_location_id), 0);
                      }
                    }}
                    style={{ background: '#10b981', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }}
                  >
                    Aujourd'hui
                  </button>
                  <button
                    className="btn-quick-filter"
                    onClick={() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      const dateStr = yesterday.toISOString().split('T')[0];
                      setHistoryStartDate(dateStr);
                      setHistoryEndDate(dateStr);
                      const stock = stocks.find(s =>
                        s.product_id === selectedProductHistory.productId &&
                        s.storage_location_id === selectedProductHistory.storageLocationId
                      );
                      if (stock) {
                        setTimeout(() => loadStockHistory(stock.product_id, stock.storage_location_id), 0);
                      }
                    }}
                    style={{ background: '#3b82f6', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }}
                  >
                    J-1
                  </button>
                  <button
                    className="btn-quick-filter"
                    onClick={() => {
                      const twoDaysAgo = new Date();
                      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
                      const dateStr = twoDaysAgo.toISOString().split('T')[0];
                      setHistoryStartDate(dateStr);
                      setHistoryEndDate(dateStr);
                      const stock = stocks.find(s =>
                        s.product_id === selectedProductHistory.productId &&
                        s.storage_location_id === selectedProductHistory.storageLocationId
                      );
                      if (stock) {
                        setTimeout(() => loadStockHistory(stock.product_id, stock.storage_location_id), 0);
                      }
                    }}
                    style={{ background: '#3b82f6', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }}
                  >
                    J-2
                  </button>
                  <button
                    className="btn-quick-filter"
                    onClick={() => {
                      const today = new Date();
                      const sevenDaysAgo = new Date();
                      sevenDaysAgo.setDate(today.getDate() - 7);
                      setHistoryStartDate(sevenDaysAgo.toISOString().split('T')[0]);
                      setHistoryEndDate(today.toISOString().split('T')[0]);
                      const stock = stocks.find(s =>
                        s.product_id === selectedProductHistory.productId &&
                        s.storage_location_id === selectedProductHistory.storageLocationId
                      );
                      if (stock) {
                        setTimeout(() => loadStockHistory(stock.product_id, stock.storage_location_id), 0);
                      }
                    }}
                    style={{ background: '#8b5cf6', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }}
                  >
                    7 derniers jours
                  </button>
                  <button
                    className="btn-quick-filter"
                    onClick={() => {
                      const today = new Date();
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(today.getDate() - 30);
                      setHistoryStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
                      setHistoryEndDate(today.toISOString().split('T')[0]);
                      const stock = stocks.find(s =>
                        s.product_id === selectedProductHistory.productId &&
                        s.storage_location_id === selectedProductHistory.storageLocationId
                      );
                      if (stock) {
                        setTimeout(() => loadStockHistory(stock.product_id, stock.storage_location_id), 0);
                      }
                    }}
                    style={{ background: '#8b5cf6', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }}
                  >
                    30 derniers jours
                  </button>
                </div>
                <button
                  className="btn-filter"
                  onClick={() => {
                    const stock = stocks.find(s =>
                      s.product_id === selectedProductHistory.productId &&
                      s.storage_location_id === selectedProductHistory.storageLocationId
                    );
                    if (stock) {
                      loadStockHistory(stock.product_id, stock.storage_location_id);
                    }
                  }}
                >
                  Rechercher
                </button>
              </div>

              {stockMovements.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  Aucun mouvement de stock pour cette période
                </p>
              ) : (
                <div className="history-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Point de vente</th>
                        <th>Quantité</th>
                        <th>Stock avant</th>
                        <th>Stock après</th>
                        <th>Référence</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockMovements.map((movement) => {
                        const typeLabels = {
                          'sale': 'Vente',
                          'restock': 'Réappro',
                          'inventory_adjustment': 'Inventaire',
                          'transfer': 'Transfert',
                          'breakage': 'Casse/Déchet'
                        };
                        return (
                          <tr key={movement.id}>
                            <td>{new Date(movement.created_at).toLocaleString('fr-FR')}</td>
                            <td>
                              <span className={`movement-type ${movement.movement_type}`}>
                                {typeLabels[movement.movement_type] || movement.movement_type}
                              </span>
                            </td>
                            <td>{movement.sales_points?.name || '-'}</td>
                            <td className={parseFloat(movement.quantity) < 0 ? 'negative' : 'positive'}>
                              {parseFloat(movement.quantity) > 0 ? '+' : ''}{parseFloat(movement.quantity).toFixed(2)}
                            </td>
                            <td>{parseFloat(movement.previous_quantity).toFixed(2)}</td>
                            <td>{parseFloat(movement.new_quantity).toFixed(2)}</td>
                            <td>{movement.reference || '-'}</td>
                            <td>{movement.notes || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showInventoryHistory && (
        <div className="modal-overlay" onClick={() => setShowInventoryHistory(false)}>
          <div className="modal-content" style={{ maxWidth: '1200px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Historique des Inventaires</h3>
              <button className="close-btn" onClick={() => setShowInventoryHistory(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="history-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Dépôt</th>
                      <th>Statut</th>
                      <th>Articles</th>
                      <th>Écarts</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryHistoryList.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                          Aucun inventaire trouvé
                        </td>
                      </tr>
                    ) : (
                      inventoryHistoryList.map((inventory) => (
                        <tr key={inventory.id}>
                          <td>{new Date(inventory.inventory_date).toLocaleString('fr-FR')}</td>
                          <td>{inventory.storage_locations?.name || '-'}</td>
                          <td>
                            <span className={`status-badge ${inventory.status === 'validated' ? 'ok' : 'low'}`}>
                              {inventory.status === 'validated' ? 'Validé' :
                               inventory.status === 'draft' ? 'Brouillon' : 'Annulé'}
                            </span>
                          </td>
                          <td>{inventory.total_items}</td>
                          <td>
                            <span className={inventory.total_discrepancies > 0 ? 'negative' : ''}>
                              {inventory.total_discrepancies}
                            </span>
                          </td>
                          <td>{inventory.notes || '-'}</td>
                          <td>
                            <button
                              className="btn-history"
                              onClick={() => loadInventoryDetails(inventory.id)}
                              style={{ background: '#3b82f6' }}
                            >
                              Détails
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {selectedInventoryDetails && (
                <div style={{ marginTop: '30px', borderTop: '2px solid #e5e7eb', paddingTop: '20px' }}>
                  <h4 style={{ marginBottom: '15px' }}>Détails de l'inventaire</h4>
                  <div className="history-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Produit</th>
                          <th>Référence</th>
                          <th>Quantité attendue</th>
                          <th>Quantité comptée</th>
                          <th>Écart</th>
                          <th>Unité</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInventoryDetails.map((line) => (
                          <tr key={line.id}>
                            <td>{line.products?.name || '-'}</td>
                            <td>{line.products?.reference || '-'}</td>
                            <td>{parseFloat(line.expected_quantity).toFixed(2)}</td>
                            <td>{parseFloat(line.counted_quantity).toFixed(2)}</td>
                            <td className={parseFloat(line.difference) < 0 ? 'negative' : parseFloat(line.difference) > 0 ? 'positive' : ''}>
                              {parseFloat(line.difference) > 0 ? '+' : ''}{parseFloat(line.difference).toFixed(2)}
                            </td>
                            <td>{line.products?.unit || 'unité'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => setSelectedInventoryDetails(null)}
                    style={{ marginTop: '15px' }}
                  >
                    Fermer les détails
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
