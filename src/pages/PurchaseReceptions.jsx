import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './PurchaseReceptions.css';

export default function PurchaseReceptions() {
  const [receptions, setReceptions] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [storageLocations, setStorageLocations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [receptionMode, setReceptionMode] = useState('with_order'); // 'with_order' ou 'direct'

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [formData, setFormData] = useState({
    purchase_order_id: '',
    supplier_id: '',
    reception_date: new Date().toISOString().split('T')[0],
    storage_location_id: '',
    notes: ''
  });

  const [receptionLines, setReceptionLines] = useState([]);

  useEffect(() => {
    loadData();
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (receptionMode === 'direct') {
      loadSuppliers();
      loadProducts();
    }
  }, [receptionMode]);

  async function loadCurrentUser() {
    try {
      const userStr = localStorage.getItem('erp_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      } else {
        console.error('Aucun utilisateur trouvé dans localStorage');
      }
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
    }
  }

  async function loadData() {
    setLoading(true);
    await Promise.all([
      loadReceptions(),
      loadPendingOrders(),
      loadStorageLocations()
    ]);
    setLoading(false);
  }

  async function loadReceptions() {
    try {
      const { data, error } = await supabase
        .from('purchase_receptions')
        .select(`
          *,
          purchase_order:purchase_orders(
            order_number,
            supplier:suppliers(name)
          ),
          storage_location:storage_locations(name),
          employee:employees(full_name),
          lines:purchase_reception_lines(
            *,
            product:products(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReceptions(data || []);
    } catch (error) {
      console.error('Erreur chargement réceptions:', error);
    }
  }

  async function loadPendingOrders() {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(name),
          destination:storage_locations(name),
          lines:purchase_order_lines(
            *,
            product:products(name, unit)
          )
        `)
        .in('status', ['sent', 'partially_received'])
        .order('order_date', { ascending: false });

      if (error) throw error;
      setPendingOrders(data || []);
    } catch (error) {
      console.error('Erreur chargement commandes:', error);
    }
  }

  async function loadStorageLocations() {
    try {
      const { data, error } = await supabase
        .from('storage_locations')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStorageLocations(data || []);

      // Auto-sélectionner Economat Général
      const economat = data?.find(loc => loc.name === 'Economat Général');
      if (economat) {
        setFormData(prev => ({ ...prev, storage_location_id: economat.id }));
      }
    } catch (error) {
      console.error('Erreur chargement dépôts:', error);
    }
  }

  async function loadSuppliers() {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Erreur chargement fournisseurs:', error);
    }
  }

  async function loadProducts() {
    try {
      // Récupérer l'ID du type "Matières Premières"
      const { data: productTypes } = await supabase
        .from('product_types')
        .select('id')
        .eq('code', 'RAW_MATERIAL')
        .single();

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('product_type_id', productTypes?.id)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
    }
  }

  function handleOrderSelect(e) {
    const orderId = e.target.value;
    const order = pendingOrders.find(o => o.id === orderId);

    if (!order) {
      setSelectedOrder(null);
      setReceptionLines([]);
      setFormData(prev => ({
        ...prev,
        purchase_order_id: '',
        storage_location_id: ''
      }));
      return;
    }

    setSelectedOrder(order);
    setFormData(prev => ({
      ...prev,
      purchase_order_id: orderId,
      storage_location_id: order.destination_location_id || ''
    }));

    const lines = order.lines.map((line, index) => ({
      purchase_order_line_id: line.id,
      product_id: line.product_id,
      product_name: line.product.name,
      product_unit: line.product.unit,
      quantity_ordered: parseFloat(line.quantity_ordered),
      quantity_already_received: parseFloat(line.quantity_received),
      quantity_remaining: parseFloat(line.quantity_ordered) - parseFloat(line.quantity_received),
      quantity_received: '',
      quantity_accepted: '',
      quantity_rejected: '0',
      rejection_reason: '',
      expiry_date: '',
      batch_number: '',
      notes: '',
      temp_id: index
    }));

    setReceptionLines(lines);
  }

  function addProductToReception(productId) {
    if (!productId) return;

    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Vérifier si le produit n'est pas déjà dans la liste
    const alreadyExists = receptionLines.some(line => line.product_id === productId);
    if (alreadyExists) {
      alert('Ce produit est déjà dans la liste');
      return;
    }

    const newLine = {
      product_id: product.id,
      product_name: product.name,
      product_unit: product.unit,
      quantity_received: '',
      quantity_accepted: '',
      quantity_rejected: '0',
      rejection_reason: '',
      expiry_date: '',
      batch_number: '',
      notes: '',
      temp_id: Date.now()
    };

    setReceptionLines(prev => [...prev, newLine]);
    setProductSearchTerm(''); // Réinitialiser la recherche
  }

  function removeDirectReceptionLine(tempId) {
    setReceptionLines(prev => prev.filter(line => line.temp_id !== tempId));
  }

  function handleDirectLineChange(tempId, field, value) {
    setReceptionLines(prev => prev.map(line => {
      if (line.temp_id !== tempId) return line;

      const updated = { ...line, [field]: value };

      if (field === 'product_id') {
        const product = products.find(p => p.id === value);
        if (product) {
          updated.product_name = product.name;
          updated.product_unit = product.unit;
        }
      }

      if (field === 'quantity_received') {
        const received = parseFloat(value) || 0;
        updated.quantity_accepted = received.toString();
        updated.quantity_rejected = '0';
      }

      if (field === 'quantity_accepted' || field === 'quantity_rejected') {
        const accepted = parseFloat(field === 'quantity_accepted' ? value : updated.quantity_accepted) || 0;
        const rejected = parseFloat(field === 'quantity_rejected' ? value : updated.quantity_rejected) || 0;
        updated.quantity_received = (accepted + rejected).toString();
      }

      return updated;
    }));
  }

  function handleLineChange(tempId, field, value) {
    setReceptionLines(prev => prev.map(line => {
      if (line.temp_id !== tempId) return line;

      const updated = { ...line, [field]: value };

      if (field === 'quantity_received') {
        const received = parseFloat(value) || 0;
        updated.quantity_accepted = received.toString();
        updated.quantity_rejected = '0';
      }

      if (field === 'quantity_accepted' || field === 'quantity_rejected') {
        const accepted = parseFloat(updated.quantity_accepted) || 0;
        const rejected = parseFloat(updated.quantity_rejected) || 0;
        updated.quantity_received = (accepted + rejected).toString();
      }

      return updated;
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!formData.storage_location_id) {
      alert('Veuillez sélectionner un dépôt');
      return;
    }

    if (receptionMode === 'with_order' && !formData.purchase_order_id) {
      alert('Veuillez sélectionner une commande');
      return;
    }

    if (receptionMode === 'direct' && !formData.supplier_id) {
      alert('Veuillez sélectionner un fournisseur');
      return;
    }

    if (!currentUser) {
      alert('Utilisateur non connecté');
      return;
    }

    const linesToReceive = receptionLines.filter(line =>
      parseFloat(line.quantity_received || 0) > 0
    );

    if (linesToReceive.length === 0) {
      alert('Veuillez saisir au moins une quantité reçue');
      return;
    }

    if (receptionMode === 'direct') {
      for (const line of linesToReceive) {
        if (!line.product_id) {
          alert('Veuillez sélectionner un produit pour toutes les lignes');
          return;
        }
      }
    }

    for (const line of linesToReceive) {
      const received = parseFloat(line.quantity_received);
      const accepted = parseFloat(line.quantity_accepted);
      const rejected = parseFloat(line.quantity_rejected);

      if (received !== accepted + rejected) {
        alert(`Erreur ligne "${line.product_name}": Reçu doit égaler Accepté + Rejeté`);
        return;
      }

      if (rejected > 0 && !line.rejection_reason.trim()) {
        alert(`Veuillez indiquer la raison du rejet pour "${line.product_name}"`);
        return;
      }
    }

    try {
      const { data: numberData, error: numberError } = await supabase
        .rpc('generate_next_reception_number');

      if (numberError) throw numberError;

      const receptionInsert = {
        reception_number: numberData,
        reception_date: formData.reception_date,
        storage_location_id: formData.storage_location_id,
        notes: formData.notes,
        received_by: currentUser.id
      };

      if (receptionMode === 'with_order') {
        receptionInsert.purchase_order_id = formData.purchase_order_id;
      } else {
        receptionInsert.supplier_id = formData.supplier_id;
      }

      const { data: receptionData, error: receptionError } = await supabase
        .from('purchase_receptions')
        .insert([receptionInsert])
        .select()
        .single();

      if (receptionError) throw receptionError;

      const linesToInsert = linesToReceive.map(line => ({
        reception_id: receptionData.id,
        purchase_order_line_id: line.purchase_order_line_id || null,
        product_id: line.product_id,
        quantity_received: parseFloat(line.quantity_received),
        quantity_accepted: parseFloat(line.quantity_accepted),
        quantity_rejected: parseFloat(line.quantity_rejected),
        rejection_reason: line.rejection_reason,
        expiry_date: line.expiry_date || null,
        batch_number: line.batch_number,
        notes: line.notes
      }));

      const { error: linesError } = await supabase
        .from('purchase_reception_lines')
        .insert(linesToInsert);

      if (linesError) throw linesError;

      alert('Réception créée avec succès: ' + numberData);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Erreur sauvegarde réception:', error);
      alert('Erreur: ' + error.message);
    }
  }

  async function validateReception(receptionId) {
    if (!confirm('Valider définitivement cette réception ?')) return;

    try {
      const { error } = await supabase
        .from('purchase_receptions')
        .update({
          status: 'validated',
          updated_at: new Date().toISOString()
        })
        .eq('id', receptionId);

      if (error) throw error;
      alert('Réception validée');
      loadData();
    } catch (error) {
      console.error('Erreur validation:', error);
      alert('Erreur: ' + error.message);
    }
  }

  async function cancelReception(receptionId) {
    if (!confirm('Annuler cette réception ?')) return;

    try {
      const { error } = await supabase
        .from('purchase_receptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', receptionId);

      if (error) throw error;
      alert('Réception annulée');
      loadData();
    } catch (error) {
      console.error('Erreur annulation:', error);
      alert('Erreur: ' + error.message);
    }
  }

  function resetForm() {
    setFormData({
      purchase_order_id: '',
      supplier_id: '',
      reception_date: new Date().toISOString().split('T')[0],
      storage_location_id: '',
      notes: ''
    });
    setSelectedOrder(null);
    setReceptionLines([]);
    setShowForm(false);
    setReceptionMode('with_order');
  }

  function getStatusLabel(status) {
    const labels = {
      pending: 'En attente',
      validated: 'Validée',
      cancelled: 'Annulée'
    };
    return labels[status] || status;
  }

  function getStatusClass(status) {
    const classes = {
      pending: 'pending',
      validated: 'validated',
      cancelled: 'cancelled'
    };
    return classes[status] || '';
  }

  const filteredReceptions = receptions.filter(r =>
    r.reception_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.purchase_order?.order_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.purchase_order?.supplier?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="purchase-receptions-page">
      <div className="page-header">
        <h1>Réception de Commandes</h1>
        <button
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Annuler' : '+ Nouvelle Réception'}
        </button>
      </div>

      {showForm && (
        <div className="reception-form-container">
          <h2>Nouvelle réception</h2>
          <form onSubmit={handleSubmit} className="reception-form">
            <div className="form-section">
              <h3>Informations générales</h3>

              <div className="form-group">
                <label>Type de réception *</label>
                <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="receptionMode"
                      value="with_order"
                      checked={receptionMode === 'with_order'}
                      onChange={(e) => {
                        setReceptionMode(e.target.value);
                        setReceptionLines([]);
                        setSelectedOrder(null);
                      }}
                    />
                    Avec bon de commande
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="receptionMode"
                      value="direct"
                      checked={receptionMode === 'direct'}
                      onChange={(e) => {
                        setReceptionMode(e.target.value);
                        setReceptionLines([]);
                        setFormData(prev => ({ ...prev, purchase_order_id: '' }));
                      }}
                    />
                    Réception directe (sans bon de commande)
                  </label>
                </div>
              </div>

              <div className="form-row">
                {receptionMode === 'with_order' ? (
                  <div className="form-group">
                    <label>Commande à réceptionner *</label>
                    <select
                      value={formData.purchase_order_id}
                      onChange={handleOrderSelect}
                      required
                    >
                      <option value="">Sélectionner une commande</option>
                      {pendingOrders.map(order => (
                        <option key={order.id} value={order.id}>
                          {order.order_number} - {order.supplier?.name} ({order.status === 'sent' ? 'Non reçue' : 'Partiellement reçue'})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Fournisseur *</label>
                    <select
                      value={formData.supplier_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplier_id: e.target.value }))}
                      required
                    >
                      <option value="">Sélectionner un fournisseur</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Date de réception *</label>
                  <input
                    type="date"
                    value={formData.reception_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, reception_date: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Dépôt de réception *</label>
                  <select
                    value={formData.storage_location_id}
                    disabled
                    required
                    style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
                  >
                    {storageLocations
                      .filter(loc => loc.name === 'Economat Général')
                      .map(loc => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                  </select>
                  <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Toutes les réceptions arrivent à l'Economat Général
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows="2"
                  placeholder="Notes sur la réception"
                />
              </div>
            </div>

            {receptionMode === 'direct' && (
              <div className="form-section">
                <h3>Produits à réceptionner</h3>

                <div style={{ marginBottom: '20px', position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="🔍 Rechercher un produit (Matières Premières uniquement)..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      fontSize: '15px',
                      border: '2px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box'
                    }}
                  />

                  {productSearchTerm && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '1px solid #ddd',
                      borderTop: 'none',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                      {products
                        .filter(product =>
                          product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                          product.code?.toLowerCase().includes(productSearchTerm.toLowerCase())
                        )
                        .slice(0, 20)
                        .map(product => (
                          <div
                            key={product.id}
                            onClick={() => addProductToReception(product.id)}
                            style={{
                              padding: '10px 15px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f0f0f0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          >
                            <span style={{ fontWeight: '500' }}>{product.name}</span>
                            <span style={{ color: '#666', fontSize: '13px' }}>({product.unit})</span>
                          </div>
                        ))}
                      {products.filter(product =>
                        product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                        product.code?.toLowerCase().includes(productSearchTerm.toLowerCase())
                      ).length === 0 && (
                        <div style={{ padding: '15px', textAlign: 'center', color: '#999' }}>
                          Aucun produit trouvé
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {receptionLines.length > 0 && (
                  <div className="reception-lines-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Produit</th>
                          <th>Reçu</th>
                          <th>Accepté</th>
                          <th>Rejeté</th>
                          <th>Motif rejet</th>
                          <th>N° Lot</th>
                          <th>Péremption</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receptionLines.map(line => (
                          <tr key={line.temp_id}>
                            <td className="product-name">
                              <strong>{line.product_name}</strong>
                              <div className="product-unit" style={{ fontSize: '12px', color: '#666' }}>
                                ({line.product_unit})
                              </div>
                            </td>
                            <td>
                              <input
                                type="number"
                                value={line.quantity_received}
                                onChange={(e) => handleDirectLineChange(line.temp_id, 'quantity_received', e.target.value)}
                                step="0.001"
                                min="0"
                                placeholder="0"
                                className="input-qty"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={line.quantity_accepted}
                                onChange={(e) => handleDirectLineChange(line.temp_id, 'quantity_accepted', e.target.value)}
                                step="0.001"
                                min="0"
                                placeholder="0"
                                className="input-qty accepted"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={line.quantity_rejected}
                                onChange={(e) => handleDirectLineChange(line.temp_id, 'quantity_rejected', e.target.value)}
                                step="0.001"
                                min="0"
                                placeholder="0"
                                className="input-qty rejected"
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={line.rejection_reason}
                                onChange={(e) => handleDirectLineChange(line.temp_id, 'rejection_reason', e.target.value)}
                                placeholder="Si rejet..."
                                className="input-text"
                                disabled={parseFloat(line.quantity_rejected || 0) === 0}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={line.batch_number}
                                onChange={(e) => handleDirectLineChange(line.temp_id, 'batch_number', e.target.value)}
                                placeholder="Lot"
                                className="input-text"
                              />
                            </td>
                            <td>
                              <input
                                type="date"
                                value={line.expiry_date}
                                onChange={(e) => handleDirectLineChange(line.temp_id, 'expiry_date', e.target.value)}
                                className="input-date"
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => removeDirectReceptionLine(line.temp_id)}
                                style={{ padding: '4px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                              >
                                Suppr.
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {receptionMode === 'with_order' && selectedOrder && receptionLines.length > 0 && (
              <div className="form-section">
                <h3>Produits à réceptionner</h3>
                <div className="reception-lines-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Produit</th>
                        <th>Commandé</th>
                        <th>Déjà reçu</th>
                        <th>Restant</th>
                        <th>Reçu</th>
                        <th>Accepté</th>
                        <th>Rejeté</th>
                        <th>Motif rejet</th>
                        <th>N° Lot</th>
                        <th>Péremption</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receptionLines.map(line => (
                        <tr key={line.temp_id}>
                          <td className="product-name">
                            {line.product_name}
                            <div className="product-unit">({line.product_unit})</div>
                          </td>
                          <td className="qty">{line.quantity_ordered}</td>
                          <td className="qty received">{line.quantity_already_received}</td>
                          <td className="qty remaining">{line.quantity_remaining}</td>
                          <td>
                            <input
                              type="number"
                              value={line.quantity_received}
                              onChange={(e) => handleLineChange(line.temp_id, 'quantity_received', e.target.value)}
                              step="0.001"
                              min="0"
                              max={line.quantity_remaining}
                              placeholder="0"
                              className="input-qty"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={line.quantity_accepted}
                              onChange={(e) => handleLineChange(line.temp_id, 'quantity_accepted', e.target.value)}
                              step="0.001"
                              min="0"
                              placeholder="0"
                              className="input-qty accepted"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={line.quantity_rejected}
                              onChange={(e) => handleLineChange(line.temp_id, 'quantity_rejected', e.target.value)}
                              step="0.001"
                              min="0"
                              placeholder="0"
                              className="input-qty rejected"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={line.rejection_reason}
                              onChange={(e) => handleLineChange(line.temp_id, 'rejection_reason', e.target.value)}
                              placeholder="Si rejet..."
                              className="input-text"
                              disabled={parseFloat(line.quantity_rejected || 0) === 0}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={line.batch_number}
                              onChange={(e) => handleLineChange(line.temp_id, 'batch_number', e.target.value)}
                              placeholder="Lot"
                              className="input-text"
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              value={line.expiry_date}
                              onChange={(e) => handleLineChange(line.temp_id, 'expiry_date', e.target.value)}
                              className="input-date"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="form-actions">
              <button type="button" onClick={resetForm} className="btn-secondary">
                Annuler
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={
                  (receptionMode === 'with_order' && !selectedOrder) ||
                  receptionLines.filter(l => parseFloat(l.quantity_received || 0) > 0).length === 0 ||
                  !formData.supplier_id ||
                  !formData.storage_location_id
                }
              >
                Créer la réception
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="receptions-list-container">
        <div className="list-header">
          <input
            type="text"
            placeholder="Rechercher par numéro, commande ou fournisseur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="count-badge">{filteredReceptions.length} réception(s)</span>
        </div>

        {loading ? (
          <div className="loading">Chargement...</div>
        ) : (
          <div className="receptions-grid">
            {filteredReceptions.map(reception => (
              <div key={reception.id} className="reception-card">
                <div className="card-header">
                  <div>
                    <div className="reception-number">{reception.reception_number}</div>
                    <div className="order-ref">Commande: {reception.purchase_order?.order_number}</div>
                    <div className="supplier-name">{reception.purchase_order?.supplier?.name}</div>
                  </div>
                  <span className={`status-badge ${getStatusClass(reception.status)}`}>
                    {getStatusLabel(reception.status)}
                  </span>
                </div>

                <div className="card-body">
                  <div className="info-row">
                    <span className="label">Date:</span>
                    <span>{new Date(reception.reception_date).toLocaleDateString()}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Dépôt:</span>
                    <span>{reception.storage_location?.name}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Réceptionné par:</span>
                    <span>{reception.employee?.full_name || '-'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Produits:</span>
                    <span>{reception.lines?.length || 0} ligne(s)</span>
                  </div>
                  {reception.lines && reception.lines.some(l => l.quantity_rejected > 0) && (
                    <div className="info-row warning">
                      <span className="label">⚠️ Rejets:</span>
                      <span>{reception.lines.filter(l => l.quantity_rejected > 0).length} produit(s)</span>
                    </div>
                  )}
                </div>

                <div className="card-actions">
                  {reception.status === 'pending' && (
                    <>
                      <button
                        onClick={() => validateReception(reception.id)}
                        className="btn-action validate"
                      >
                        Valider
                      </button>
                      <button
                        onClick={() => cancelReception(reception.id)}
                        className="btn-action cancel"
                      >
                        Annuler
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {filteredReceptions.length === 0 && (
              <div className="empty-state">
                {searchTerm ? 'Aucune réception trouvée' : 'Aucune réception créée'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
